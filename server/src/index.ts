import { Server, getServerByName, routePartykitRequest, type Connection, type ConnectionContext, type WSMessage } from "partyserver";
import {
  DECK,
  ERROR_MESSAGES,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_PATTERN,
  createRoom,
  nextDeadline,
  parseClientMessage,
  parseProfile,
  reduce,
  toPublicState,
  type Deps,
  type ErrorCode,
  type GameEvent,
  type ReduceResult,
  type RoomState,
  type ServerMessage,
} from "@ambianceur/shared";

type ConnState = { deviceId: string };

const send = (conn: Connection, message: ServerMessage) => conn.send(JSON.stringify(message));
const sendError = (conn: Connection, code: ErrorCode) => send(conn, { type: "error", code, message: ERROR_MESSAGES[code] });

/** Une instance = une salle, état en mémoire uniquement (design D1/D2). */
export class Room extends Server<Env> {
  static override options = { hibernate: false };

  room: RoomState | null = null;
  timer: ReturnType<typeof setTimeout> | null = null;
  deps: Deps = { deck: DECK, random: Math.random, newId: () => crypto.randomUUID().slice(0, 8) };
  now: () => number = Date.now;

  /** RPC : réserve la salle. Renvoie false si elle est déjà active. */
  async claim(): Promise<boolean> {
    if (this.room && !this.room.destroyed) return false;
    this.room = createRoom(this.name, this.now());
    this.schedule();
    return true;
  }

  /** RPC : la salle est-elle active ? */
  async exists(): Promise<boolean> {
    return !!this.room && !this.room.destroyed;
  }

  override onConnect(conn: Connection<ConnState>, ctx: ConnectionContext) {
    if (!this.room || this.room.destroyed) {
      send(conn, { type: "gone", reason: "not_found" });
      conn.close(4404, "not_found");
      return;
    }
    const params = new URL(ctx.request.url).searchParams;
    const profile = parseProfile({
      deviceId: params.get("deviceId"),
      pseudo: params.get("pseudo"),
      avatar: params.get("avatar"),
    });
    if (!profile) {
      sendError(conn, "invalid_profile");
      conn.close(4400, "invalid_profile");
      return;
    }
    const result = this.apply({ type: "connect", now: this.now(), profile });
    if (result.rejected) {
      if (result.rejected === "kicked") send(conn, { type: "kicked" });
      else sendError(conn, result.rejected);
      conn.close(4403, result.rejected);
      return;
    }
    conn.setState({ deviceId: profile.deviceId });
    this.broadcastState();
  }

  override onMessage(conn: Connection<ConnState>, raw: WSMessage) {
    const deviceId = conn.state?.deviceId;
    if (!deviceId || !this.room || typeof raw !== "string") return;
    const message = parseClientMessage(raw);
    if (!message) {
      sendError(conn, "invalid_message");
      return;
    }
    this.apply({ type: "message", now: this.now(), deviceId, message });
    this.broadcastState();
  }

  override onClose(conn: Connection<ConnState>) {
    const deviceId = conn.state?.deviceId;
    if (!deviceId || !this.room) return;
    this.apply({ type: "disconnect", now: this.now(), deviceId });
    this.broadcastState();
  }

  /** Applique un événement à la logique pure et traite ses effets (erreurs, exclusions, destruction). */
  apply(event: GameEvent): ReduceResult {
    const result = reduce(this.room!, event, this.deps);
    this.room = result.state;
    for (const { deviceId, code } of result.errors) {
      for (const conn of this.connectionsOf(deviceId)) sendError(conn, code);
    }
    for (const deviceId of result.kicked) {
      for (const conn of this.connectionsOf(deviceId)) {
        conn.setState(null);
        send(conn, { type: "kicked" });
        conn.close(4403, "kicked");
      }
    }
    if (this.room.destroyed) {
      for (const conn of this.getConnections()) {
        send(conn, { type: "gone", reason: "closed" });
        conn.close(4410, "closed");
      }
    }
    this.schedule();
    return result;
  }

  /** Événement d'horloge : fait avancer les minuteurs puis diffuse l'état. */
  tick() {
    if (!this.room) return;
    this.apply({ type: "tick", now: this.now() });
    this.broadcastState();
  }

  broadcastState() {
    const room = this.room;
    if (!room || room.destroyed) return;
    const now = this.now();
    for (const conn of this.getConnections<ConnState>()) {
      const deviceId = conn.state?.deviceId;
      if (deviceId) send(conn, { type: "state", state: toPublicState(room, deviceId, now, this.deps.deck) });
    }
  }

  private *connectionsOf(deviceId: string) {
    for (const conn of this.getConnections<ConnState>()) if (conn.state?.deviceId === deviceId) yield conn;
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const deadline = this.room ? nextDeadline(this.room) : null;
    if (deadline === null) return;
    this.timer = setTimeout(() => this.tick(), Math.max(0, deadline - this.now()) + 10);
  }
}

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return [...bytes].map((b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join("");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      for (let attempt = 0; attempt < 20; attempt++) {
        const code = randomCode();
        const stub = await getServerByName(env.Room, code);
        if (await stub.claim()) return Response.json({ code }, { status: 201 });
      }
      return Response.json({ error: "no_code_available" }, { status: 503 });
    }

    const roomMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)$/);
    if (roomMatch && request.method === "GET") {
      const code = roomMatch[1]!.toUpperCase();
      if (!ROOM_CODE_PATTERN.test(code)) return Response.json({ exists: false }, { status: 404 });
      const stub = await getServerByName(env.Room, code);
      const exists = await stub.exists();
      return Response.json({ exists }, { status: exists ? 200 : 404 });
    }

    const partyMatch = url.pathname.match(/^\/parties\/room\/([^/]+)/);
    if (partyMatch && !ROOM_CODE_PATTERN.test(partyMatch[1]!)) {
      return new Response("Not found", { status: 404 });
    }

    return (await routePartykitRequest(request, env)) ?? env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
