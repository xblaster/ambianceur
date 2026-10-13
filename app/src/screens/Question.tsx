import { DURATIONS, type Answer } from "@ambianceur/shared";
import { Countdown } from "../components/Countdown";
import { HostControls } from "../components/HostControls";
import { Icon } from "../components/Icon";
import { PlayerChip } from "../components/PlayerChip";
import { Stamp } from "../components/Stamp";
import type { RoomActions } from "./Room";

export function QuestionScreen(props: RoomActions) {
  const { state, send, clockOffset, openPropose } = props;
  const round = state.round!;
  const mine = state.you.answer;
  const answer = (a: Answer) => send({ type: "answer", answer: a });
  const participants = round.participantIds
    .map((id) => state.players.find((p) => p.id === id))
    .filter((p) => p !== undefined);

  return (
    <main className="screen question">
      <div className="round-meta">
        <span className="round-number">N°{String(round.number).padStart(2, "0")}</span>
        {round.fromPlayer && <span className="badge">Question d'un joueur</span>}
      </div>
      <Countdown deadline={round.deadline} total={DURATIONS.answerMs} clockOffset={clockOffset} />
      <h1 className="question-text">{round.text}</h1>

      {state.you.spectator ? (
        <p className="spectator">Tu joues à la prochaine ! Regarde les autres répondre.</p>
      ) : round.type === "vote" ? (
        <div className="vote-grid" role="radiogroup" aria-label="Choisis un joueur">
          {participants.map((p) => {
            const selected = mine?.kind === "vote" && mine.playerId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`vote-option ${selected ? "selected" : ""}`}
                onClick={() => answer({ kind: "vote", playerId: p.id })}
              >
                <Stamp avatar={p.avatar} id={p.id} size="md" />
                <span className="vote-name">
                  {p.pseudo}
                  {p.id === state.you.id && " (toi)"}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="yesno" role="radiogroup" aria-label="Ta réponse">
          {[true, false].map((yes) => {
            const selected = mine?.kind === "yesno" && mine.yes === yes;
            return (
              <button
                key={String(yes)}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`yesno-option ${yes ? "yes" : "no"} ${selected ? "selected" : ""}`}
                onClick={() => answer({ kind: "yesno", yes })}
              >
                {yes ? "Oui" : "Non"}
              </button>
            );
          })}
        </div>
      )}

      {mine && (
        <p className="hint secret">
          <Icon name="lock" size={16} /> Réponse enregistrée en secret. Tu peux encore changer d'avis.
        </p>
      )}

      <section className="progress" aria-live="polite">
        <p className="progress-count">
          {round.answeredCount}/{round.participantCount} ont répondu
        </p>
        <ul className="progress-avatars">
          {participants.map((p) => (
            <li key={p.id}>
              <PlayerChip player={p} compact you={p.id === state.you.id} />
            </li>
          ))}
        </ul>
      </section>

      <div className="actions-bottom">
        <button type="button" className="btn btn-ghost btn-small" onClick={openPropose}>
          <Icon name="pen" /> Proposer une question
        </button>
        <HostControls {...props} />
      </div>
    </main>
  );
}
