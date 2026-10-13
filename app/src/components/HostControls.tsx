import type { RoomActions } from "../screens/Room";
import { Icon } from "./Icon";

export function HostControls({ state, send }: RoomActions) {
  if (!state.you.isHost) return null;
  const inQuestion = state.phase === "question";
  return (
    <div className="host-controls" role="group" aria-label="Contrôles de l'hôte">
      {inQuestion && (
        <button type="button" className="btn btn-small btn-secondary" onClick={() => send({ type: "forceReveal" })}>
          Révéler
        </button>
      )}
      <button type="button" className={`btn btn-small ${inQuestion ? "btn-secondary" : "btn-plate"}`} onClick={() => send({ type: "skip" })}>
        {inQuestion ? "Passer" : "Suite"}
      </button>
      {state.paused ? (
        <button type="button" className="btn btn-small btn-secondary" onClick={() => send({ type: "resume" })}>
          <Icon name="play" size={16} /> Reprendre
        </button>
      ) : (
        <button type="button" className="btn btn-small btn-secondary" onClick={() => send({ type: "pause" })}>
          <Icon name="pause" size={16} /> Pause
        </button>
      )}
      <button
        type="button"
        className="btn btn-small btn-ghost"
        onClick={() => {
          if (window.confirm("Arrêter la partie pour tout le monde ?")) send({ type: "stop" });
        }}
      >
        Arrêter
      </button>
    </div>
  );
}
