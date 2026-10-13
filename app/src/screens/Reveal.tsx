import { useEffect, type CSSProperties } from "react";
import { DURATIONS } from "@ambianceur/shared";
import { Countdown } from "../components/Countdown";
import { HostControls } from "../components/HostControls";
import { Icon } from "../components/Icon";
import { Stamp } from "../components/Stamp";
import type { RoomActions } from "./Room";

/** Instant où les deux passes d'encre se recalent (après « Et c'est… »). */
const REGISTER_MS = 800;

/** Tous les téléphones vibrent au même moment : la pièce entière lève la tête. */
function useRevealBuzz(key: number) {
  useEffect(() => {
    if (!("vibrate" in navigator)) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => navigator.vibrate([40, 60, 120]), REGISTER_MS);
    return () => clearTimeout(id);
  }, [key]);
}

/** Texte imprimé en deux passes : jaune dessus, rose décalée dessous (ombre de texte sans flou). */
function Overprint({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`overprint ${className}`} style={{ "--chars": [...text].length } as CSSProperties}>
      {text}
    </span>
  );
}

export function RevealScreen(props: RoomActions) {
  const { state, clockOffset } = props;
  const reveal = state.reveal!;
  const result = reveal.result;
  useRevealBuzz(reveal.number);

  return (
    <main className="screen reveal" key={reveal.number}>
      <div className="round-meta">
        <span className="round-number">N°{String(reveal.number).padStart(2, "0")}</span>
        {reveal.fromPlayer && <span className="badge">Question d'un joueur</span>}
      </div>
      <p className="reveal-question">{reveal.text}</p>

      {result.kind === "vote" && (
        <section className="reveal-result">
          {result.ranking.length === 0 ? (
            <p className="big">Personne n'a voté !</p>
          ) : (
            <>
              <p className="suspense">{result.winnerIds.length > 1 ? "Ex aequo !" : "Et c'est…"}</p>
              <div className={`winners ${result.winnerIds.length > 1 ? "tie" : ""}`}>
                {result.ranking
                  .filter((r) => result.winnerIds.includes(r.playerId))
                  .map((r) => (
                    <div key={r.playerId} className="winner">
                      <Stamp avatar={r.avatar} id={r.playerId} size="xl" />
                      <Overprint text={r.pseudo} className="winner-name" />
                      <span className="plate winner-votes">{r.votes} voix</span>
                    </div>
                  ))}
              </div>
              <ol className="ranking">
                {result.ranking
                  .filter((r) => !result.winnerIds.includes(r.playerId))
                  .map((r) => (
                    <li key={r.playerId}>
                      <Stamp avatar={r.avatar} id={r.playerId} />
                      <span className="ranking-name">{r.pseudo}</span>
                      <span className="votes">{r.votes}</span>
                    </li>
                  ))}
              </ol>
            </>
          )}
          {result.noAnswer > 0 && <p className="hint">{result.noAnswer} sans réponse</p>}
        </section>
      )}

      {result.kind === "yesno" && (
        <section className="reveal-result yesno-result">
          <p className="big-number">
            <Overprint text={String(result.yes)} />
            <span className="big-unit">{result.yes > 1 ? "personnes" : "personne"}</span>
          </p>
          <p className="plate big-sub">sur {result.total} ont répondu « oui »</p>
          <div className="meter" aria-hidden>
            <div className="meter-fill" style={{ width: `${result.total ? (result.yes / result.total) * 100 : 0}%` }} />
          </div>
          {result.noAnswer > 0 && <p className="hint">{result.noAnswer} sans réponse</p>}
        </section>
      )}

      {result.kind === "insufficient" && (
        <section className="reveal-result">
          <p className="big">Pas assez de réponses</p>
          <p className="hint">Il en faut au moins 3 pour garder l'anonymat.</p>
        </section>
      )}

      {reveal.deadline !== null ? (
        <Countdown deadline={reveal.deadline} total={DURATIONS.revealMs} clockOffset={clockOffset} label="Suite dans" />
      ) : (
        <p className="paused">
          <Icon name="pause" size={18} /> En pause
        </p>
      )}

      <div className="actions-bottom">
        <HostControls {...props} />
      </div>
    </main>
  );
}

export function EndScreen({ state }: RoomActions) {
  const noMore = state.notice?.kind === "no_more_questions";
  return (
    <main className="screen center end">
      <h1 className="end-title">
        <Overprint text="Fin de partie !" />
      </h1>
      <p>{noMore ? "Vous avez épuisé toutes les questions." : "Merci d'avoir joué."}</p>
      <p className="hint">Retour au lobby dans quelques secondes…</p>
    </main>
  );
}
