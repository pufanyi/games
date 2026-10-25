// The small Workers API surface used by rooms; kept separate from DOM types so
// the same routing and room logic can be checked and tested with Deno.
export interface RoomSocket extends WebSocket {
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}
export interface RoomContext {
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
    deleteAll(): Promise<void>;
    setAlarm(time: number): Promise<void>;
  };
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
  acceptWebSocket(socket: RoomSocket): void;
  getWebSockets(): RoomSocket[];
}
export interface RoomNamespace {
  getByName(name: string): { fetch(request: Request): Promise<Response> };
}
declare const WebSocketPair: {
  new (): { 0: RoomSocket; 1: RoomSocket };
};
export function upgrade(context: RoomContext): Response {
  const pair = new WebSocketPair();
  context.acceptWebSocket(pair[1]);
  pair[1].serializeAttachment({
    role: null,
    name: "",
    count: 0,
    window: Date.now(),
    seq: -1,
  });
  const init: ResponseInit & { webSocket: WebSocket } = {
    status: 101,
    webSocket: pair[0],
  };
  return new Response(null, init);
}
