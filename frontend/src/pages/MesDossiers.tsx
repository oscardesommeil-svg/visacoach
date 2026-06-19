import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type DossierSummary } from "../lib/api";
import { paysLabel, visaLabel } from "../lib/dossier";

const STATUT_LABEL: Record<string, string> = {
  en_cours: "En cours",
  pret: "Prêt à déposer",
  depose: "Déposé",
  obtenu: "Obtenu",
  refuse: "Refusé",
};

export default function MesDossiers() {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<DossierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .mesDossiers()
      .then((r) => setDossiers(r.dossiers))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900">Mes dossiers</h1>
        <Link to="/nouveau-dossier" className="btn-primary">
          + Nouveau dossier
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : dossiers.length === 0 ? (
        <div className="card text-center text-slate-500">
          Aucun dossier pour l'instant. Créez votre premier dossier visa !
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {dossiers.map((d) => {
            const v = visaLabel(d.type_visa);
            const dest = paysLabel(d.pays_destination);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => navigate(`/dossier-universel/${d.id}`)}
                className="card text-left transition hover:border-brand-300"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">
                    {v.icon} {v.label} · {dest.flag} {dest.label}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {STATUT_LABEL[d.statut] ?? d.statut}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.score_global}%`, backgroundColor: "#F7B731" }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Progression : {d.score_global}%
                </p>
                <span className="mt-3 inline-block text-sm font-semibold text-brand-600">
                  Continuer →
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
