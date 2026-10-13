import { useSyncExternalStore } from "react";

// Routage minimal : "/" (accueil) et "/r/:code" (salle).

const listeners = new Set<() => void>();
let flash: string | null = null;

function subscribe(listener: () => void) {
  const onPop = () => {
    flash = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("popstate", onPop);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", onPop);
  };
}

export function navigate(path: string, message?: string) {
  flash = message ?? null;
  if (window.location.pathname !== path) window.history.pushState(null, "", path);
  for (const l of listeners) l();
}

/** Message à afficher sur l'écran atteint par la dernière navigation (ex. « Cette partie est terminée »). */
export function getFlash(): string | null {
  return flash;
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

export function roomCodeFromPath(path: string): string | null {
  const match = path.match(/^\/r\/([A-Za-z]{4})\/?$/);
  return match ? match[1]!.toUpperCase() : null;
}

export const roomUrl = (code: string) => `${window.location.origin}/r/${code}`;
