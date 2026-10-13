import { normalizePseudo, normalizeQuestionText, parseClientMessage, parseProfile } from "./validate";

describe("normalizePseudo", () => {
  it("accepte et nettoie un pseudo valide", () => {
    expect(normalizePseudo("  Paul   le   Grand ")).toBe("Paul le Grand");
    expect(normalizePseudo("a".repeat(20))).toBe("a".repeat(20));
  });

  it("refuse vide, espaces seuls, trop long ou non-texte", () => {
    expect(normalizePseudo("")).toBeNull();
    expect(normalizePseudo("    ")).toBeNull();
    expect(normalizePseudo("a".repeat(21))).toBeNull();
    expect(normalizePseudo(42)).toBeNull();
  });

  it("compte les emojis comme un caractère", () => {
    expect(normalizePseudo("🎉".repeat(20))).not.toBeNull();
  });
});

describe("parseProfile", () => {
  it("exige un deviceId plausible", () => {
    expect(parseProfile({ deviceId: "0f8c2c1e-6a43-4b44-9c1f-0d6c1b3c7a11", pseudo: "Léa", avatar: "🦊" })).toEqual({
      deviceId: "0f8c2c1e-6a43-4b44-9c1f-0d6c1b3c7a11",
      pseudo: "Léa",
      avatar: "🦊",
    });
    expect(parseProfile({ deviceId: "x", pseudo: "Léa", avatar: "🦊" })).toBeNull();
    expect(parseProfile({ deviceId: "0f8c2c1e-6a43", pseudo: "", avatar: "🦊" })).toBeNull();
    expect(parseProfile({ deviceId: "0f8c2c1e-6a43", pseudo: "Léa", avatar: "" })).toBeNull();
  });
});

describe("normalizeQuestionText", () => {
  it("borne la longueur entre 5 et 140 caractères", () => {
    expect(normalizeQuestionText("Qui ?")).toBe("Qui ?");
    expect(normalizeQuestionText("Qui")).toBeNull();
    expect(normalizeQuestionText("x".repeat(140))).not.toBeNull();
    expect(normalizeQuestionText("x".repeat(141))).toBeNull();
  });
});

describe("parseClientMessage", () => {
  const ok = (m: unknown) => parseClientMessage(JSON.stringify(m));

  it("accepte les messages connus", () => {
    expect(ok({ type: "start" })).toEqual({ type: "start" });
    expect(ok({ type: "answer", answer: { kind: "yesno", yes: true } })).toEqual({
      type: "answer",
      answer: { kind: "yesno", yes: true },
    });
    expect(ok({ type: "answer", answer: { kind: "vote", playerId: "p1" } })).toEqual({
      type: "answer",
      answer: { kind: "vote", playerId: "p1" },
    });
    expect(ok({ type: "setCategory", category: "coquin", enabled: true })).toEqual({
      type: "setCategory",
      category: "coquin",
      enabled: true,
    });
    expect(ok({ type: "submitQuestion", questionType: "vote", text: "Qui ronfle ?" })).toEqual({
      type: "submitQuestion",
      questionType: "vote",
      text: "Qui ronfle ?",
    });
    expect(ok({ type: "kick", playerId: "p2" })).toEqual({ type: "kick", playerId: "p2" });
  });

  it("ignore les champs en trop", () => {
    expect(ok({ type: "skip", extra: 1 })).toEqual({ type: "skip" });
  });

  it("rejette les messages invalides", () => {
    expect(parseClientMessage("pas du json")).toBeNull();
    expect(parseClientMessage("null")).toBeNull();
    expect(ok({ type: "inconnu" })).toBeNull();
    expect(ok({ type: "answer", answer: { kind: "yesno", yes: "oui" } })).toBeNull();
    expect(ok({ type: "answer", answer: { kind: "vote" } })).toBeNull();
    expect(ok({ type: "setCategory", category: "gore", enabled: true })).toBeNull();
    expect(ok({ type: "submitQuestion", questionType: "qcm", text: "Hello ?" })).toBeNull();
    expect(ok({ type: "kick", playerId: "" })).toBeNull();
    expect(parseClientMessage("x".repeat(3_000))).toBeNull();
  });
});
