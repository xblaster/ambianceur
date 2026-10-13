// Protocole partagé entre l'app et le serveur (design D6/D7).

export const CATEGORIES = ["soft", "fun", "perso", "coquin"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  soft: "Soft",
  fun: "Fun",
  perso: "Perso",
  coquin: "Coquin",
};

export type QuestionType = "vote" | "yesno";

export interface Question {
  id: string;
  category: Category;
  type: QuestionType;
  text: string;
}

export type Phase = "lobby" | "question" | "reveal" | "end";

export const LIMITS = {
  pseudoMax: 20,
  avatarMax: 16,
  deviceIdMax: 64,
  questionMin: 5,
  questionMax: 140,
  pendingPerPlayer: 3,
  maxPlayers: 30,
  minPlayers: 3,
} as const;

export const DURATIONS = {
  answerMs: 30_000,
  revealMs: 8_000,
  endMs: 5_000,
  disconnectGraceMs: 30_000,
  emptyRoomMs: 10 * 60_000,
} as const;

// Code de salle : 4 lettres majuscules, sans I ni O.
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z]{4}$/;

export type Answer = { kind: "vote"; playerId: string } | { kind: "yesno"; yes: boolean };

// ---------- Client -> serveur ----------
// L'identité (deviceId, pseudo, avatar) est transmise dans la query string de la connexion.

export type ClientMessage =
  | { type: "updateProfile"; pseudo: string; avatar: string }
  | { type: "setCategory"; category: Category; enabled: boolean }
  | { type: "start" }
  | { type: "answer"; answer: Answer }
  | { type: "submitQuestion"; questionType: QuestionType; text: string }
  | { type: "removeQuestion"; questionId: string }
  | { type: "forceReveal" }
  | { type: "skip" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "kick"; playerId: string }
  | { type: "stop" };

// ---------- Serveur -> client ----------

export interface PublicPlayer {
  id: string;
  pseudo: string;
  avatar: string;
  isHost: boolean;
  connected: boolean;
  /** A répondu à la manche en cours (jamais le contenu de la réponse). */
  answered: boolean;
  /** Arrivé pendant la manche : ne participe qu'à la suivante. */
  spectator: boolean;
}

export interface PublicRound {
  number: number;
  type: QuestionType;
  text: string;
  fromPlayer: boolean;
  participantIds: string[];
  answeredCount: number;
  participantCount: number;
  deadline: number;
}

export type RevealResult =
  | {
      kind: "vote";
      /** Classement des joueurs désignés, du plus de voix au moins. */
      ranking: { playerId: string; pseudo: string; avatar: string; votes: number }[];
      winnerIds: string[];
      total: number;
      noAnswer: number;
    }
  | { kind: "yesno"; yes: number; total: number; noAnswer: number }
  | { kind: "insufficient"; total: number };

export interface PublicReveal {
  number: number;
  type: QuestionType;
  text: string;
  fromPlayer: boolean;
  result: RevealResult;
  /** null quand la partie est en pause. */
  deadline: number | null;
}

export type Notice = "host_changed" | "round_cancelled" | "no_more_questions";

export interface PublicState {
  code: string;
  phase: Phase;
  paused: boolean;
  serverNow: number;
  players: PublicPlayer[];
  categories: Record<Category, boolean>;
  canStart: boolean;
  missingPlayers: number;
  round: PublicRound | null;
  reveal: PublicReveal | null;
  endDeadline: number | null;
  queueCount: number;
  notice: { kind: Notice; at: number } | null;
  you: {
    id: string;
    isHost: boolean;
    spectator: boolean;
    answer: Answer | null;
    pendingQuestions: number;
  };
  /** Questions de joueurs en attente, visibles par l'hôte seulement (sans auteur). */
  hostQueue: { id: string; type: QuestionType; text: string }[] | null;
}

export type ErrorCode =
  | "not_found"
  | "full"
  | "kicked"
  | "invalid_profile"
  | "invalid_message"
  | "forbidden"
  | "not_enough_players"
  | "no_questions"
  | "too_many_questions"
  | "invalid_question"
  | "wrong_phase";

export type ServerMessage =
  | { type: "state"; state: PublicState }
  | { type: "error"; code: ErrorCode; message: string }
  | { type: "kicked" }
  | { type: "gone"; reason: "not_found" | "closed" };

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  not_found: "Partie introuvable",
  full: "Partie complète",
  kicked: "Tu as été exclu de cette partie",
  invalid_profile: "Pseudo invalide (1 à 20 caractères)",
  invalid_message: "Message invalide",
  forbidden: "Seul l'hôte peut faire ça",
  not_enough_players: "Il faut au moins 3 joueurs",
  no_questions: "Aucune question disponible",
  too_many_questions: "Tu as déjà 3 questions en attente",
  invalid_question: "La question doit faire entre 5 et 140 caractères",
  wrong_phase: "Pas possible maintenant",
};
