import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { PAYS_DESTINATION, PAYS_ORIGINE, TYPE_VISA } from "../lib/dossier";

const BLUE = "#1434A4";
const INK = "#0A0F2C";
const SLATE = "#4A5580";

const LIENS = [
  { id: "mere", label: "Ma mère", icon: "👩" },
  { id: "pere", label: "Mon père", icon: "👨" },
  { id: "conjoint", label: "Mon conjoint(e)", icon: "💑" },
  { id: "frere", label: "Mon frère", icon: "👦" },
  { id: "soeur", label: "Ma sœur", icon: "👧" },
  { id: "enfant", label: "Mon enfant", icon: "🧒" },
  { id: "ami", label: "Un(e) ami(e)", icon: "🤝" },
  { id: "autre", label: "Autre proche", icon: "👥" },
];

export default function NouveauDossier() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Étape 1 — bénéficiaire
  const [beneficiaireType, setBeneficiaireType] = useState<"moi-meme" | "proche">("moi-meme");
  const [beneficiairePrenom, setBeneficiairePrenom] = useState("");
  const [beneficiaireLien, setBeneficiaireLien] = useState("");

  // Étapes 2-4
  const [typeVisa, setTypeVisa] = useState<string | null>(null);
  const [paysDest, setPaysDest] = useState<string | null>(null);
  const [paysOrig, setPaysOrig] = useState<string | null>(null);

  // Étape 5 — profil du demandeur
  const [age, setAge] = useState("");
  const [situation, setSituation] = useState("celibataire");
  const [proprietaire, setProprietaire] = useState("non");
  const [historique, setHistorique] = useState("jamais");
  const [emploi, setEmploi] = useState("cdi");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const procheIncomplet =
    beneficiaireType === "proche" && (!beneficiairePrenom.trim() || !beneficiaireLien);

  async function create() {
    if (!typeVisa || !paysDest || !paysOrig) return;
    setCreating(true);
    setError(null);
    try {
      const { dossier_id } = await api.creerDossier({
        type_visa: typeVisa,
        pays_destination: paysDest,
        pays_origine: paysOrig,
        beneficiaire_type: beneficiaireType,
        beneficiaire_prenom: beneficiaireType === "proche" ? beneficiairePrenom.trim() : null,
        beneficiaire_lien: beneficiaireType === "proche" ? beneficiaireLien : null,
        profil: {
          age: age ? Number(age) : undefined,
          situation_familiale: situation,
          proprietaire: proprietaire === "oui",
          historique_voyage: historique,
          statut_emploi: emploi,
        },
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
      <div className="mb-8 flex items-center justify-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className="h-2 w-10 rounded-full"
            style={{ backgroundColor: s <= step ? BLUE : "#DDE3F5" }}
          />
        ))}
      </div>

      {error && <p className="mb-4 text-center text-sm text-red-600">{error}</p>}

      {/* Étape 1 — Bénéficiaire */}
      {step === 1 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Ce dossier est pour…
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>
            Vous pouvez créer un dossier pour vous-même ou pour un proche.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBeneficiaireType("moi-meme")}
              className={`rounded-2xl border-2 p-6 text-center transition ${
                beneficiaireType === "moi-meme"
                  ? "border-brand-600 bg-brand-50"
                  : "border-slate-200 hover:border-brand-300"
              }`}
            >
              <div className="text-3xl">👤</div>
              <div className="mt-2 font-bold" style={{ color: INK }}>Moi-même</div>
            </button>
            <button
              type="button"
              onClick={() => setBeneficiaireType("proche")}
              className={`rounded-2xl border-2 p-6 text-center transition ${
                beneficiaireType === "proche"
                  ? "border-brand-600 bg-brand-50"
                  : "border-slate-200 hover:border-brand-300"
              }`}
            >
              <div className="text-3xl">👥</div>
              <div className="mt-2 font-bold" style={{ color: INK }}>Un proche</div>
            </button>
          </div>

          {beneficiaireType === "proche" && (
            <div className="mt-6 space-y-4 card">
              <div>
                <label className="mb-1 block text-sm font-semibold" style={{ color: SLATE }}>
                  Quel est son prénom ?
                </label>
                <input
                  type="text"
                  value={beneficiairePrenom}
                  onChange={(e) => setBeneficiairePrenom(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
                  placeholder="Ex. Awa"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold" style={{ color: SLATE }}>
                  Quel est votre lien ?
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {LIENS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setBeneficiaireLien(l.id)}
                      className={`rounded-lg border px-2 py-2 text-sm transition ${
                        beneficiaireLien === l.id
                          ? "border-brand-600 bg-brand-50 text-brand-700"
                          : "border-slate-200 hover:border-brand-300"
                      }`}
                    >
                      {l.icon} {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Chaque dossier créé pour un proche nécessite un paiement séparé (même
                tarif que le vôtre).
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={procheIncomplet}
            onClick={() => setStep(2)}
            className="btn-primary mt-6 w-full disabled:opacity-50"
          >
            Continuer →
          </button>
        </>
      )}

      {/* Étape 2 — Type de visa */}
      {step === 2 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Quel type de visa ?
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>
            Sélectionnez le motif du voyage.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {TYPE_VISA.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTypeVisa(t.id);
                  setStep(3);
                }}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-400 hover:bg-slate-50"
              >
                <span className="text-3xl">{t.icon}</span>
                <span>
                  <span className="block font-bold" style={{ color: INK }}>{t.label}</span>
                  <span className="text-sm" style={{ color: SLATE }}>{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep(1)} className="mt-6 text-sm text-slate-500 hover:text-slate-700">
            ← Retour
          </button>
        </>
      )}

      {/* Étape 3 — Pays de destination */}
      {step === 3 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Pays de destination ?
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>Où se rend le voyageur ?</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PAYS_DESTINATION.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPaysDest(p.id);
                  setStep(4);
                }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:border-brand-400 hover:bg-slate-50"
              >
                <span className="text-3xl">{p.flag}</span>
                <span className="mt-2 block font-bold" style={{ color: INK }}>{p.label}</span>
                <span className="text-xs" style={{ color: SLATE }}>{p.zone}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep(2)} className="mt-6 text-sm text-slate-500 hover:text-slate-700">
            ← Retour
          </button>
        </>
      )}

      {/* Étape 4 — Pays d'origine */}
      {step === 4 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Pays d'origine ?
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>D'où la demande est-elle déposée ?</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PAYS_ORIGINE.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPaysOrig(p.id);
                  setStep(5);
                }}
                className={`rounded-xl border bg-white p-3 text-center transition hover:border-brand-400 hover:bg-slate-50 ${
                  paysOrig === p.id ? "border-brand-600" : "border-slate-200"
                }`}
              >
                <span className="text-2xl">{p.flag}</span>
                <span className="mt-1 block text-sm font-semibold" style={{ color: INK }}>{p.label}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep(3)} className="mt-6 text-sm text-slate-500 hover:text-slate-700">
            ← Retour
          </button>
        </>
      )}

      {/* Étape 5 — Profil du demandeur */}
      {step === 5 && (
        <>
          <h1 className="mb-2 text-center text-3xl font-bold" style={{ color: INK }}>
            Profil du demandeur
          </h1>
          <p className="mb-8 text-center" style={{ color: SLATE }}>
            Ces informations affinent le profil de risque consulaire.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); create(); }} className="card space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold" style={{ color: SLATE }}>Âge</label>
              <input type="number" min={16} max={99} value={age} onChange={(e) => setAge(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none" placeholder="Ex. 28" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" style={{ color: SLATE }}>Situation familiale</label>
              <select value={situation} onChange={(e) => setSituation(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none">
                <option value="celibataire">Célibataire</option>
                <option value="marie">Marié(e)</option>
                <option value="enfants">Marié(e) avec enfants</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" style={{ color: SLATE }}>Êtes-vous propriétaire ?</label>
              <select value={proprietaire} onChange={(e) => setProprietaire(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none">
                <option value="non">Non</option>
                <option value="oui">Oui</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" style={{ color: SLATE }}>Historique de voyage</label>
              <select value={historique} onChange={(e) => setHistorique(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none">
                <option value="jamais">Jamais voyagé</option>
                <option value="quelques_pays">Quelques pays</option>
                <option value="regulier">Voyageur régulier</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold" style={{ color: SLATE }}>Statut d'emploi</label>
              <select value={emploi} onChange={(e) => setEmploi(e.target.value)} className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none">
                <option value="cdi">Salarié (CDI)</option>
                <option value="cdd">Salarié (CDD)</option>
                <option value="independant">Indépendant</option>
                <option value="sans_emploi">Sans emploi</option>
                <option value="etudiant">Étudiant</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">Créer le dossier →</button>
          </form>
          <button type="button" onClick={() => setStep(4)} className="mt-6 text-sm text-slate-500 hover:text-slate-700">
            ← Retour
          </button>
        </>
      )}
    </div>
  );
}
