import type { Question } from "./protocol";
import questions from "./questions.json";

/** Paquet de questions intégré (design D9). */
export const DECK: readonly Question[] = questions as Question[];
