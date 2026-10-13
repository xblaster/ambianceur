import { env, runInDurableObject } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { DURATIONS, ROOM_CODE_PATTERN, type ClientMessage, type PublicState, type ServerMessage } from "@ambianceur/shared";
import type { Room } from "../src/index";

const BASE = "http://ambianceur.test";
const worker = () => exports.default as unknown as Fetcher;

type Msg<T extends ServerMessage["type"]> = Extract<ServerMessage, { type: T }>;
const is =
  <T extends ServerMessage["type"]>(type: T) =>
  (m: ServerMessage): m is Msg<T> =>
    m.type === type;

async function createRoomCode(): Promise<string> {
  const res = await worker().fetch(`${BASE}/api/rooms`, { method: "POST" });
  expect(res.status).toBe(201);
  const { code } = (await res.json()) as { code: string };
  return code;
}

interface TestClient {
  frames: string[];
  send(message: ClientMessage): void;
  close(): void;
  waitFor<T extends ServerMessage>(predicate: (m: ServerMessage) => m is T, label?: string): Promise<T>;
  waitForState(predicate: (s: PublicState) => boolean, label?: string): Promise<PublicState>;
}

async function connect(code: string, deviceId: string, pseudo: string, avatar = "🙂"): Promise<TestClient> {
  const query = new URLSearchParams({ deviceId, pseudo, avatar });
  const res = await worker().fetch(`${BASE}/parties/room/${code}?${query}`, { headers: { Upgrade: "websocket" } });
  const ws = res.webSocket;
  if (!ws) throw new Error(`pas de WebSocket (${res.status})`);
  ws.accept();
  const frames: string[] = [];
  const messages: ServerMessage[] = [];
  const listeners = new Set<() => void>();
  ws.addEventListener("message", (event) => {
    frames.push(event.data as string);
    messages.push(JSON.parse(event.data as string) as ServerMessage);
    for (const l of listeners) l();
  });
  const client: TestClient = {
    frames,
    send: (m) => ws.send(JSON.stringify(m)),
    close: () => ws.close(1000, "bye"),
    waitFor(predicate, label = "message") {
      return new Promise((resolve, reject) => {
        let index = 0;
        const check = () => {
          for (; index < messages.length; index++) {
            const m = messages[index]!;
            if (predicate(m)) {
              listeners.delete(check);
              clearTimeout(timeout);
              resolve(m);
              return;
            }
          }
        };
        const timeout = setTimeout(() => {
          listeners.delete(check);
          reject(new Error(`timeout en attendant ${label} (${deviceId})`));
        }, 3_000);
        listeners.add(check);
        check();
      });
    },
    async waitForState(predicate, label = "état") {
      const m = await client.waitFor((x): x is Msg<"state"> => x.type === "state" && predicate(x.state), label);
      return m.state;
    },
  };
  return client;
}

const roomStub = (code: string) => env.Room.get(env.Room.idFromName(code));

describe("API de salles", () => {
  it("crée une salle avec un code de 4 lettres et sait si elle existe", async () => {
    const code = await createRoomCode();
    expect(code).toMatch(ROOM_CODE_PATTERN);
    expect((await worker().fetch(`${BASE}/api/rooms/${code}`)).status).toBe(200);
    expect((await worker().fetch(`${BASE}/api/rooms/ZZZZ`)).status).toBe(404);
    expect((await worker().fetch(`${BASE}/api/rooms/io12`)).status).toBe(404);
  });

  it("refuse de réserver deux fois le même code (collision)", async () => {
    const code = await createRoomCode();
    const again = await runInDurableObject(roomStub(code), (room: Room) => room.claim());
    expect(again).toBe(false);
  });

  it("répond « introuvable » à une connexion sur une salle inexistante", async () => {
    const client = await connect("WXYZ", "device-inconnu", "Léa");
    const gone = await client.waitFor(is("gone"));
    expect(gone.reason).toBe("not_found");
  });
});

describe("partie avec 3 clients", () => {
  it("diffuse le lobby, joue une manche et ne transmet jamais de réponse individuelle", async () => {
    const code = await createRoomCode();
    const host = await connect(code, "device-host-0001", "Paul", "🦊");
    await host.waitForState((s) => s.players.length === 1 && s.you.isHost, "hôte seul");
    const b = await connect(code, "device-bbbb-0002", "Léa");
    const c = await connect(code, "device-cccc-0003", "Paul");
    const lobby = await host.waitForState((s) => s.players.length === 3, "3 joueurs");
    expect(lobby.players.map((p) => p.pseudo)).toEqual(["Paul", "Léa", "Paul 2"]);
    expect(lobby.canStart).toBe(true);

    // Action réservée à l'hôte
    b.send({ type: "start" });
    const err = await b.waitFor(is("error"));
    expect(err.code).toBe("forbidden");

    // Paquet d'une seule question oui/non pour un résultat déterministe
    await runInDurableObject(roomStub(code), (room: Room) => {
      room.deps = { ...room.deps, deck: [{ id: "t1", category: "soft", type: "yesno", text: "As-tu déjà dormi dehors ?" }] };
    });
    host.send({ type: "start" });
    for (const client of [host, b, c]) await client.waitForState((s) => s.phase === "question", "question");

    host.send({ type: "answer", answer: { kind: "yesno", yes: true } });
    await c.waitForState((s) => s.round?.answeredCount === 1, "1 réponse");
    b.send({ type: "answer", answer: { kind: "yesno", yes: true } });
    c.send({ type: "answer", answer: { kind: "yesno", yes: false } });

    for (const client of [host, b, c]) {
      const s = await client.waitForState((x) => x.phase === "reveal", "révélation");
      expect(s.reveal?.result).toEqual({ kind: "yesno", yes: 2, total: 3, noAnswer: 0 });
    }

    // Aucune trame ne contient d'identifiant d'appareil ni la réponse d'un autre joueur.
    const own = new Map<TestClient, string>([
      [host, '"answer":{"kind":"yesno","yes":true}'],
      [b, '"answer":{"kind":"yesno","yes":true}'],
      [c, '"answer":{"kind":"yesno","yes":false}'],
    ]);
    for (const [client, mine] of own) {
      for (const frame of client.frames) {
        expect(frame).not.toMatch(/device-/);
        for (const a of frame.match(/"answer":\{[^}]*\}/g) ?? []) expect(a).toBe(mine);
      }
    }
    for (const client of [host, b, c]) client.close();
  });

  it("exclut un joueur, lui envoie `kicked` et refuse son retour", async () => {
    const code = await createRoomCode();
    const host = await connect(code, "device-host-0011", "Hote");
    const b = await connect(code, "device-bbbb-0012", "Intrus");
    const s = await host.waitForState((x) => x.players.length === 2);
    host.send({ type: "kick", playerId: s.players[1]!.id });
    await b.waitFor(is("kicked"));
    await host.waitForState((x) => x.players.length === 1, "intrus retiré");
    const again = await connect(code, "device-bbbb-0012", "Intrus");
    await again.waitFor(is("kicked"));
    host.close();
  });
});

describe("minuteurs (horloge simulée)", () => {
  it("révèle à l'échéance, enchaîne, puis détruit la salle vide après 10 minutes", async () => {
    const code = await createRoomCode();
    const clients: TestClient[] = [];
    for (const [i, d] of ["device-t-0001", "device-t-0002", "device-t-0003"].entries()) {
      clients.push(await connect(code, d, `J${i}`));
    }
    const [first, second, third] = clients as [TestClient, TestClient, TestClient];
    await first.waitForState((s) => s.players.length === 3);
    first.send({ type: "start" });
    await first.waitForState((s) => s.phase === "question");

    let offset = 0;
    const advance = (ms: number) =>
      runInDurableObject(roomStub(code), (room: Room) => {
        offset += ms;
        room.now = () => Date.now() + offset;
        room.tick();
      });

    await advance(DURATIONS.answerMs);
    const revealed = await second.waitForState((s) => s.phase === "reveal", "révélation à 30 s");
    expect(revealed.reveal?.result.kind).toBe("insufficient");

    await advance(DURATIONS.revealMs);
    await third.waitForState((s) => s.phase === "question" && s.round?.number === 2, "manche 2");

    for (const c of clients) c.close();
    await new Promise((r) => setTimeout(r, 50));
    await advance(DURATIONS.disconnectGraceMs);
    await advance(DURATIONS.emptyRoomMs);
    const state = await runInDurableObject(roomStub(code), (room: Room) => room.room);
    expect(state?.destroyed).toBe(true);
    expect(state?.players).toEqual([]);
    expect((await worker().fetch(`${BASE}/api/rooms/${code}`)).status).toBe(404);
  });
});
