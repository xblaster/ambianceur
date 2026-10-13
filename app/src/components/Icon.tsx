/** Pictogrammes dessinés au trait (2 px, bouts carrés), dans l'esprit des filets imprimés. */
const PATHS = {
  close: "M6 6l12 12M18 6L6 18",
  pause: "M8 5v14M16 5v14",
  play: "M7 4.5v15L19 12z",
  pen: "M4 20l4-1 11-11-3-3L5 16l-1 4zM14 7l3 3",
  lock: "M6 11h12v9H6zM9 11V8a3 3 0 016 0v3",
  back: "M15 5l-7 7 7 7",
  share: "M12 4v11M7 9l5-5 5 5M5 14v6h14v-6",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2",
  check: "M5 12.5l4.5 4.5L19 7",
  stop: "M6 6h12v12H6z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const filled = name === "play";
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
