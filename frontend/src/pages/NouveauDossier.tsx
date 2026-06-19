import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { PAYS_DESTINATION, PAYS_ORIGINE, TYPE_VISA } from "../lib/dossier";

const BLUE = "#1434A4";
const INK = "#0A0F2C";
const SLATE = "#4A5580";

export default function NouveauDossier() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [typeVisa, setTypeVisa] = useState<string | null>(null);
  const [paysDest, setPaysDest] = useState<string | null>(null);
  const [paysOrig, setPaysOrig] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(origine: string) {
    if (!typeVisa || !paysDest) return;
    setCreating(true);
    setError(null);
    try {
      const { dossier_id } = await api.creerDossier({
        type_visa: typeVisa,
        pays_destination: paysDest,
        pays_origine: origine,
      });
      navigate(`/dossier-universel/${dossier_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de création.");
      setCreating(false);
    }
  }

  if (creating) {
    return <p className="py-20 text-center text-slate-500">Création de votre dossier…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progression */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            className="h-2 w-16 rounded-full"
            style={{ backgroundColor: s <= step ? BLUE : "#DDE3F5" }}
          />
        ))}
      </div>

      {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}

      {/* Étape 1 — Type de visa */}
      {step === 1 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Quel type de visa ?
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>
            Sélectionnez le motif de votre voyage.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {TYPE_VISA.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTypeVisa(t.id);
                  setStep(2);
                }}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-400 hover:bg-slate-50"
              >
                <span className="text-3xl">{t.icon}</span>
                <span>
                  <span className="block font-bold" style={{ color: INK }}>
                    {t.label}
                  </span>
                  <span className="text-sm" style={{ color: SLATE }}>
                    {t.desc}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Étape 2 — Pays de destination */}
      {step === 2 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Pays de destination ?
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>
            Où souhaitez-vous vous rendre ?
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PAYS_DESTINATION.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPaysDest(p.id);
                  setStep(3);
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:border-brand-400 hover:bg-slate-50"
              >
                <span className="text-3xl">{p.flag}</span>
                <span className="mt-2 block font-bold" style={{ color: INK }}>
                  {p.label}
                </span>
                <span className="text-xs" style={{ color: SLATE }}>
                  {p.zone}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-6 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Retour
          </button>
        </>
      )}

      {/* Étape 3 — Pays d'origine */}
      {step === 3 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Votre pays d'origine ?
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>
            D'où déposez-vous votre demande ?
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PAYS_ORIGINE.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPaysOrig(p.id);
                  create(p.id);
                }}
                className={`rounded-xl border bg-white p-3 text-center transition hover:border-brand-400 hover:bg-slate-50 ${
                  paysOrig === p.id ? "border-brand-600" : "border-slate-200"
                }`}
              >
                <span className="text-2xl">{p.flag}</span>
                <span className="mt-1 block text-sm font-semibold" style={{ color: INK }}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-6 text-sm text-slate-500 hover:text-slate-700"
          >
            ← Retour
          </button>
        </>
      )}
    </div>
  );
}
