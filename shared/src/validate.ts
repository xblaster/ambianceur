import { CATEGORIES, LIMITS, type Answer, type Category, type ClientMessage, type QuestionType } from "./protocol";

export interface Profile {
  deviceId: string;
  pseudo: string;
  avatar: string;
}

/** Normalise un pseudo (espaces) ; renvoie null s'il est invalide. */
export function normalizePseudo(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const pseudo = raw.trim().replace(/\s+/g, " ");
  if (pseudo.length === 0 || [...pseudo].length > LIMITS.pseudoMax) return null;
  return pseudo;
}

export function normalizeAvatar(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const avatar = raw.trim();
  if (avatar.length === 0 || avatar.length > LIMITS.avatarMax) return null;
  return avatar;
}

export function isDeviceId(raw: unknown): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9-]{8,64}$/.test(raw);
}

export function parseProfile(raw: { deviceId?: unknown; pseudo?: unknown; avatar?: unknown }): Profile | null {
  const pseudo = normalizePseudo(raw.pseudo);
  const avatar = normalizeAvatar(raw.avatar);
  if (!isDeviceId(raw.deviceId) || !pseudo || !avatar) return null;
  return { deviceId: raw.deviceId, pseudo, avatar };
}

/** Normalise le texte d'une question proposée ; null s'il est hors limites. */
export function normalizeQuestionText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim().replace(/\s+/g, " ");
  const length = [...text].length;
  if (length < LIMITS.questionMin || length > LIMITS.questionMax) return null;
  return text;
}

const isCategory = (v: unknown): v is Category => CATEGORIES.includes(v as Category);
const isQuestionType = (v: unknown): v is QuestionType => v === "vote" || v === "yesno";
const isShortString = (v: unknown, max = 64): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

function parseAnswer(raw: unknown): Answer | null {
  if (typeof raw !== "object" || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (a.kind === "vote" && isShortString(a.playerId)) return { kind: "vote", playerId: a.playerId };
  if (a.kind === "yesno" && typeof a.yes === "boolean") return { kind: "yesno", yes: a.yes };
  return null;
}

/**
 * Valide un message brut reçu d'un client. Renvoie null pour tout message mal formé.
 * Les contraintes métier (longueur des questions, droits de l'hôte…) sont vérifiées par la logique de jeu.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > 2_000) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  switch (m.type) {
    case "start":
    case "forceReveal":
    case "skip":
    case "pause":
    case "resume":
    case "stop":
      return { type: m.type };
    case "updateProfile":
      return typeof m.pseudo === "string" && typeof m.avatar === "string"
        ? { type: "updateProfile", pseudo: m.pseudo, avatar: m.avatar }
        : null;
    case "setCategory":
      return isCategory(m.category) && typeof m.enabled === "boolean"
        ? { type: "setCategory", category: m.category, enabled: m.enabled }
        : null;
    case "answer": {
      const answer = parseAnswer(m.answer);
      return answer ? { type: "answer", answer } : null;
    }
    case "submitQuestion":
      return isQuestionType(m.questionType) && typeof m.text === "string" && m.text.length <= 1_000
        ? { type: "submitQuestion", questionType: m.questionType, text: m.text }
        : null;
    case "removeQuestion":
      return isShortString(m.questionId) ? { type: "removeQuestion", questionId: m.questionId } : null;
    case "kick":
      return isShortString(m.playerId) ? { type: "kick", playerId: m.playerId } : null;
    default:
      return null;
  }
}
