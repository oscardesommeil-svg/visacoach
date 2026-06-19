import type { CoherenceResult } from "../../lib/api";

interface AnalyseCoherenceProps {
  result: CoherenceResult | null;
  loading: boolean;
  onAnalyse: () => void;
}

const NIVEAU_COLOR: Record<string, string> = {
  EXCELLENT: "#16A34A",
  BON: "#3B82F6",
  MOYEN: "#EA580C",
  FAIBLE: "#DC2626",
  CRITIQUE: "#B91C1C",
};

function Block({
  title,
  icon,
  items,
  color,
}: {
  title: string;
  icon: string;
  items: string[];
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 font-bold text-slate-800">
        {icon} {title}
      </p>
      <ul className="space-y-1 text-sm text-slate-700">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span style={{ color }}>•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Analyse de cohérence inter-documents.
 */
export default function AnalyseCoherence({
  result,
  loading,
  onAnalyse,
}: AnalyseCoherenceProps) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">
          🔎 Analyse de cohérence du dossier
        </h2>
        <button
          type="button"
          onClick={onAnalyse}
          disabled={loading}
          className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60"
        >
          {loading
            ? "Analyse…"
            : result
              ? "Relancer l'analyse"
              : "Analyser la cohérence"}
        </button>
      </div>

      {result && (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold" style={{ color: "#1434A4" }}>
              {result.score_coherence}
              <span className="text-base text-slate-400">/100</span>
            </span>
            <span
              className="rounded-full px-3 py-1 text-sm font-bold text-white"
              style={{ backgroundColor: NIVEAU_COLOR[result.niveau] ?? "#4A5580" }}
            >
              {result.niveau}
            </span>
          </div>

          <Block title="Incohérences critiques" icon="🔴" items={result.incoherences_critiques} color="#DC2626" />
          <Block title="Points de vigilance" icon="⚠️" items={result.points_vigilance} color="#EA580C" />
          <Block title="Points forts" icon="✅" items={result.points_forts} color="#16A34A" />
          <Block title="Recommandations" icon="🎯" items={result.recommandations} color="#1434A4" />
        </div>
      )}
    </div>
  );
}
