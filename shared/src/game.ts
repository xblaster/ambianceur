// Logique de salle pure (design D5/D6/D10) : aucun accès réseau, horloge ni hasard implicite.
import {
  DURATIONS,
  LIMITS,
  type Answer,
  type Category,
  type ClientMessage,
  type ErrorCode,
  type Notice,
  type Phase,
  type PublicPlayer,
  type PublicState,
  type Question,
  type QuestionType,
  type RevealResult,
} from "./protocol";
import { normalizeAvatar, normalizePseudo, normalizeQuestionText, type Profile } from "./validate";

export interface PlayerState {
  deviceId: string;
  /** Identifiant public, seul identifiant diffusé aux autres appareils. */
  id: string;
  pseudo: string;
  avatar: string;
  joinedAt: number;
  connections: number;
  disconnectedAt: number | null;
}

export interface QueuedQuestion {
  id: string;
  type: QuestionType;
  text: string;
  authorDeviceId: string;
}

interface RoundQuestion {
  id: string;
  type: QuestionType;
  text: string;
  fromPlayer: boolean;
}

export interface RoundState {
  number: number;
  question: RoundQuestion;
  /** Joueurs participant à la manche, figés à son ouverture. */
  participants: { deviceId: string; id: string; pseudo: string; avatar: string }[];
  /** Réponses individuelles : ne quittent jamais le serveur. */
  answers: Record<string, Answer>;
  deadline: number;
}

export interface RevealState {
  number: number;
  question: RoundQuestion;
  result: RevealResult;
  deadline: number | null;
}

export interface RoomState {
  code: string;
  createdAt: number;
  players: PlayerState[];
  hostDeviceId: string | null;
  kicked: string[];
  categories: Record<Category, boolean>;
  phase: Phase;
  paused: boolean;
  roundNumber: number;
  round: RoundState | null;
  reveal: RevealState | null;
  endDeadline: number | null;
  usedQuestionIds: string[];
  queue: QueuedQuestion[];
  lastWasPlayerQuestion: boolean;
  notice: { kind: Notice; at: number } | null;
  emptySince: number | null;
  destroyed: boolean;
}

export type GameEvent =
  | { type: "connect"; now: number; profile: Profile }
  | { type: "disconnect"; now: number; deviceId: string }
  | { type: "message"; now: number; deviceId: string; message: ClientMessage }
  | { type: "tick"; now: number };

export interface Deps {
  deck: readonly Question[];
  random: () => number;
  newId: () => string;
}

export interface ReduceResult {
  state: RoomState;
  errors: { deviceId: string; code: ErrorCode }[];
  /** Appareils exclus, à déconnecter. */
  kicked: string[];
  /** Connexion refusée (salle pleine, appareil exclu, profil invalide). */
  rejected: ErrorCode | null;
}

export function createRoom(code: string, now: number): RoomState {
  return {
    code,
    createdAt: now,
    players: [],
    hostDeviceId: null,
    kicked: [],
    categories: { soft: true, fun: true, perso: true, coquin: false },
    phase: "lobby",
    paused: false,
    roundNumber: 0,
    round: null,
    reveal: null,
    endDeadline: null,
    usedQuestionIds: [],
    queue: [],
    lastWasPlayerQuestion: false,
    notice: null,
    emptySince: now,
    destroyed: false,
  };
}

// ---------- Utilitaires ----------

const isConnected = (p: PlayerState) => p.connections > 0;
const findPlayer = (s: RoomState, deviceId: string) => s.players.find((p) => p.deviceId === deviceId);

/** Rend un pseudo unique dans la salle en ajoutant un suffixe « 2 », « 3 »… */
export function uniquePseudo(base: string, taken: string[]): string {
  const lower = new Set(taken.map((t) => t.toLowerCase()));
  if (!lower.has(base.toLowerCase())) return base;
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`;
    const head = [...base].slice(0, LIMITS.pseudoMax - suffix.length).join("").trimEnd();
    const candidate = head + suffix;
    if (!lower.has(candidate.toLowerCase())) return candidate;
  }
}

function availableBuiltins(s: RoomState, deck: readonly Question[]): Question[] {
  const used = new Set(s.usedQuestionIds);
  return deck.filter((q) => s.categories[q.category] && !used.has(q.id));
}

function hasQuestionAvailable(s: RoomState, deck: readonly Question[]): boolean {
  return s.queue.length > 0 || availableBuiltins(s, deck).length > 0;
}

/** Tire la prochaine question : au plus une question du paquet entre deux questions de joueurs. */
function drawQuestion(s: RoomState, deps: Deps): RoundQuestion | null {
  const builtins = availableBuiltins(s, deps.deck);
  const takePlayer = s.queue.length > 0 && (!s.lastWasPlayerQuestion || builtins.length === 0);
  if (takePlayer) {
    const q = s.queue.shift()!;
    s.lastWasPlayerQuestion = true;
    return { id: q.id, type: q.type, text: q.text, fromPlayer: true };
  }
  if (builtins.length === 0) return null;
  const q = builtins[Math.floor(deps.random() * builtins.length)]!;
  s.usedQuestionIds.push(q.id);
  s.lastWasPlayerQuestion = false;
  return { id: q.id, type: q.type, text: q.text, fromPlayer: false };
}

function setNotice(s: RoomState, kind: Notice, now: number) {
  s.notice = { kind, at: now };
}

function openNextRound(s: RoomState, now: number, deps: Deps) {
  s.reveal = null;
  const question = drawQuestion(s, deps);
  if (!question) {
    endGame(s, now);
    setNotice(s, "no_more_questions", now);
    return;
  }
  s.roundNumber += 1;
  s.phase = "question";
  s.round = {
    number: s.roundNumber,
    question,
    participants: s.players.map((p) => ({ deviceId: p.deviceId, id: p.id, pseudo: p.pseudo, avatar: p.avatar })),
    answers: {},
    deadline: now + DURATIONS.answerMs,
  };
}

function computeResult(round: RoundState): RevealResult {
  const answers = Object.values(round.answers);
  const total = answers.length;
  const noAnswer = round.participants.length - total;
  if (total < LIMITS.minPlayers) return { kind: "insufficient", total };
  if (round.question.type === "yesno") {
    const yes = answers.filter((a) => a.kind === "yesno" && a.yes).length;
    return { kind: "yesno", yes, total, noAnswer };
  }
  const votes = new Map<string, number>();
  for (const a of answers) if (a.kind === "vote") votes.set(a.playerId, (votes.get(a.playerId) ?? 0) + 1);
  const ranking = round.participants
    .filter((p) => votes.has(p.id))
    .map((p) => ({ playerId: p.id, pseudo: p.pseudo, avatar: p.avatar, votes: votes.get(p.id)! }))
    .sort((a, b) => b.votes - a.votes || a.pseudo.localeCompare(b.pseudo, "fr"));
  const max = ranking[0]?.votes ?? 0;
  const winnerIds = ranking.filter((r) => r.votes === max).map((r) => r.playerId);
  return { kind: "vote", ranking, winnerIds, total, noAnswer };
}

function revealRound(s: RoomState, now: number) {
  const round = s.round;
  if (!round) return;
  s.reveal = {
    number: round.number,
    question: round.question,
    result: computeResult(round),
    deadline: s.paused ? null : now + DURATIONS.revealMs,
  };
  // Les réponses individuelles sont effacées dès la révélation.
  s.round = null;
  s.phase = "reveal";
}

function endGame(s: RoomState, now: number) {
  s.phase = "end";
  s.round = null;
  s.reveal = null;
  s.paused = false;
  s.endDeadline = now + DURATIONS.endMs;
}

function backToLobby(s: RoomState) {
  s.phase = "lobby";
  s.round = null;
  s.reveal = null;
  s.paused = false;
  s.endDeadline = null;
}

/** Révèle dès que tous les participants connectés ont répondu. */
function maybeRevealEarly(s: RoomState, now: number) {
  const round = s.round;
  if (s.phase !== "question" || !round) return;
  const waiting = round.participants.filter((p) => {
    const player = findPlayer(s, p.deviceId);
    return player && isConnected(player) && !round.answers[p.deviceId];
  });
  const connectedParticipants = round.participants.filter((p) => {
    const player = findPlayer(s, p.deviceId);
    return player && isConnected(player);
  });
  if (waiting.length === 0 && connectedParticipants.length > 0) revealRound(s, now);
}

function removePlayer(s: RoomState, deviceId: string, now: number) {
  s.players = s.players.filter((p) => p.deviceId !== deviceId);
  if (s.round) {
    s.round.participants = s.round.participants.filter((p) => p.deviceId !== deviceId);
    delete s.round.answers[deviceId];
  }
  if (s.hostDeviceId === deviceId) {
    const next = [...s.players].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    s.hostDeviceId = next?.deviceId ?? null;
    if (next) setNotice(s, "host_changed", now);
  }
  if (s.phase !== "lobby" && s.phase !== "end" && s.players.length < LIMITS.minPlayers) {
    backToLobby(s);
    setNotice(s, "round_cancelled", now);
    return;
  }
  maybeRevealEarly(s, now);
}

function updateEmptySince(s: RoomState, now: number) {
  const anyConnected = s.players.some(isConnected);
  if (anyConnected) s.emptySince = null;
  else if (s.emptySince === null) s.emptySince = now;
}

// ---------- Réducteur ----------

export function reduce(state: RoomState, event: GameEvent, deps: Deps): ReduceResult {
  const s: RoomState = JSON.parse(JSON.stringify(state)) as RoomState;
  const result: ReduceResult = { state: s, errors: [], kicked: [], rejected: null };
  const now = event.now;
  if (s.destroyed) return result;

  switch (event.type) {
    case "connect": {
      const { profile } = event;
      if (s.kicked.includes(profile.deviceId)) {
        result.rejected = "kicked";
        break;
      }
      const existing = findPlayer(s, profile.deviceId);
      if (existing) {
        existing.connections += 1;
        existing.disconnectedAt = null;
        const others = s.players.filter((p) => p !== existing).map((p) => p.pseudo);
        existing.pseudo = uniquePseudo(profile.pseudo, others);
        existing.avatar = profile.avatar;
      } else {
        if (s.players.length >= LIMITS.maxPlayers) {
          result.rejected = "full";
          break;
        }
        s.players.push({
          deviceId: profile.deviceId,
          id: deps.newId(),
          pseudo: uniquePseudo(
            profile.pseudo,
            s.players.map((p) => p.pseudo),
          ),
          avatar: profile.avatar,
          joinedAt: now,
          connections: 1,
          disconnectedAt: null,
        });
        if (s.hostDeviceId === null) s.hostDeviceId = profile.deviceId;
      }
      break;
    }

    case "disconnect": {
      const player = findPlayer(s, event.deviceId);
      if (!player) break;
      player.connections = Math.max(0, player.connections - 1);
      if (player.connections === 0) {
        player.disconnectedAt = now;
        maybeRevealEarly(s, now);
      }
      break;
    }

    case "tick": {
      for (const p of [...s.players]) {
        if (p.disconnectedAt !== null && now - p.disconnectedAt >= DURATIONS.disconnectGraceMs) {
          removePlayer(s, p.deviceId, now);
        }
      }
      if (s.phase === "question" && s.round && now >= s.round.deadline) revealRound(s, now);
      else if (s.phase === "reveal" && s.reveal?.deadline != null && now >= s.reveal.deadline) {
        openNextRound(s, now, deps);
      } else if (s.phase === "end" && s.endDeadline !== null && now >= s.endDeadline) backToLobby(s);
      if (s.emptySince !== null && now - s.emptySince >= DURATIONS.emptyRoomMs) {
        s.destroyed = true;
        s.players = [];
        s.queue = [];
        s.round = null;
        s.reveal = null;
      }
      break;
    }

    case "message": {
      const player = findPlayer(s, event.deviceId);
      if (!player) break;
      const error = handleMessage(s, player, event.message, now, deps, result);
      if (error) result.errors.push({ deviceId: event.deviceId, code: error });
      break;
    }
  }

  updateEmptySince(s, now);
  return result;
}

function handleMessage(
  s: RoomState,
  player: PlayerState,
  m: ClientMessage,
  now: number,
  deps: Deps,
  result: ReduceResult,
): ErrorCode | null {
  const isHost = s.hostDeviceId === player.deviceId;
  const hostOnly = new Set(["setCategory", "start", "removeQuestion", "forceReveal", "skip", "pause", "resume", "kick", "stop"]);
  if (hostOnly.has(m.type) && !isHost) return "forbidden";

  switch (m.type) {
    case "updateProfile": {
      const pseudo = normalizePseudo(m.pseudo);
      const avatar = normalizeAvatar(m.avatar);
      if (!pseudo || !avatar) return "invalid_profile";
      player.pseudo = uniquePseudo(
        pseudo,
        s.players.filter((p) => p !== player).map((p) => p.pseudo),
      );
      player.avatar = avatar;
      return null;
    }

    case "setCategory":
      s.categories[m.category] = m.enabled;
      return null;

    case "start": {
      if (s.phase !== "lobby") return "wrong_phase";
      if (s.players.filter(isConnected).length < LIMITS.minPlayers) return "not_enough_players";
      if (!hasQuestionAvailable(s, deps.deck)) return "no_questions";
      s.paused = false;
      s.notice = null;
      openNextRound(s, now, deps);
      return null;
    }

    case "answer": {
      const round = s.round;
      if (s.phase !== "question" || !round) return "wrong_phase";
      if (!round.participants.some((p) => p.deviceId === player.deviceId)) return "wrong_phase";
      if (m.answer.kind !== round.question.type) return "invalid_message";
      if (m.answer.kind === "vote") {
        const targetId = m.answer.playerId;
        if (!round.participants.some((p) => p.id === targetId)) return "invalid_message";
      }
      round.answers[player.deviceId] = m.answer;
      maybeRevealEarly(s, now);
      return null;
    }

    case "submitQuestion": {
      const text = normalizeQuestionText(m.text);
      if (!text) return "invalid_question";
      const pending = s.queue.filter((q) => q.authorDeviceId === player.deviceId).length;
      if (pending >= LIMITS.pendingPerPlayer) return "too_many_questions";
      s.queue.push({ id: deps.newId(), type: m.questionType, text, authorDeviceId: player.deviceId });
      return null;
    }

    case "removeQuestion":
      s.queue = s.queue.filter((q) => q.id !== m.questionId);
      return null;

    case "forceReveal":
      if (s.phase !== "question") return "wrong_phase";
      revealRound(s, now);
      return null;

    case "skip":
      if (s.phase !== "question" && s.phase !== "reveal") return "wrong_phase";
      s.paused = false;
      openNextRound(s, now, deps);
      return null;

    case "pause":
      if (s.phase !== "question" && s.phase !== "reveal") return "wrong_phase";
      s.paused = true;
      if (s.reveal) s.reveal.deadline = null;
      return null;

    case "resume":
      if (!s.paused) return null;
      s.paused = false;
      if (s.phase === "reveal") openNextRound(s, now, deps);
      return null;

    case "kick": {
      const target = s.players.find((p) => p.id === m.playerId);
      if (!target || target === player) return "invalid_message";
      s.kicked.push(target.deviceId);
      result.kicked.push(target.deviceId);
      removePlayer(s, target.deviceId, now);
      return null;
    }

    case "stop":
      if (s.phase === "lobby") return "wrong_phase";
      endGame(s, now);
      return null;
  }
}

/** Prochaine échéance à laquelle envoyer un événement `tick`, ou null. */
export function nextDeadline(s: RoomState): number | null {
  if (s.destroyed) return null;
  const candidates: number[] = [];
  for (const p of s.players) if (p.disconnectedAt !== null) candidates.push(p.disconnectedAt + DURATIONS.disconnectGraceMs);
  if (s.phase === "question" && s.round) candidates.push(s.round.deadline);
  if (s.phase === "reveal" && s.reveal?.deadline != null) candidates.push(s.reveal.deadline);
  if (s.phase === "end" && s.endDeadline !== null) candidates.push(s.endDeadline);
  if (s.emptySince !== null) candidates.push(s.emptySince + DURATIONS.emptyRoomMs);
  return candidates.length ? Math.min(...candidates) : null;
}

// ---------- Projection publique ----------

/** Vue de la salle pour un appareil donné. Ne contient jamais la réponse d'un autre joueur. */
export function toPublicState(s: RoomState, deviceId: string, now: number, deck: readonly Question[]): PublicState {
  const me = findPlayer(s, deviceId);
  const isHost = s.hostDeviceId === deviceId;
  const round = s.round;
  const participantSet = new Set(round?.participants.map((p) => p.deviceId) ?? []);
  const connectedCount = s.players.filter(isConnected).length;

  const players: PublicPlayer[] = [...s.players]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((p) => ({
      id: p.id,
      pseudo: p.pseudo,
      avatar: p.avatar,
      isHost: p.deviceId === s.hostDeviceId,
      connected: isConnected(p),
      answered: !!round?.answers[p.deviceId],
      spectator: s.phase === "question" && !participantSet.has(p.deviceId),
    }));

  return {
    code: s.code,
    phase: s.phase,
    paused: s.paused,
    serverNow: now,
    players,
    categories: { ...s.categories },
    canStart: s.phase === "lobby" && connectedCount >= LIMITS.minPlayers && hasQuestionAvailable(s, deck),
    missingPlayers: Math.max(0, LIMITS.minPlayers - connectedCount),
    round: round
      ? {
          number: round.number,
          type: round.question.type,
          text: round.question.text,
          fromPlayer: round.question.fromPlayer,
          participantIds: round.participants.map((p) => p.id),
          answeredCount: Object.keys(round.answers).length,
          participantCount: round.participants.length,
          deadline: round.deadline,
        }
      : null,
    reveal: s.reveal
      ? {
          number: s.reveal.number,
          type: s.reveal.question.type,
          text: s.reveal.question.text,
          fromPlayer: s.reveal.question.fromPlayer,
          result: s.reveal.result,
          deadline: s.reveal.deadline,
        }
      : null,
    endDeadline: s.endDeadline,
    queueCount: s.queue.length,
    notice: s.notice,
    you: {
      id: me?.id ?? "",
      isHost,
      spectator: s.phase === "question" && !participantSet.has(deviceId),
      answer: round?.answers[deviceId] ?? null,
      pendingQuestions: s.queue.filter((q) => q.authorDeviceId === deviceId).length,
    },
    hostQueue: isHost ? s.queue.map((q) => ({ id: q.id, type: q.type, text: q.text })) : null,
  };
}

