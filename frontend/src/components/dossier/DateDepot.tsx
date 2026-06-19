import type { DateDepotResult } from "../../lib/api";

interface DateDepotProps {
  result: DateDepotResult | null;
  loading: boolean;
  onLoad: () => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Widget : date optimale de dépôt du dossier.
 */
export default function DateDepot({ result, loading, onLoad }: DateDepotProps) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">📅 Date optimale de dépôt</h2>
        {!result && (
          <button
            type="button"
            onClick={onLoad}
            disabled={loading}
            className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60"
          >
            {loading ? "Calcul…" : "Calculer ma date"}
          </button>
        )}
      </div>

      {result && (
        <div className="mt-4">
          <p className="text-2xl font-extrabold" style={{ color: "#1434A4" }}>
            {formatDate(result.date_optimale)}
          </p>
          <p className="text-sm text-slate-500">
            Dans {result.jours_restants} jour{result.jours_restants > 1 ? "s" : ""}
          </p>
          <p className="mt-3 text-sm text-slate-700">{result.explication}</p>
        </div>
      )}
    </div>
  );
}
