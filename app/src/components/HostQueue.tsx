import type { ClientMessage, PublicState } from "@ambianceur/shared";
import { Icon } from "./Icon";

export function HostQueue({ state, send }: { state: PublicState; send: (m: ClientMessage) => void }) {
  const queue = state.hostQueue ?? [];
  return (
    <section className="block">
      <h2>
        Questions des joueurs <span className="count">{queue.length}</span>
      </h2>
      {queue.length === 0 ? (
        <p className="hint">Aucune question en attente.</p>
      ) : (
        <ul className="queue">
          {queue.map((q) => (
            <li key={q.id}>
              <span className="queue-type">{q.type === "vote" ? "Qui ?" : "Oui/Non"}</span>
              <span className="queue-text">{q.text}</span>
              <button
                type="button"
                className="btn-icon"
                aria-label={`Retirer la question « ${q.text} »`}
                onClick={() => send({ type: "removeQuestion", questionId: q.id })}
              >
                <Icon name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
