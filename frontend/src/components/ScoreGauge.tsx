import type { Level } from "../lib/api";

interface ScoreGaugeProps {
  score: number; // 0-100
  level: Level;
}

const LEVEL_COLORS: Record<Level, string> = {
  faible: "#ef4444", // rouge
  moyen: "#f59e0b", // ambre
  bon: "#3b82f6", // bleu
  excellent: "#22c55e", // vert
};

const LEVEL_LABELS: Record<Level, string> = {
  faible: "À risque",
  moyen: "Moyen",
  bon: "Bon",
  excellent: "Excellent",
};

/**
 * Jauge circulaire (anneau SVG) affichant le score 0-100 et son niveau.
 */
export default function ScoreGauge({ score, level }: ScoreGaugeProps) {
  const radius = 80;
  const stroke = 14;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const offset = circumference - (score / 100) * circumference;
  const color = LEVEL_COLORS[level];

  return (
    <div className="flex flex-col items-center">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="-rotate-90"
        role="img"
        aria-label={`Score : ${score} sur 100`}
      >
        <circle
          stroke="#e2e8f0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset, transition: "stroke-dashoffset 1s ease" }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="-mt-28 flex flex-col items-center">
        <span className="text-5xl font-extrabold text-slate-800">{score}</span>
        <span className="text-sm text-slate-400">/ 100</span>
      </div>
      <span
        className="mt-16 rounded-full px-4 py-1 text-sm font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {LEVEL_LABELS[level]}
      </span>
    </div>
  );
}
