import {
  createGame,
  type GameEvent,
  type GameState,
  type Input,
} from "../game/sim.ts";
import { play, unlock } from "./audio.ts";
import {
  type Command,
  interpolate,
  isCommand,
  isSnapshot,
  object,
  playerName,
  type Snapshot,
} from "./protocol.ts";
import type { Session } from "./session.ts";
import { loadName, saveName } from "./storage.ts";

const API = "/api/multiplayer/rooms";
const TOKEN = /^[a-f0-9]{32}$/;
export interface OnlineView {
  role: "host" | "guest";
  status: "connecting" | "connected" | "reconnecting" | "closed";
  /** Why the room closed. */
  error: string;
  link: string;
  /** Your display name, as you last chose it. */
  name: string;
  /** Who is connected to each seat (host = left miner), by display name. */
  players: [string | null, string | null];
  /** The partner's last known name, so a disconnect can still say who. */
  partner: string;
  /** Connected, but the partner has stopped answering. */
  stalled: boolean;
  lobby: boolean;
  /** A short-lived announcement; a new `id` shows it again. */
  notice: { id: number; text: string } | null;
}
/** The host plays the left miner (seat 0), the guest the right one. */
export const mySeat = (view: OnlineView): 0 | 1 => view.role === "host" ? 0 : 1;
/** The partner's name while they are connected, otherwise null. */
export const partnerOf = (view: OnlineView): string | null =>
  view.players[mySeat(view) === 0 ? 1 : 0];
export interface OnlineDriver {
  view: OnlineView;
  input(input: Input): void;
  pause(paused: boolean): void;
  start(): void;
  rename(name: string): void;
  leave(): void;
  canStep(): boolean;
  afterTick(): void;
  render(): GameState;
}
export function invitation(): string | null {
  return new URLSearchParams(location.hash.slice(1)).get("room");
}
export function clearInvitation() {
  history.replaceState(null, "", location.pathname + location.search);
}
const newToken = () => crypto.randomUUID().replaceAll("-", "");

export class OnlineSession implements OnlineDriver {
  view: OnlineView;
  private socket: WebSocket | null = null;
  private room = "";
  private credential = "";
  private seq = 0;
  private receivedSeq = -1;
  private round = 0;
  private guestHidden = false;
  private metPartner = false;
  private events: GameEvent[] = [];
  private previous: GameState | null = null;
  private receivedAt = 0;
  private lastSnapshot = 0;
  private lastPong = 0;
  private lastPeer = 0;
  private reconnectUntil = 0;
  private retryAt = 0;
  private disposed = false;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly abort = new AbortController();
  private readonly visibility = () => {
    this.dispatch({ kind: "visibility", hidden: document.hidden });
  };

  constructor(
    private readonly session: Session,
    role: "host" | "guest",
    room?: string,
  ) {
    this.view = {
      role,
      status: "connecting",
      error: "",
      link: "",
      name: loadName(),
      players: [null, null],
      partner: "",
      stalled: false,
      lobby: true,
      notice: null,
    };
    session.online = this;
    session.game = createGame(crypto.getRandomValues(new Uint32Array(1))[0], 2);
    session.mode = "title";
    session.queued = [];
    session.newBest = false;
    this.timer = setInterval(() => this.maintain(), 1000);
    document.addEventListener("visibilitychange", this.visibility);
    this.initialize(room);
  }
  private async initialize(room?: string) {
    try {
      if (this.view.role === "host") {
        const response = await fetch(API, {
          method: "POST",
          signal: this.abort.signal,
        });
        if (!response.ok) {
          throw new Error(
            "Online rooms are unavailable. Try the deployed site, or play solo.",
          );
        }
        const data: unknown = await response.json();
        if (
          !object(data) || typeof data.room !== "string" ||
          !TOKEN.test(data.room) || typeof data.hostToken !== "string" ||
          !TOKEN.test(data.hostToken)
        ) throw new Error("Could not create the room.");
        this.room = data.room;
        this.credential = data.hostToken;
      } else {
        if (!room || !TOKEN.test(room)) {
          throw new Error("This invitation is invalid.");
        }
        this.room = room;
        this.credential = newToken();
      }
      if (this.disposed) return;
      const link = new URL(location.href);
      link.hash = new URLSearchParams({ room: this.room }).toString();
      this.view.link = link.href;
      this.reconnectUntil = Date.now() + 30_000;
      this.connect();
    } catch (error) {
      if (!this.disposed) {
        this.fail(
          error instanceof Error ? error.message : "Could not connect.",
        );
      }
    }
  }
  private connect() {
    if (this.disposed) return;
    const url = new URL(`${API}/${this.room}`, location.origin);
    url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(url);
    this.socket = ws;
    this.lastPong = Date.now();
    ws.addEventListener("open", () => {
      if (this.socket !== ws || this.disposed) {
        ws.close();
        return;
      }
      this.send({
        type: "join",
        version: 2,
        role: this.view.role,
        token: this.credential,
        name: this.view.name,
      });
    });
    ws.addEventListener("message", (event) => {
      if (this.socket !== ws || this.disposed) return;
      try {
        this.receive(JSON.parse(event.data));
      } catch {
        this.fail("The room sent invalid data. Please create a new room.");
      }
    });
    ws.addEventListener("close", () => {
      if (this.socket !== ws || this.disposed) return;
      this.connectionLost();
    });
    ws.addEventListener("error", () => ws.close());
  }
  private receive(message: unknown) {
    if (!object(message)) return;
    if (message.type === "error") {
      this.fail(
        typeof message.message === "string" ? message.message : "Room closed",
      );
    } else if (message.type === "joined") {
      this.view.status = "connected";
      this.receivedSeq = -1;
      this.lastPong = Date.now();
    } else if (message.type === "presence") {
      this.presence(message.host, message.guest);
    } else if (message.type === "pong") {
      this.lastPong = Date.now();
    } else if (message.type === "heartbeat") {
      this.lastPeer = Date.now();
      this.view.stalled = false;
    } else if (
      typeof message.seq === "number" && message.seq > this.receivedSeq
    ) {
      if (
        this.view.role === "host" && message.type === "command" &&
        object(message.payload) && isCommand(message.payload.command) &&
        (message.payload.round === this.round ||
          message.payload.command.kind === "visibility")
      ) {
        this.receivedSeq = message.seq;
        this.command(message.payload.command, 1);
      } else if (
        this.view.role === "guest" && message.type === "snapshot" &&
        isSnapshot(message.payload)
      ) {
        this.receivedSeq = message.seq;
        const payload = message.payload;
        this.previous = this.round === payload.round ? this.session.game : null;
        this.receivedAt = performance.now();
        this.lastSnapshot = Date.now();
        this.round = payload.round;
        this.session.game = payload.game;
        this.session.mode = payload.lobby ? "title" : "game";
        this.session.paused = payload.paused;
        this.view.lobby = payload.lobby;
        for (const event of payload.game.events) play(event.type);
      }
    }
  }
  private get peer(): boolean {
    return partnerOf(this.view) !== null;
  }
  private presence(host: unknown, guest: unknown) {
    const before = partnerOf(this.view);
    this.view.players = [playerName(host), playerName(guest)];
    const after = partnerOf(this.view);
    this.lastPeer = Date.now();
    this.view.stalled = false;
    this.session.queued = [];
    if (!this.view.lobby) this.session.paused = true;
    if (after && !before) {
      if (this.metPartner) this.notify(`${after} is back`);
      else {
        this.notify(
          this.view.role === "host"
            ? `${after} joined!`
            : `You joined ${after}'s game`,
        );
      }
      this.metPartner = true;
      play("bonus");
    } else if (before && !after) {
      this.notify(`${before} disconnected`);
    }
    if (after) this.view.partner = after;
    this.snapshot();
  }
  private notify(text: string) {
    this.view.notice = { id: (this.view.notice?.id ?? 0) + 1, text };
  }
  input(input: Input) {
    this.dispatch({
      kind: "input",
      input,
      level: this.session.game.level,
      phase: this.session.game.phase,
    });
  }
  pause(paused: boolean) {
    if (paused) {
      this.session.paused = true;
      this.session.queued = [];
    }
    this.dispatch({ kind: "pause", paused });
  }
  start() {
    unlock();
    this.dispatch({ kind: "start" });
  }
  rename(value: string) {
    const name = playerName(value);
    if (!name || name === this.view.name) return;
    this.view.name = name;
    saveName(name);
    if (this.view.status !== "connected") return;
    this.view.players[mySeat(this.view)] = name;
    this.send({ type: "name", name });
  }
  private dispatch(command: Command) {
    if (this.view.status !== "connected" || !this.peer) return;
    if (this.view.role === "host") this.command(command, 0);
    else {this.send({
        type: "command",
        seq: ++this.seq,
        payload: { round: this.round, command },
      });}
  }
  private command(command: Command, player: 0 | 1) {
    if (!this.peer) return;
    const s = this.session;
    // Either player can start; the other is already looking at the same screen.
    if (command.kind === "start") {
      if (!this.view.lobby && s.game.phase !== "gameOver") return;
      s.game = createGame(crypto.getRandomValues(new Uint32Array(1))[0], 2);
      s.mode = "game";
      s.paused = document.hidden || this.guestHidden;
      s.queued = [];
      this.events = [];
      this.view.lobby = false;
      this.round++;
    } else if (command.kind === "visibility") {
      if (player === 1) this.guestHidden = command.hidden;
      if (command.hidden) {
        s.paused = true;
        s.queued = [];
      }
    } else if (command.kind === "pause") {
      if (
        !command.paused &&
        (document.hidden || this.guestHidden ||
          Date.now() - this.lastPeer > 5000)
      ) return;
      s.paused = command.paused;
      s.queued = [];
    } else if (
      !this.view.lobby && !s.paused && command.level === s.game.level &&
      command.phase === s.game.phase && s.queued.length < 30
    ) {
      // Identity comes from the authenticated connection, never from the input.
      s.queued.push({ ...command.input, player });
    }
    this.snapshot();
  }
  canStep(): boolean {
    return this.view.role === "host" && this.view.status === "connected" &&
      this.peer && !this.view.lobby;
  }
  afterTick() {
    this.events.push(...this.session.game.events);
    if (this.session.game.tick % 3 === 0) this.snapshot();
  }
  private snapshot() {
    if (
      this.view.role !== "host" || this.view.status !== "connected" ||
      !this.peer
    ) return;
    // Drop superseded snapshots when the network is congested instead of building
    // an ever-growing queue. Reliable actions are separate, small messages.
    if ((this.socket?.bufferedAmount ?? 0) > 64 * 1024) {
      this.events = [];
      return;
    }
    const payload: Snapshot = {
      game: { ...this.session.game, events: this.events.splice(0, 200) },
      lobby: this.view.lobby,
      paused: this.session.paused,
      round: this.round,
    };
    this.send({ type: "snapshot", seq: ++this.seq, payload });
  }
  render(): GameState {
    if (this.view.role !== "guest" || !this.previous || this.session.paused) {
      return this.session.game;
    }
    return interpolate(
      this.previous,
      this.session.game,
      (performance.now() - this.receivedAt) / 50,
    );
  }
  private maintain() {
    if (this.disposed) return;
    const now = Date.now();
    // A closing TCP connection can take longer than the room's grace period.
    // Reconnect using the same credential without waiting for its close event.
    if (
      this.view.status === "connected" && this.socket &&
      this.socket.readyState >= WebSocket.CLOSING
    ) {
      this.connectionLost();
    }
    if (
      this.view.status === "reconnecting" || this.view.status === "connecting"
    ) {
      if (this.reconnectUntil && now > this.reconnectUntil) {
        this.fail(
          "Could not reconnect. The room may have expired; create a new one.",
        );
        return;
      }
      if (
        this.view.status === "reconnecting" && now >= this.retryAt &&
        this.socket && this.socket.readyState >= WebSocket.CLOSING
      ) this.connect();
    }
    if (this.socket?.readyState === WebSocket.OPEN) {
      if (now - this.lastPong > 8000) {
        this.socket.close();
        return;
      }
      this.send({ type: "ping" });
      if (this.view.role === "guest") {
        this.dispatch({ kind: "visibility", hidden: document.hidden });
      }
      if (
        this.peer &&
        (now - this.lastPeer > 5000 ||
          (this.view.role === "guest" && this.lastSnapshot &&
            now - this.lastSnapshot > 5000))
      ) {
        this.session.paused = true;
        this.session.queued = [];
        this.view.stalled = true;
      }
      this.snapshot();
    } else if (
      this.socket?.readyState === WebSocket.CONNECTING &&
      now - this.lastPong > 8000
    ) this.socket.close();
  }
  private connectionLost() {
    if (this.view.status === "connected") {
      this.reconnectUntil = Date.now() + 30_000;
    }
    // Seats stay as last seen, so getting back in doesn't announce a "join".
    this.view.status = "reconnecting";
    this.session.paused = true;
    this.session.queued = [];
    this.retryAt = Date.now() + 1500;
  }
  private send(message: unknown) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
  leave() {
    this.send({ type: "leave" });
    this.dispose();
  }
  private fail(message: string) {
    this.view.status = "closed";
    this.view.error = message;
    this.session.paused = true;
    this.dispose();
  }
  private dispose() {
    this.disposed = true;
    clearInterval(this.timer);
    this.abort.abort();
    document.removeEventListener("visibilitychange", this.visibility);
    this.socket?.close();
  }
}
