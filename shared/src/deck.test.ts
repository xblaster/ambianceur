import { DECK } from "./deck";
import { CATEGORIES, LIMITS } from "./protocol";

describe("paquet de questions intégré", () => {
  it("respecte le schéma", () => {
    const ids = new Set<string>();
    for (const q of DECK) {
      expect(q.id).toMatch(/^[a-z]+-\d{2}$/);
      expect(CATEGORIES).toContain(q.category);
      expect(["vote", "yesno"]).toContain(q.type);
      expect(q.text.length).toBeGreaterThanOrEqual(LIMITS.questionMin);
      expect(q.text.length).toBeLessThanOrEqual(LIMITS.questionMax);
      expect(q.text.trim().endsWith("?")).toBe(true);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
    }
  });

  it("propose au moins 30 questions par catégorie, avec les deux types", () => {
    for (const c of CATEGORIES) {
      const inCategory = DECK.filter((q) => q.category === c);
      expect(inCategory.length).toBeGreaterThanOrEqual(30);
      expect(inCategory.some((q) => q.type === "vote")).toBe(true);
      expect(inCategory.some((q) => q.type === "yesno")).toBe(true);
    }
  });
});
