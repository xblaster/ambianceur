import { useState, type FormEvent } from "react";
import { LIMITS, normalizePseudo } from "@ambianceur/shared";
import { AVATARS, getDeviceId, randomAvatar } from "../lib/profile";
import { Stamp } from "./Stamp";

interface Props {
  initialPseudo?: string;
  initialAvatar?: string;
  submitLabel: string;
  onSubmit: (pseudo: string, avatar: string) => void;
  onCancel?: () => void;
}

export function ProfileForm({ initialPseudo = "", initialAvatar, submitLabel, onSubmit, onCancel }: Props) {
  const [pseudo, setPseudo] = useState(initialPseudo);
  const [avatar, setAvatar] = useState(() => initialAvatar ?? randomAvatar());
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceId] = useState(getDeviceId);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = normalizePseudo(pseudo);
    if (!clean) {
      setError(`Ton pseudo doit faire entre 1 et ${LIMITS.pseudoMax} caractères.`);
      return;
    }
    onSubmit(clean, avatar);
  };

  return (
    <form className="profile-form" onSubmit={submit} noValidate>
      <button
        type="button"
        className="avatar-button"
        aria-label={`Avatar ${avatar}, toucher pour changer`}
        aria-expanded={picking}
        onClick={() => setPicking((p) => !p)}
      >
        <Stamp avatar={avatar} id={deviceId} size="lg" />
        <span className="avatar-hint">{picking ? "Choisis" : "Changer"}</span>
      </button>
      {picking && (
        <div className="avatar-grid" role="listbox" aria-label="Choisis ton avatar">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              role="option"
              aria-selected={a === avatar}
              className={a === avatar ? "selected" : ""}
              onClick={() => {
                setAvatar(a);
                setPicking(false);
              }}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <label className="field">
        <span>Ton pseudo</span>
        <input
          value={pseudo}
          onChange={(e) => {
            setPseudo(e.target.value);
            setError(null);
          }}
          maxLength={LIMITS.pseudoMax + 10}
          autoComplete="nickname"
          placeholder="Ex. Paulo"
          autoFocus={!initialPseudo}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary">
        {submitLabel}
      </button>
      {onCancel && (
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Annuler
        </button>
      )}
    </form>
  );
}
