import { useEffect, useState, type FormEvent } from "react";
import { LIMITS, normalizeQuestionText, type ClientMessage, type PublicState, type QuestionType } from "@ambianceur/shared";

interface Props {
  state: PublicState;
  send: (m: ClientMessage) => void;
  onClose: () => void;
}

export function ProposeQuestion({ state, send, onClose }: Props) {
  const [type, setType] = useState<QuestionType>("vote");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = state.you.pendingQuestions;
  const full = pending >= LIMITS.pendingPerPlayer;
  const length = [...text.trim()].length;

  useEffect(() => {
    if (!sent) return;
    const id = setTimeout(() => setSent(false), 2_500);
    return () => clearTimeout(id);
  }, [sent]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = normalizeQuestionText(text);
    if (!clean) {
      setError(`Entre ${LIMITS.questionMin} et ${LIMITS.questionMax} caractères.`);
      return;
    }
    send({ type: "submitQuestion", questionType: type, text: clean });
    setText("");
    setError(null);
    setSent(true);
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Proposer une question" onClick={(e) => e.stopPropagation()}>
        <h2>Proposer une question</h2>
        <p className="hint">Elle sera posée sans ton nom.</p>
        <form onSubmit={submit} className="propose-form" noValidate>
          <div className="segmented" role="radiogroup" aria-label="Type de question">
            <button type="button" role="radio" aria-checked={type === "vote"} className={type === "vote" ? "on" : ""} onClick={() => setType("vote")}>
              Qui de nous… ?
            </button>
            <button type="button" role="radio" aria-checked={type === "yesno"} className={type === "yesno" ? "on" : ""} onClick={() => setType("yesno")}>
              Est-ce que tu… ? (oui/non)
            </button>
          </div>
          <label className="field">
            <span>Ta question</span>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              rows={3}
              placeholder={type === "vote" ? "Qui serait le premier à…" : "As-tu déjà…"}
              disabled={full}
            />
          </label>
          <p className={`counter ${length > LIMITS.questionMax ? "over" : ""}`}>
            {length}/{LIMITS.questionMax}
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {sent && (
            <p className="form-ok" role="status">
              Question envoyée ✓
            </p>
          )}
          <p className="hint">
            {pending}/{LIMITS.pendingPerPlayer} questions en attente
            {full && " : attends qu'une de tes questions soit jouée."}
          </p>
          <button type="submit" className="btn btn-primary" disabled={full}>
            Envoyer
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </form>
      </section>
    </div>
  );
}
