import { assert, assertEquals } from "@std/assert";
import type { RoomContext, RoomSocket } from "./cloudflare.ts";
import { GameRoom, playerName, roomRequest, token } from "./rooms.ts";

class Socket extends EventTarget implements RoomSocket {
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;
  readyState: 0 | 1 | 2 | 3 = 1;
  bufferedAmount = 0;
  extensions = "";
  protocol = "";
  url = "";
  binaryType: BinaryType = "blob";
  onopen = null;
  onclose = null;
  onmessage = null;
  onerror = null;
  attachment: unknown = {
    role: null,
    name: "",
    count: 0,
    window: Date.now(),
    seq: -1,
  };
  sent: Record<string, unknown>[] = [];
  serializeAttachment(value: unknown) {
    this.attachment = structuredClone(value);
  }
  deserializeAttachment() {
    return structuredClone(this.attachment);
  }
  send(value: string | ArrayBufferLike | Blob | ArrayBufferView) {
    assert(typeof value === "string");
    this.sent.push(JSON.parse(value));
  }
  close() {
    this.readyState = 3;
  }
}
async function setup() {
  const values = new Map<string, unknown>();
  const sockets: Socket[] = [];
  let alarm = 0;
  let initialized: Promise<unknown> = Promise.resolve();
  const ctx: RoomContext = {
    storage: {
      get: <T>(key: string) =>
        Promise.resolve(values.get(key) as T | undefined),
      put: (key, value) => {
        values.set(key, structuredClone(value));
        return Promise.resolve();
      },
      deleteAll: () => {
        values.clear();
        return Promise.resolve();
      },
      setAlarm: (time) => {
        alarm = time;
        return Promise.resolve();
      },
    },
    blockConcurrencyWhile: (callback) => {
      const result = callback();
      initialized = result;
      return result;
    },
    acceptWebSocket: () => {},
    getWebSockets: () => sockets,
  };
  let room = new GameRoom(ctx);
  await initialized;
  const response = await room.fetch(
    new Request("https://game.test/create", { method: "POST" }),
  );
  const { hostToken } = await response.json();
  async function join(
    role: "host" | "guest",
    credential = token(),
    name: unknown = role === "host" ? "Ada" : "Bo",
  ) {
    const socket = new Socket();
    sockets.push(socket);
    await room.webSocketMessage(
      socket,
      JSON.stringify({
        type: "join",
        version: 2,
        role,
        token: credential,
        name,
      }),
    );
    return socket;
  }
  return {
    values,
    sockets,
    hostToken,
    join,
    get room() {
      return room;
    },
    get alarm() {
      return alarm;
    },
    async wake() {
      room = new GameRoom(ctx);
      await initialized;
    },
    send: (socket: Socket, value: unknown) =>
      room.webSocketMessage(socket, JSON.stringify(value)),
  };
}

Deno.test("room authenticates host, reserves guest seat, and rejects a third player", async () => {
  const t = await setup();
  const impostor = await t.join("host");
  assertEquals(impostor.readyState, 3);
  const host = await t.join("host", t.hostToken);
  const guest = await t.join("guest");
  assertEquals(host.sent.at(-1), {
    type: "presence",
    host: "Ada",
    guest: "Bo",
  });
  assertEquals(guest.sent.at(-1), host.sent.at(-1));
  const third = await t.join("guest");
  assertEquals(third.sent.at(-1)?.message, "Room full");
});

Deno.test("players join with a display name and can rename", async () => {
  const t = await setup();
  const nameless = await t.join("host", t.hostToken, "  ");
  assertEquals(nameless.sent.at(-1)?.message, "Invalid name");
  const host = await t.join("host", t.hostToken);
  const guest = await t.join("guest");
  await t.send(guest, { type: "name", name: "  Bo   Peep " });
  assertEquals(host.sent.at(-1), {
    type: "presence",
    host: "Ada",
    guest: "Bo Peep",
  });
  await t.wake();
  await t.send(host, { type: "name", name: "Ada L" });
  assertEquals(guest.sent.at(-1), {
    type: "presence",
    host: "Ada L",
    guest: "Bo Peep",
  });
  await t.send(guest, { type: "name", name: "x".repeat(21) });
  assertEquals(guest.readyState, 3);
});

Deno.test("display names reject invisible and direction-changing characters", () => {
  assertEquals(playerName(" Dusty  Pete "), "Dusty Pete");
  assertEquals(playerName("👩‍🚀 Ada"), "👩‍🚀 Ada");
  assertEquals(playerName("x".repeat(20)), "x".repeat(20));
  for (const name of ["", "x".repeat(21), "a\u0000b", "evil\u202egnp", 7]) {
    assertEquals(playerName(name), null);
  }
});

Deno.test("relay preserves roles and increasing sequence numbers across hibernation", async () => {
  const t = await setup();
  const host = await t.join("host", t.hostToken);
  const guest = await t.join("guest");
  const message = { type: "snapshot", seq: 2, payload: { example: true } };
  await t.send(host, message);
  assertEquals(guest.sent.at(-1), message);
  await t.wake();
  await t.send(host, message);
  assertEquals(host.readyState, 3);
  await t.send(guest, { type: "snapshot", seq: 1, payload: {} });
  assertEquals(guest.readyState, 3);
});

Deno.test("disconnect reserves identity for reconnect and notifies the other player", async () => {
  const t = await setup();
  const host = await t.join("host", t.hostToken);
  const key = token();
  const guest = await t.join("guest", key);
  guest.close();
  await t.room.webSocketClose(guest);
  assertEquals(host.sent.at(-1), {
    type: "presence",
    host: "Ada",
    guest: null,
  });
  assert(t.alarm <= Date.now() + 30_000);
  await t.wake();
  const third = await t.join("guest");
  assertEquals(third.readyState, 3);
  const reconnected = await t.join("guest", key);
  assertEquals(reconnected.readyState, 1);
  assertEquals(host.sent.at(-1), {
    type: "presence",
    host: "Ada",
    guest: "Bo",
  });
  assert(t.alarm > Date.now() + 60_000);
});

Deno.test("explicit leave closes both connections and expires the room", async () => {
  const t = await setup();
  const host = await t.join("host", t.hostToken);
  const guest = await t.join("guest");
  await t.send(guest, { type: "leave" });
  assertEquals(host.sent.at(-1)?.message, "Your partner left the game.");
  assertEquals(host.readyState, 3);
  assertEquals(guest.readyState, 3);
  assertEquals(t.values.size, 0);
  await t.wake();
  assertEquals(
    (await t.room.fetch(new Request("https://game.test/connect"))).status,
    410,
  );
});

Deno.test("relay rejects malformed, oversized and excessive messages", async () => {
  for (const raw of ["not json", "[]", "x".repeat(65 * 1024)]) {
    const t = await setup();
    const ws = await t.join("host", t.hostToken);
    await t.room.webSocketMessage(ws, raw);
    assertEquals(ws.readyState, 3);
  }
  const t = await setup();
  const ws = await t.join("host", t.hostToken);
  for (let i = 0; i < 61 && ws.readyState === 1; i++) {
    await t.send(ws, { type: "ping" });
  }
  assertEquals(ws.sent.at(-1)?.message, "Too many messages");
});

Deno.test("room API is optional, same-origin and validates paths before forwarding", async () => {
  const url = "https://game.test/api/multiplayer/rooms";
  assertEquals(await roomRequest(new Request("https://game.test/")), null);
  assertEquals((await roomRequest(new Request(url)))?.status, 503);
  let calls = 0;
  const namespace = {
    getByName: () => ({
      fetch: () => {
        calls++;
        return Promise.resolve(Response.json({ hostToken: "secret" }));
      },
    }),
  };
  assertEquals(
    (await roomRequest(
      new Request(url, {
        method: "POST",
        headers: { Origin: "https://evil.test" },
      }),
      namespace,
    ))?.status,
    403,
  );
  assertEquals(
    (await roomRequest(
      new Request(`${url}/invalid`, {
        headers: { Origin: "https://game.test" },
      }),
      namespace,
    ))?.status,
    404,
  );
  assertEquals(calls, 0);
  const response = await roomRequest(
    new Request(url, {
      method: "POST",
      headers: { Origin: "https://game.test" },
    }),
    namespace,
  );
  assertEquals(response?.status, 201);
  const data = await response?.json();
  assert(/^[a-f0-9]{32}$/.test(data.room));
  assertEquals(calls, 1);
});

Deno.test("room alarm expires credentials and connected sockets at the deadline", async () => {
  const t = await setup();
  const host = await t.join("host", t.hostToken);
  const guest = await t.join("guest");
  const now = Date.now;
  const deadline = t.alarm;
  Date.now = () => deadline + 1;
  try {
    await t.room.alarm();
    assertEquals(host.sent.at(-1)?.message, "Room expired");
    assertEquals(guest.readyState, 3);
    assertEquals(t.values.size, 0);
  } finally {
    Date.now = now;
  }
});
