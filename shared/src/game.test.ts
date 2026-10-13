import { createRoom, nextDeadline, reduce, toPublicState, uniquePseudo, type Deps, type RoomState } from "./game";
import { DURATIONS, type ClientMessage, type Question } from "./protocol";

const T0 = 1_000_000;

const testDeck: Question[] = [
  { id: "s1", category: "soft", type: "vote", text: "Qui serait le mieux en tutu ?" },
  { id: "s2", category: "soft", type: "yesno", text: "As-tu déjà dormi dehors ?" },
  { id: "f1", category: "fun", type: "vote", text: "Qui danserait sur la table ?" },
  { id: "c1", category: "coquin", type: "yesno", text: "Dors-tu nu ?" },
];

function makeDeps(deck: Question[] = testDeck): Deps {
  let n = 0;
  return { deck, random: () => 0, newId: () => `id${++n}` };
}

/** Petit harnais : applique les événements et garde la trace des erreurs. */
function harness(deck?: Question[]) {
  const deps = makeDeps(deck);
  let state: RoomState = createRoom("ABCD", T0);
  let now = T0;
  const last = { errors: [] as { deviceId: string; code: string }[], kicked: [] as string[], rejected: null as string | null };
  const apply = (event: Parameters<typeof reduce>[1]) => {
    const r = reduce(state, event, deps);
    state = r.state;
    last.errors = r.errors;
    last.kicked = r.kicked;
    last.rejected = r.rejected;
    return r;
  };
  const api = {
    get state() {
      return state;
    },
    last,
    advance(ms: number) {
      now += ms;
      return apply({ type: "tick", now });
    },
    join(deviceId: string, pseudo = deviceId, avatar = "🙂") {
      return apply({ type: "connect", now, profile: { deviceId, pseudo, avatar } });
    },
    leave(deviceId: string) {
      return apply({ type: "disconnect", now, deviceId });
    },
    send(deviceId: string, message: ClientMessage) {
      return apply({ type: "message", now, deviceId, message });
    },
    view(deviceId: string) {
      return toPublicState(state, deviceId, now, deps.deck);
    },
    idOf(deviceId: string) {
      return state.players.find((p) => p.deviceId === deviceId)!.id;
    },
    deps,
  };
  return api;
}

function lobbyWith(count: number, deck?: Question[]) {
  const h = harness(deck);
  for (let i = 1; i <= count; i++) h.join(`dev-${i}`, `Joueur${i}`);
  return h;
}

// ---------- player-identity ----------

describe("identité et reconnexion", () => {
  it("rend le pseudo unique avec un suffixe", () => {
    const h = harness();
    h.join("dev-a", "Paul");
    h.join("dev-b", "paul");
    expect(h.state.players.map((p) => p.pseudo)).toEqual(["Paul", "paul 2"]);
    expect(uniquePseudo("a".repeat(20), ["a".repeat(20)])).toBe(`${"a".repeat(18)} 2`);
  });

  it("rend sa place, son rôle et sa réponse à un joueur qui se reconnecte", () => {
    const h = lobbyWith(4);
    h.send("dev-1", { type: "start" });
    h.send("dev-1", { type: "answer", answer: { kind: "vote", playerId: h.idOf("dev-2") } });
    const id = h.idOf("dev-1");
    h.leave("dev-1");
    h.advance(5_000);
    h.join("dev-1", "Joueur1");
    expect(h.state.players).toHaveLength(4);
    expect(h.idOf("dev-1")).toBe(id);
    const v = h.view("dev-1");
    expect(v.you.isHost).toBe(true);
    expect(v.you.answer).toEqual({ kind: "vote", playerId: h.idOf("dev-2") });
  });

  it("met à jour le profil sans changer d'identité", () => {
    const h = lobbyWith(2);
    const id = h.idOf("dev-2");
    h.send("dev-2", { type: "updateProfile", pseudo: "Joueur1", avatar: "🦊" });
    const p = h.state.players.find((x) => x.deviceId === "dev-2")!;
    expect(p.id).toBe(id);
    expect(p.pseudo).toBe("Joueur1 2");
    expect(p.avatar).toBe("🦊");
    h.send("dev-2", { type: "updateProfile", pseudo: "  ", avatar: "🦊" });
    expect(h.last.errors).toEqual([{ deviceId: "dev-2", code: "invalid_profile" }]);
  });
});

// ---------- game-room ----------

describe("salle et lobby", () => {
  it("fait du premier joueur l'hôte", () => {
    const h = lobbyWith(2);
    expect(h.view("dev-1").you.isHost).toBe(true);
    expect(h.view("dev-2").you.isHost).toBe(false);
    expect(h.view("dev-2").players.find((p) => p.isHost)?.pseudo).toBe("Joueur1");
  });

  it("refuse le 31e joueur mais accepte la reconnexion d'un joueur présent", () => {
    const h = lobbyWith(30);
    h.join("dev-31");
    expect(h.last.rejected).toBe("full");
    expect(h.state.players).toHaveLength(30);
    h.leave("dev-5");
    h.join("dev-5");
    expect(h.last.rejected).toBeNull();
  });

  it("désactive le lancement sous 3 joueurs", () => {
    const h = lobbyWith(2);
    expect(h.view("dev-1").canStart).toBe(false);
    expect(h.view("dev-1").missingPlayers).toBe(1);
    h.send("dev-1", { type: "start" });
    expect(h.last.errors[0]?.code).toBe("not_enough_players");
    h.join("dev-3");
    expect(h.view("dev-1").canStart).toBe(true);
    h.send("dev-1", { type: "start" });
    expect(h.state.phase).toBe("question");
  });

  it("réserve les actions d'hôte à l'hôte", () => {
    const h = lobbyWith(3);
    for (const m of [
      { type: "start" },
      { type: "setCategory", category: "coquin", enabled: true },
      { type: "kick", playerId: h.idOf("dev-3") },
      { type: "stop" },
    ] as ClientMessage[]) {
      h.send("dev-2", m);
      expect(h.last.errors[0]?.code).toBe("forbidden");
    }
  });

  it("retire un joueur déconnecté depuis 30 s et transfère l'hôte au plus ancien", () => {
    const h = harness();
    h.join("dev-1");
    h.advance(1);
    h.join("dev-2");
    h.advance(1);
    h.join("dev-3");
    h.leave("dev-1");
    h.advance(DURATIONS.disconnectGraceMs - 1);
    expect(h.state.players).toHaveLength(3);
    h.advance(1);
    expect(h.state.players.map((p) => p.deviceId)).toEqual(["dev-2", "dev-3"]);
    expect(h.view("dev-2").you.isHost).toBe(true);
    expect(h.view("dev-3").notice?.kind).toBe("host_changed");
  });

  it("exclut un joueur et l'empêche de revenir", () => {
    const h = lobbyWith(4);
    h.send("dev-1", { type: "kick", playerId: h.idOf("dev-4") });
    expect(h.last.kicked).toEqual(["dev-4"]);
    expect(h.state.players).toHaveLength(3);
    h.join("dev-4");
    expect(h.last.rejected).toBe("kicked");
    expect(h.state.players).toHaveLength(3);
  });

  it("accueille un joueur en pleine manche comme spectateur, puis le fait participer", () => {
    const h = lobbyWith(3);
    h.send("dev-1", { type: "start" });
    h.join("dev-4");
    const v = h.view("dev-4");
    expect(v.you.spectator).toBe(true);
    expect(v.round?.participantCount).toBe(3);
    h.send("dev-4", { type: "answer", answer: { kind: "vote", playerId: h.idOf("dev-1") } });
    expect(h.last.errors[0]?.code).toBe("wrong_phase");
    for (const d of ["dev-1", "dev-2", "dev-3"]) {
      h.send(d, { type: "answer", answer: { kind: "vote", playerId: h.idOf("dev-1") } });
    }
    expect(h.state.phase).toBe("reveal");
    h.advance(DURATIONS.revealMs);
    expect(h.view("dev-4").you.spectator).toBe(false);
    expect(h.view("dev-4").round?.participantCount).toBe(4);
  });

  it("détruit la salle et ses données après 10 minutes sans joueur connecté", () => {
    const h = lobbyWith(3);
    h.send("dev-2", { type: "submitQuestion", questionType: "vote", text: "Qui ronfle le plus ?" });
    for (const d of ["dev-1", "dev-2", "dev-3"]) h.leave(d);
    h.advance(DURATIONS.emptyRoomMs - 1);
    expect(h.state.destroyed).toBe(false);
    h.advance(1);
    expect(h.state.destroyed).toBe(true);
    expect(h.state.players).toEqual([]);
    expect(h.state.queue).toEqual([]);
    expect(nextDeadline(h.state)).toBeNull();
  });
});

// ---------- game-round ----------

describe("manche", () => {
  const voteDeck: Question[] = [{ id: "v", category: "soft", type: "vote", text: "Qui en tutu ?" }];
  const yesDeck: Question[] = [{ id: "y", category: "soft", type: "yesno", text: "Dormi dehors ?" }];

  it("accepte une seule réponse modifiable et révèle quand tout le monde a répondu", () => {
    const h = lobbyWith(3, voteDeck);
    h.send("dev-1", { type: "start" });
    const [p1, p2] = [h.idOf("dev-1"), h.idOf("dev-2")];
    h.send("dev-1", { type: "answer", answer: { kind: "vote", playerId: p1 } });
    h.send("dev-1", { type: "answer", answer: { kind: "vote", playerId: p2 } });
    h.send("dev-2", { type: "answer", answer: { kind: "vote", playerId: p2 } });
    const v = h.view("dev-3");
    expect(v.round?.answeredCount).toBe(2);
    expect(v.players.filter((p) => p.answered)).toHaveLength(2);
    h.send("dev-3", { type: "answer", answer: { kind: "vote", playerId: p1 } });
    expect(h.state.phase).toBe("reveal");
    const r = h.view("dev-3").reveal!.result;
    expect(r).toMatchObject({ kind: "vote", winnerIds: [p2], total: 3, noAnswer: 0 });
  });

  it("met en avant les ex aequo", () => {
    const h = lobbyWith(4, voteDeck);
    h.send("dev-1", { type: "start" });
    const [p1, p2] = [h.idOf("dev-1"), h.idOf("dev-2")];
    h.send("dev-1", { type: "answer", answer: { kind: "vote", playerId: p1 } });
    h.send("dev-2", { type: "answer", answer: { kind: "vote", playerId: p1 } });
    h.send("dev-3", { type: "answer", answer: { kind: "vote", playerId: p2 } });
    h.send("dev-4", { type: "answer", answer: { kind: "vote", playerId: p2 } });
    const r = h.view("dev-1").reveal!.result;
    expect(r.kind === "vote" && [...r.winnerIds].sort()).toEqual([p1, p2].sort());
  });

  it("refuse un vote pour un non-participant ou un type de réponse incohérent", () => {
    const h = lobbyWith(3, voteDeck);
    h.send("dev-1", { type: "start" });
    h.send("dev-1", { type: "answer", answer: { kind: "vote", playerId: "inconnu" } });
    expect(h.last.errors[0]?.code).toBe("invalid_message");
    h.send("dev-1", { type: "answer", answer: { kind: "yesno", yes: true } });
    expect(h.last.errors[0]?.code).toBe("invalid_message");
  });

  it("ne révèle que le décompte pour un oui/non", () => {
    const h = lobbyWith(4, yesDeck);
    h.send("dev-1", { type: "start" });
    h.send("dev-1", { type: "answer", answer: { kind: "yesno", yes: true } });
    h.send("dev-2", { type: "answer", answer: { kind: "yesno", yes: false } });
    h.send("dev-3", { type: "answer", answer: { kind: "yesno", yes: true } });
    h.send("dev-4", { type: "answer", answer: { kind: "yesno", yes: false } });
    expect(h.view("dev-2").reveal!.result).toEqual({ kind: "yesno", yes: 2, total: 4, noAnswer: 0 });
  });

  it("révèle au bout de 30 s en comptant les absents comme sans réponse", () => {
    const h = lobbyWith(4, yesDeck);
    h.send("dev-1", { type: "start" });
    for (const d of ["dev-1", "dev-2", "dev-3"]) h.send(d, { type: "answer", answer: { kind: "yesno", yes: true } });
    h.advance(DURATIONS.answerMs - 1);
    expect(h.state.phase).toBe("question");
    h.advance(1);
    expect(h.view("dev-1").reveal!.result).toEqual({ kind: "yesno", yes: 3, total: 3, noAnswer: 1 });
  });

  it("n'attend pas les participants déconnectés", () => {
    const h = lobbyWith(4, yesDeck);
    h.send("dev-1", { type: "start" });
    h.leave("dev-4");
    for (const d of ["dev-1", "dev-2", "dev-3"]) h.send(d, { type: "answer", answer: { kind: "yesno", yes: false } });
    expect(h.state.phase).toBe("reveal");
  });

  it("ne révèle rien avec moins de 3 réponses", () => {
    const h = lobbyWith(4, yesDeck);
    h.send("dev-1", { type: "start" });
    h.send("dev-1", { type: "answer", answer: { kind: "yesno", yes: true } });
    h.send("dev-2", { type: "answer", answer: { kind: "yesno", yes: false } });
    h.send("dev-1", { type: "forceReveal" });
    expect(h.view("dev-1").reveal!.result).toEqual({ kind: "insufficient", total: 2 });
  });

  it("annule la manche et revient au lobby sous 3 joueurs", () => {
    const h = lobbyWith(3);
    h.send("dev-1", { type: "start" });
    h.leave("dev-3");
    h.advance(DURATIONS.disconnectGraceMs);
    expect(h.state.phase).toBe("lobby");
    expect(h.state.round).toBeNull();
    expect(h.view("dev-1").notice?.kind).toBe("round_cancelled");
  });

  it("enchaîne après 8 s, sauf en pause ; reprendre ou passer relance", () => {
    const deck: Question[] = Array.from({ length: 5 }, (_, i) => ({
      id: `q${i}`,
      category: "soft" as const,
      type: "yesno" as const,
      text: `Question ${i} ?`,
    }));
    const h = lobbyWith(3, deck);
    h.send("dev-1", { type: "start" });
    h.send("dev-1", { type: "forceReveal" });
    expect(h.view("dev-1").reveal!.deadline).not.toBeNull();
    h.advance(DURATIONS.revealMs);
    expect(h.state.phase).toBe("question");
    expect(h.state.roundNumber).toBe(2);

    h.send("dev-1", { type: "forceReveal" });
    h.send("dev-1", { type: "pause" });
    expect(h.view("dev-2").reveal!.deadline).toBeNull();
    h.advance(60_000);
    expect(h.state.phase).toBe("reveal");
    h.send("dev-1", { type: "resume" });
    expect(h.state.phase).toBe("question");
    expect(h.state.roundNumber).toBe(3);

    h.send("dev-1", { type: "skip" });
    expect(h.state.phase).toBe("question");
    expect(h.state.roundNumber).toBe(4);
    expect(h.state.reveal).toBeNull();
  });

  it("termine la partie quand il n'y a plus de questions puis revient au lobby", () => {
    const h = lobbyWith(3, voteDeck);
    h.send("dev-1", { type: "start" });
    h.send("dev-1", { type: "skip" });
    expect(h.state.phase).toBe("end");
    expect(h.view("dev-1").notice?.kind).toBe("no_more_questions");
    h.advance(DURATIONS.endMs);
    expect(h.state.phase).toBe("lobby");
  });

  it("permet à l'hôte d'arrêter la partie", () => {
    const h = lobbyWith(3);
    h.send("dev-1", { type: "start" });
    h.send("dev-1", { type: "stop" });
    expect(h.state.phase).toBe("end");
  });

  it("calcule la prochaine échéance à surveiller", () => {
    const h = lobbyWith(3);
    h.send("dev-1", { type: "start" });
    expect(nextDeadline(h.state)).toBe(h.state.round!.deadline);
  });
});

// ---------- anonymat ----------

describe("anonymat", () => {
  it("ne diffuse jamais la réponse ni l'auteur d'une question aux autres appareils, hôte compris", () => {
    const h = lobbyWith(4, [{ id: "y", category: "soft", type: "yesno", text: "Dormi dehors ?" }]);
    h.send("dev-3", { type: "submitQuestion", questionType: "yesno", text: "Question secrète ?" });
    h.send("dev-1", { type: "start" });
    h.send("dev-2", { type: "answer", answer: { kind: "yesno", yes: true } });

    const views = ["dev-1", "dev-3", "dev-4"].map((d) => JSON.stringify(h.view(d)));
    for (const v of views) {
      expect(v).not.toContain('"yes":true');
      expect(v).not.toContain("dev-");
    }
    // L'auteur voit sa propre réponse, personne d'autre.
    expect(h.view("dev-2").you.answer).toEqual({ kind: "yesno", yes: true });
    expect(h.view("dev-1").you.answer).toBeNull();
    // La question proposée est jouée sans auteur.
    expect(h.view("dev-1").round).toMatchObject({ fromPlayer: true, text: "Question secrète ?" });
  });

  it("efface les réponses individuelles à la révélation", () => {
    const h = lobbyWith(3, [{ id: "y", category: "soft", type: "yesno", text: "Dormi dehors ?" }]);
    h.send("dev-1", { type: "start" });
    for (const d of ["dev-1", "dev-2", "dev-3"]) h.send(d, { type: "answer", answer: { kind: "yesno", yes: true } });
    expect(h.state.round).toBeNull();
    expect(JSON.stringify(h.state)).not.toContain('"answers"');
  });
});

// ---------- question-deck ----------

describe("paquet et questions de joueurs", () => {
  it("désactive Coquin par défaut et ne tire que les catégories actives", () => {
    const h = lobbyWith(3, [
      { id: "c1", category: "coquin", type: "yesno", text: "Dors-tu nu ?" },
      { id: "s1", category: "soft", type: "yesno", text: "Dormi dehors ?" },
    ]);
    expect(h.view("dev-2").categories.coquin).toBe(false);
    h.send("dev-1", { type: "start" });
    expect(h.state.round!.question.id).toBe("s1");
  });

  it("empêche le lancement sans aucune question disponible", () => {
    const h = lobbyWith(3);
    for (const c of ["soft", "fun", "perso", "coquin"] as const) {
      h.send("dev-1", { type: "setCategory", category: c, enabled: false });
    }
    expect(h.view("dev-1").canStart).toBe(false);
    h.send("dev-1", { type: "start" });
    expect(h.last.errors[0]?.code).toBe("no_questions");
    h.send("dev-2", { type: "submitQuestion", questionType: "vote", text: "Qui ronfle le plus ?" });
    expect(h.view("dev-1").canStart).toBe(true);
  });

  it("ne repose jamais une question déjà jouée", () => {
    const deck: Question[] = Array.from({ length: 60 }, (_, i) => ({
      id: `q${i}`,
      category: "soft" as const,
      type: "yesno" as const,
      text: `Question ${i} ?`,
    }));
    const h = lobbyWith(3, deck);
    let seed = 7;
    h.deps.random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    h.send("dev-1", { type: "start" });
    const seen: string[] = [h.state.round!.question.id];
    for (let i = 1; i < 50; i++) {
      h.send("dev-1", { type: "skip" });
      seen.push(h.state.round!.question.id);
    }
    expect(new Set(seen).size).toBe(50);
  });

  it("valide le texte et limite à 3 questions en attente par joueur", () => {
    const h = lobbyWith(3);
    h.send("dev-2", { type: "submitQuestion", questionType: "vote", text: "Qui" });
    expect(h.last.errors[0]?.code).toBe("invalid_question");
    for (let i = 0; i < 3; i++) h.send("dev-2", { type: "submitQuestion", questionType: "vote", text: `Qui est ${i} ?` });
    expect(h.view("dev-2").you.pendingQuestions).toBe(3);
    h.send("dev-2", { type: "submitQuestion", questionType: "vote", text: "Qui est 4 ?" });
    expect(h.last.errors[0]?.code).toBe("too_many_questions");
  });

  it("intercale au plus une question du paquet entre deux questions de joueurs", () => {
    const h = lobbyWith(3);
    for (const d of ["dev-2", "dev-3"]) {
      h.send(d, { type: "submitQuestion", questionType: "vote", text: `Question de ${d} ?` });
    }
    h.send("dev-1", { type: "start" });
    const kinds: boolean[] = [h.state.round!.question.fromPlayer];
    for (let i = 0; i < 4; i++) {
      h.send("dev-1", { type: "skip" });
      kinds.push(h.state.round!.question.fromPlayer);
    }
    expect(kinds).toEqual([true, false, true, false, false]);
  });

  it("permet à l'hôte de voir la file sans auteur et de retirer une question", () => {
    const h = lobbyWith(3);
    h.send("dev-2", { type: "submitQuestion", questionType: "vote", text: "Question gênante ?" });
    const queue = h.view("dev-1").hostQueue!;
    expect(queue).toEqual([{ id: expect.any(String), type: "vote", text: "Question gênante ?" }]);
    expect(h.view("dev-2").hostQueue).toBeNull();
    h.send("dev-1", { type: "removeQuestion", questionId: queue[0]!.id });
    expect(h.view("dev-1").queueCount).toBe(0);
  });
});
