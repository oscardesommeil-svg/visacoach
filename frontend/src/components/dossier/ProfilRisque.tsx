import type { RisqueResult } from "../../lib/api";

interface ProfilRisqueProps {
  result: RisqueResult | null;
  loading: boolean;
  onLoad: () => void;
}

function riskColor(niveau: string): string {
  const n = niveau.toUpperCase();
  if (n.includes("TRÈS") || n.includes("TRES")) return "#B91C1C";
  if (n.includes("ÉLEVÉ") || n.includes("ELEVE")) return "#DC2626";
  if (n.includes("MOYEN")) return "#EA580C";
  return "#16A34A";
}

/**
 * Profil de risque consulaire.
 */
export default function ProfilRisque({ result, loading, onLoad }: ProfilRisqueProps) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">
          🎯 Profil de risque consulaire
        </h2>
        {!result && (
          <button
            type="button"
            onClick={onLoad}
            disabled={loading}
            className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Analyse…" : "Évaluer mon risque"}
          </button>
        )}
      </div>

      {result && (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span
              className="rounded-full px-4 py-1.5 text-sm font-bold text-white"
              style={{ backgroundColor: riskColor(result.niveau) }}
            >
              Risque {result.niveau} · {result.score_risque}/100
            </span>
          </div>

          {result.message_cle && (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              🗝️ Message clé : {result.message_cle}
            </p>
          )}

          {result.facteurs_aggravants.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 font-bold text-slate-800">⚠️ Facteurs aggravants</p>
              <ul className="space-y-2 text-sm">
                {result.facteurs_aggravants.map((f, i) => (
                  <li key={i} className="rounded-lg bg-slate-50 p-3">
                    <p className="font-semibold text-slate-800">{f.facteur}</p>
                    {f.impact && <p className="text-slate-600">Impact : {f.impact}</p>}
                    {f.strategie && (
                      <p className="mt-1 text-green-700">✅ Stratégie : {f.strategie}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.facteurs_rassurants.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 font-bold text-slate-800">💚 Facteurs rassurants</p>
              <ul className="space-y-1 text-sm text-slate-700">
                {result.facteurs_rassurants.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
