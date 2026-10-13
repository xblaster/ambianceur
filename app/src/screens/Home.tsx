import { useState, type FormEvent } from "react";
import { ROOM_CODE_PATTERN } from "@ambianceur/shared";
import { ProfileForm } from "../components/ProfileForm";
import { Stamp } from "../components/Stamp";
import { Help, HelpButton } from "../components/Help";
import { createRoom, roomExists } from "../lib/api";
import { useOnline } from "../lib/hooks";
import type { StoredProfile } from "../lib/profile";
import { navigate } from "../lib/router";

interface Props {
  profile: StoredProfile | null;
  onProfileChange: (pseudo: string, avatar: string) => void;
  flash: string | null;
}

export function Home({ profile, onProfileChange, flash }: Props) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(flash);
  const [help, setHelp] = useState(false);
  const online = useOnline();

  const create = async () => {
    setBusy(true);
    setMessage(null);
    try {
      navigate(`/r/${await createRoom()}`);
    } catch {
      setMessage("Impossible de créer la partie. Vérifie ta connexion.");
    } finally {
      setBusy(false);
    }
  };

  const join = async (e: FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!ROOM_CODE_PATTERN.test(clean)) {
      setMessage("Le code fait 4 lettres.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (await roomExists(clean)) navigate(`/r/${clean}`);
      else setMessage("Partie introuvable");
    } catch {
      setMessage("Impossible de vérifier le code. Vérifie ta connexion.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen home">
      <header className="brand">
        <h1 className="wordmark" data-text="Ambianceur">
          Ambianceur
        </h1>
        <p className="tagline">Les questions qui révèlent ceux qui t'entourent.</p>
      </header>

      {message && (
        <p className="banner" role="status">
          {message}
        </p>
      )}
      {!online && (
        <p className="banner banner-warn" role="status">
          Pas de réseau : la connexion est nécessaire pour rejoindre une partie.
        </p>
      )}

      {!profile || editing ? (
        <ProfileForm
          initialPseudo={profile?.pseudo}
          initialAvatar={profile?.avatar}
          submitLabel={profile ? "Enregistrer" : "C'est parti"}
          onSubmit={(pseudo, avatar) => {
            onProfileChange(pseudo, avatar);
            setEditing(false);
          }}
          onCancel={profile ? () => setEditing(false) : undefined}
        />
      ) : (
        <>
          <section className="me">
            <Stamp avatar={profile.avatar} id={profile.deviceId} size="md" />
            <span className="me-pseudo">{profile.pseudo}</span>
            <button type="button" className="btn btn-ghost btn-small" onClick={() => setEditing(true)}>
              Modifier
            </button>
          </section>

          <button type="button" className="btn btn-primary btn-xl" onClick={create} disabled={busy || !online}>
            Créer une partie
          </button>

          <form className="join" onSubmit={join}>
            <label className="field">
              <span>Rejoindre avec un code</span>
              <input
                className="code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="ABCD"
                aria-label="Code de la partie"
              />
            </label>
            <button type="submit" className="btn btn-secondary" disabled={busy || code.length !== 4 || !online}>
              Rejoindre
            </button>
          </form>
        </>
      )}

      <footer className="home-footer">
        <HelpButton onClick={() => setHelp(true)} />
      </footer>
      {help && <Help onClose={() => setHelp(false)} />}
    </main>
  );
}
