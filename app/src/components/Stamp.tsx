/** Encre d'un joueur, stable pour un identifiant donné. */
const INKS = ["pink", "lilac", "paper"] as const;
export type Ink = (typeof INKS)[number];

export function inkFor(id: string): Ink {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return INKS[h % INKS.length]!;
}

interface Props {
  avatar: string;
  id: string;
  size?: "sm" | "md" | "lg" | "xl";
  dim?: boolean;
}

/** Avatar du joueur, imprimé comme un tampon : cercle d'encre et motif au centre. */
export function Stamp({ avatar, id, size = "sm", dim }: Props) {
  return (
    <span className={`stamp stamp-${size} ink-${inkFor(id)} ${dim ? "dim" : ""}`} aria-hidden="true">
      <span className="stamp-face">{avatar}</span>
    </span>
  );
}
