import { useRemaining } from "../lib/hooks";

interface Props {
  deadline: number;
  total: number;
  clockOffset: number;
  label?: string;
}

export function Countdown({ deadline, total, clockOffset, label }: Props) {
  const remaining = useRemaining(deadline, clockOffset) ?? 0;
  const seconds = Math.ceil(remaining / 1000);
  const ratio = Math.min(1, remaining / total);
  return (
    <div className={`countdown ${seconds <= 5 ? "urgent" : ""}`} role="timer" aria-label={`${seconds} secondes`}>
      <div className="countdown-track">
        <div className="countdown-bar" style={{ transform: `scaleX(${ratio})` }} />
      </div>
      <span className="countdown-text">
        {label ? `${label} ` : ""}
        {seconds} s
      </span>
    </div>
  );
}
