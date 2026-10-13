import { useEffect, useState } from "react";
import type { PublicState } from "@ambianceur/shared";
import { ProfileForm } from "../components/ProfileForm";
import { Help } from "../components/Help";
import { ProposeQuestion } from "../components/ProposeQuestion";
import { Toasts } from "../components/Toasts";
import { useWakeLock } from "../lib/hooks";
import type { StoredProfile } from "../lib/profile";
import { navigate } from "../lib/router";
import { useRoom } from "../lib/useRoom";
import { Lobby } from "./Lobby";
import { QuestionScreen } from "./Question";
import { EndScreen, RevealScreen } from "./Reveal";

interface Props {
  code: string;
  profile: StoredProfile | null;
  onProfileChange: (pseudo: string, avatar: string) => void;
}

export function RoomPage({ code, profile, onProfileChange }: Props) {
  // Arrivée par lien sur un appareil sans profil : on demande juste le pseudo.
  if (!profile) {
    return (
      <main className="screen">
        <header className="brand brand-small">
          <h1 className="wordmark" data-text="Ambianceur">
            Ambianceur
          </h1>
          <p className="tagline">
            On t'attend dans la partie <strong>{code}</strong> !
          </p>
        </header>
        <ProfileForm submitLabel="Rejoindre la partie" onSubmit={onProfileChange} />
      </main>
    );
  }
  return <ConnectedRoom code={code} profile={profile} />;
}

export interface RoomActions {
  state: PublicState;
  send: ReturnType<typeof useRoom>["send"];
  clockOffset: number;
  openPropose: () => void;
  openHelp: () => void;
}

function ConnectedRoom({ code, profile }: { code: string; profile: StoredProfile }) {
  const { state, status, error, send, clockOffset } = useRoom(code, profile);
  const [propose, setPropose] = useState(false);
  const [help, setHelp] = useState(false);
  useWakeLock(true);

  useEffect(() => {
    if (status === "gone") navigate("/", "Cette partie est terminée");
    else if (status === "not_found") navigate("/", "Partie introuvable");
    else if (status === "kicked") navigate("/", "Tu as été exclu de cette partie");
    else if (status === "rejected") navigate("/", error?.message ?? "Impossible de rejoindre la partie");
  }, [status, error]);

  if (!state) {
    return (
      <main className="screen center">
        <p className="loading">{status === "reconnecting" ? "Reconnexion…" : "Connexion à la partie…"}</p>
      </main>
    );
  }

  const actions: RoomActions = {
    state,
    send,
    clockOffset,
    openPropose: () => setPropose(true),
    openHelp: () => setHelp(true),
  };

  return (
    <>
      {status === "reconnecting" && (
        <div className="reconnect-banner" role="status">
          Reconnexion…
        </div>
      )}
      {state.phase === "lobby" && <Lobby {...actions} />}
      {state.phase === "question" && <QuestionScreen {...actions} />}
      {state.phase === "reveal" && <RevealScreen {...actions} />}
      {state.phase === "end" && <EndScreen {...actions} />}
      <Toasts state={state} error={error} />
      {propose && <ProposeQuestion state={state} send={send} onClose={() => setPropose(false)} />}
      {help && <Help onClose={() => setHelp(false)} />}
    </>
  );
}
