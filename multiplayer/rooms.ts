import {
  type RoomContext,
  type RoomNamespace,
  type RoomSocket,
  upgrade,
} from "./cloudflare.ts";

const PREFIX = "/api/multiplayer/rooms";
const TOKEN = /^[a-f0-9]{32}$/;
const MAX_MESSAGE = 64 * 1024;
const LIFETIME = 2 * 60 * 60 * 1000;
const RECONNECT = 30_000;
const VERSION = 2;
type Role = "host" | "guest";
interface Room {
  host: string;
  guest: string | null;
  expires: number;
  deadline: number;
  closed: boolean;
}
interface Attachment {
  role: Role | null;
  name: string;
  count: number;
  window: number;
  seq: number;
}
export function token(): string {
  return crypto.randomUUID().replaceAll("-", "");
}
export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
 * A display name others will see: single-spaced, 1–20 code points, with no
 * control, private-use or bidi-override characters (emoji joiners allowed).
 */
export function playerName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  const length = [...name].length;
  return length >= 1 && length <= 20 &&
      !/[\p{Cc}\p{Cs}\p{Co}\p{Cn}]|(?!\u200d)\p{Cf}/u.test(name)
    ? name
    : null;
}
function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function roomRequest(
  req: Request,
  rooms?: RoomNamespace,
): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) {
    return null;
  }
  if (!rooms) {
    return json({
      error:
        "Online rooms are unavailable here. Use the Cloudflare deployment.",
    }, 503);
  }
  if (req.headers.get("Origin") !== url.origin) {
    return json({ error: "Origin not allowed" }, 403);
  }
  if (url.pathname === PREFIX && req.method === "POST") {
    const id = token();
    const response = await rooms.getByName(id).fetch(
      new Request(`${url.origin}/create`, { method: "POST" }),
    );
    if (!response.ok) return response;
    const credentials = await response.json();
    return json({ room: id, ...credentials }, 201);
  }
  const id = url.pathname.slice(PREFIX.length + 1);
  if (!TOKEN.test(id)) return json({ error: "Room not found" }, 404);
  if (
    req.method !== "GET" ||
    req.headers.get("Upgrade")?.toLowerCase() !== "websocket"
  ) {
    return json({ error: "WebSocket connection required" }, 426);
  }
  return rooms.getByName(id).fetch(req);
}

/** One two-seat relay. Game state stays in the host browser, never in storage. */
export class GameRoom {
  private room: Room | undefined;
  constructor(private readonly ctx: RoomContext) {
    ctx.blockConcurrencyWhile(async () => {
      this.room = await ctx.storage.get<Room>("room");
    });
  }
  async fetch(req: Request): Promise<Response> {
    if (new URL(req.url).pathname === "/create" && req.method === "POST") {
      if (this.room) return json({ error: "Room already exists" }, 409);
      const now = Date.now();
      this.room = {
        host: token(),
        guest: null,
        expires: now + LIFETIME,
        deadline: now + 15 * 60_000,
        closed: false,
      };
      await this.save();
      return json({ hostToken: this.room.host });
    }
    if (!this.room || this.room.closed || Date.now() >= this.room.deadline) {
      return json({ error: "Room expired" }, 410);
    }
    // Unauthenticated sockets authenticate in their first message, so credentials
    // never appear in URLs or access logs. Bound these pending connections too.
    if (
      this.ctx.getWebSockets().filter((socket) => socket.readyState === 1)
        .length >= 4
    ) {
      return json({ error: "Room full" }, 409);
    }
    return upgrade(this.ctx);
  }
  async webSocketMessage(ws: RoomSocket, raw: string | ArrayBuffer) {
    const room = this.room;
    if (!room || room.closed || Date.now() >= room.deadline) {
      return this.reject(ws, "Room expired");
    }
    if (
      typeof raw !== "string" ||
      new TextEncoder().encode(raw).length > MAX_MESSAGE
    ) return this.reject(ws, "Message too large");
    const attachment = ws.deserializeAttachment() as Attachment;
    const now = Date.now();
    if (now - attachment.window >= 1000) {
      attachment.window = now;
      attachment.count = 0;
    }
    if (++attachment.count > 60) return this.reject(ws, "Too many messages");
    ws.serializeAttachment(attachment);
    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch {
      return this.reject(ws, "Invalid message");
    }
    if (!object(message)) return this.reject(ws, "Invalid message");
    if (!attachment.role) {
      if (
        message.type !== "join" || message.version !== VERSION ||
        typeof message.token !== "string" || !TOKEN.test(message.token)
      ) return this.reject(ws, "Invalid invitation or game version");
      const role = message.role;
      if (role !== "host" && role !== "guest") {
        return this.reject(ws, "Invalid role");
      }
      const name = playerName(message.name);
      if (!name) return this.reject(ws, "Invalid name");
      if (role === "host" && message.token !== room.host) {
        return this.reject(ws, "Invalid host credentials");
      }
      if (role === "guest" && room.guest && room.guest !== message.token) {
        return this.reject(ws, "Room full");
      }
      if (role === "guest" && message.token === room.host) {
        return this.reject(ws, "Invalid guest credentials");
      }
      for (const peer of this.sockets(role)) {
        peer.serializeAttachment({
          ...peer.deserializeAttachment() as Attachment,
          role: null,
        });
        this.reject(peer, "Connection replaced");
      }
      if (role === "guest") room.guest = message.token;
      attachment.role = role;
      attachment.name = name;
      ws.serializeAttachment(attachment);
      room.deadline =
        this.sockets("host").length && this.sockets("guest").length
          ? room.expires
          : Math.min(
            room.expires,
            now + (room.guest ? RECONNECT : 15 * 60_000),
          );
      await this.save();
      ws.send(JSON.stringify({ type: "joined", role, version: VERSION }));
      this.presence();
      return;
    }
    if (message.type === "leave") {
      await this.end("Your partner left the game.");
      return;
    }
    if (message.type === "name") {
      const name = playerName(message.name);
      if (!name) return this.reject(ws, "Invalid name");
      attachment.name = name;
      ws.serializeAttachment(attachment);
      this.presence();
      return;
    }
    if (message.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      for (
        const peer of this.sockets(
          attachment.role === "host" ? "guest" : "host",
        )
      ) peer.send(JSON.stringify({ type: "heartbeat" }));
      return;
    }
    const allowed = attachment.role === "host"
      ? message.type === "snapshot"
      : message.type === "command";
    if (
      !allowed || !Number.isSafeInteger(message.seq) ||
      typeof message.seq !== "number" || message.seq <= attachment.seq ||
      !object(message.payload)
    ) return this.reject(ws, "Invalid game message");
    attachment.seq = message.seq;
    ws.serializeAttachment(attachment);
    for (
      const peer of this.sockets(attachment.role === "host" ? "guest" : "host")
    ) peer.send(raw);
  }
  async webSocketClose(ws: RoomSocket) {
    ws.close(1000, "Connection closed");
    await this.disconnected(ws);
  }
  async webSocketError(ws: RoomSocket) {
    ws.close(1011, "Connection error");
    await this.disconnected(ws);
  }
  async alarm() {
    if (this.room && Date.now() >= this.room.deadline) {
      await this.end("Room expired");
    }
  }
  private sockets(role: Role) {
    return this.ctx.getWebSockets().filter((socket) =>
      socket.readyState === 1 &&
      (socket.deserializeAttachment() as Attachment | null)?.role === role
    );
  }
  /** Each seat's display name, or null while nobody is connected to it. */
  private presence() {
    const name = (role: Role) =>
      (this.sockets(role)[0]?.deserializeAttachment() as Attachment | undefined)
        ?.name ?? null;
    const message = JSON.stringify({
      type: "presence",
      host: name("host"),
      guest: name("guest"),
    });
    for (const role of ["host", "guest"] as const) {
      for (const ws of this.sockets(role)) {
        ws.send(message);
      }
    }
  }
  private async disconnected(ws: RoomSocket) {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    if (!attachment?.role || !this.room || this.room.closed) return;
    ws.serializeAttachment({ ...attachment, role: null });
    this.room.deadline = Math.min(this.room.expires, Date.now() + RECONNECT);
    await this.save();
    this.presence();
  }
  private reject(ws: RoomSocket, reason: string) {
    ws.send(JSON.stringify({ type: "error", message: reason }));
    ws.close(1008, reason);
  }
  private async end(reason: string) {
    if (this.room) this.room.closed = true;
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState === 1) this.reject(ws, reason);
    }
    await this.ctx.storage.deleteAll();
  }
  private async save() {
    if (!this.room) return;
    await this.ctx.storage.put("room", this.room);
    await this.ctx.storage.setAlarm(this.room.deadline);
  }
}
