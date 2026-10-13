import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CATEGORIES, CATEGORY_LABELS, LIMITS } from "@ambianceur/shared";
import { HelpButton } from "../components/Help";
import { HostQueue } from "../components/HostQueue";
import { Icon } from "../components/Icon";
import { PlayerChip } from "../components/PlayerChip";
import { navigate, roomUrl } from "../lib/router";
import type { RoomActions } from "./Room";

export function Lobby({ state, send, openPropose, openHelp }: RoomActions) {
  const url = roomUrl(state.code);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isHost = state.you.isHost;
  // Le QR sert à faire entrer les premiers joueurs ; ensuite il se replie pour laisser la place.
  const enough = state.players.length >= LIMITS.minPlayers;
  const [qrChoice, setQrChoice] = useState<boolean | null>(null);
  const showQr = qrChoice ?? !enough;

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: "#171a3a", light: "#f4f0e6" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  const invite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ambianceur", text: `Rejoins ma partie (code ${state.code}) !`, url });
      } catch {
        // partage annulé
      }
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
  };

  const kick = (id: string, pseudo: string) => {
    if (window.confirm(`Exclure ${pseudo} de la partie ?`)) send({ type: "kick", playerId: id });
  };

  const enabled = CATEGORIES.filter((c) => state.categories[c]).map((c) => CATEGORY_LABELS[c]);

  return (
    <main className="screen lobby">
      <header className="topbar">
        <button type="button" className="btn btn-ghost btn-small" onClick={() => navigate("/")}>
          <Icon name="back" /> Quitter
        </button>
        <HelpButton onClick={openHelp} />
      </header>

      <section className="invite" aria-label="Inviter des joueurs">
        <p className="room-code" aria-label={`Code de la partie : ${state.code.split("").join(" ")}`}>
          {state.code}
        </p>
        <p className="invite-hint">Code à taper sur l'accueil, ou QR à scanner.</p>
        {showQr && qr && <img className="qr" src={qr} alt={`QR code pour rejoindre la partie ${state.code}`} />}
        <div className="invite-actions">
          <button type="button" className="btn btn-secondary" onClick={invite}>
            <Icon name="share" /> {copied ? "Lien copié !" : "Inviter"}
          </button>
          <button type="button" className="btn btn-secondary" aria-expanded={showQr} onClick={() => setQrChoice(!showQr)}>
            <Icon name="qr" /> {showQr ? "Masquer le QR" : "Montrer le QR"}
          </button>
        </div>
      </section>

      {state.categories.coquin && <p className="badge badge-hot">Questions coquines au programme (adultes)</p>}

      <section className="block">
        <h2>
          Joueurs <span className="count">{state.players.length}</span>
        </h2>
        <ul className="player-list">
          {state.players.map((p) => (
            <li key={p.id} className={p.connected ? "" : "offline"}>
              <PlayerChip player={p} you={p.id === state.you.id} />
              {isHost && p.id !== state.you.id && (
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={`Exclure ${p.pseudo}`}
                  onClick={() => kick(p.id, p.pseudo)}
                >
                  <Icon name="close" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="block">
        <h2>Catégories</h2>
        {isHost ? (
          <div className="categories">
            {CATEGORIES.map((c) => (
              <label key={c} className={`category ${state.categories[c] ? "on" : ""} ${c === "coquin" ? "hot" : ""}`}>
                <input
                  type="checkbox"
                  checked={state.categories[c]}
                  onChange={(e) => send({ type: "setCategory", category: c, enabled: e.target.checked })}
                />
                {CATEGORY_LABELS[c]}
              </label>
            ))}
          </div>
        ) : (
          <p className="categories-summary">
            Au programme : <strong>{enabled.length > 0 ? enabled.join(" · ") : "aucune catégorie"}</strong>
            <span className="hint"> (l'hôte choisit)</span>
          </p>
        )}
      </section>

      {isHost && <HostQueue state={state} send={send} />}

      <div className={`actions-bottom ${isHost ? "dock" : ""}`}>
        <button type="button" className="btn btn-ghost" onClick={openPropose}>
          <Icon name="pen" /> Proposer une question
        </button>
        {isHost ? (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={!state.canStart}
            onClick={() => send({ type: "start" })}
          >
            {state.missingPlayers > 0
              ? `Encore ${state.missingPlayers} joueur${state.missingPlayers > 1 ? "s" : ""}…`
              : state.canStart
                ? "Lancer la partie"
                : "Aucune question disponible"}
          </button>
        ) : (
          <p className="waiting">En attente du lancement par l'hôte…</p>
        )}
      </div>
    </main>
  );
}
