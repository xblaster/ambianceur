import type { PublicPlayer } from "@ambianceur/shared";
import { Icon } from "./Icon";
import { Stamp } from "./Stamp";

interface Props {
  player: PublicPlayer;
  you?: boolean;
  compact?: boolean;
}

export function PlayerChip({ player, you, compact }: Props) {
  const status = [player.isHost && "hôte", !player.connected && "déconnecté", player.answered && "a répondu"]
    .filter(Boolean)
    .join(", ");
  return (
    <span
      className={`player-chip ${compact ? "compact" : ""} ${player.answered ? "answered" : ""} ${player.connected ? "" : "offline"}`}
      title={status || undefined}
    >
      <span className="chip-stamp">
        <Stamp avatar={player.avatar} id={player.id} dim={compact && !player.answered} />
        {player.answered && (
          <span className="check">
            <Icon name="check" size={12} />
          </span>
        )}
      </span>
      <span className="player-name">
        {player.pseudo}
        {you && <span className="you"> (toi)</span>}
        {status && <span className="visually-hidden"> ({status})</span>}
      </span>
      {!compact && player.isHost && <span className="badge badge-host">Hôte</span>}
    </span>
  );
}
