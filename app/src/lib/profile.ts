import { useCallback, useState } from "react";

export interface StoredProfile {
  deviceId: string;
  pseudo: string;
  avatar: string;
}

const KEY = "ambianceur.profile";

export const AVATARS = [
  "🦊", "🐼", "🐸", "🦄", "🐙", "🦁", "🐯", "🐨", "🐵", "🦉", "🐧", "🐢",
  "🦖", "🐳", "🦩", "🐝", "🍕", "🌵", "👽", "🤖", "👻", "🎃", "🍄", "🌈",
];

export const randomAvatar = () => AVATARS[Math.floor(Math.random() * AVATARS.length)]!;

function newDeviceId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Identifiant d'appareil : généré une seule fois, conservé même sans pseudo. */
export function getDeviceId(): string {
  const stored = loadProfile();
  if (stored) return stored.deviceId;
  const pending = localStorage.getItem(`${KEY}.deviceId`);
  if (pending) return pending;
  const id = newDeviceId();
  localStorage.setItem(`${KEY}.deviceId`, id);
  return id;
}

export function loadProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredProfile>;
    if (typeof p.deviceId === "string" && typeof p.pseudo === "string" && typeof p.avatar === "string") {
      return { deviceId: p.deviceId, pseudo: p.pseudo, avatar: p.avatar };
    }
  } catch {
    // profil corrompu : on repart de zéro
  }
  return null;
}

export function saveProfile(pseudo: string, avatar: string): StoredProfile {
  const profile = { deviceId: getDeviceId(), pseudo, avatar };
  localStorage.setItem(KEY, JSON.stringify(profile));
  return profile;
}

export function useProfile() {
  const [profile, setProfile] = useState<StoredProfile | null>(loadProfile);
  const update = useCallback((pseudo: string, avatar: string) => setProfile(saveProfile(pseudo, avatar)), []);
  return [profile, update] as const;
}
