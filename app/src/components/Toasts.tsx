import { useEffect, useState } from "react";
import type { PublicState } from "@ambianceur/shared";
import type { RoomError } from "../lib/useRoom";

const VISIBLE_MS = 3_500;

/** Notifications éphémères : changement d'hôte, manche annulée, erreurs serveur. */
export function Toasts({ state, error }: { state: PublicState; error: RoomError | null }) {
  const [items, setItems] = useState<{ key: string; text: string }[]>([]);

  const push = (key: string, text: string) => {
    setItems((list) => (list.some((i) => i.key === key) ? list : [...list, { key, text }]));
    setTimeout(() => setItems((list) => list.filter((i) => i.key !== key)), VISIBLE_MS);
  };

  const notice = state.notice;
  useEffect(() => {
    if (!notice || Date.now() - notice.at > 60_000) return;
    if (notice.kind === "host_changed") {
      const host = state.players.find((p) => p.isHost);
      push(`n${notice.at}`, host ? `${host.pseudo} est maintenant l'hôte` : "Nouvel hôte");
    } else if (notice.kind === "round_cancelled") {
      push(`n${notice.at}`, "Manche annulée : il faut au moins 3 joueurs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.at, notice?.kind]);

  useEffect(() => {
    if (error) push(`e${error.at}`, error.message);
  }, [error]);

  if (items.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((i) => (
        <p key={i.key} className="toast">
          {i.text}
        </p>
      ))}
    </div>
  );
}
