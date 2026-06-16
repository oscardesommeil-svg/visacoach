import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type EtudiantDiagnosticPayload } from "../lib/api";

interface Q {
  field: keyof EtudiantDiagnosticPayload;
  label: string;
  options: { v: string; l: string }[];
}

const QUESTIONS: Q[] = [
  {
    field: "pays_destination",
    label: "Dans quel pays souhaitez-vous étudier ?",
    options: [
      { v: "france", l: "🇫🇷 France" },
      { v: "canada", l: "🇨🇦 Canada" },
      { v: "usa", l: "🇺🇸 USA" },
      { v: "belgique", l: "🇧🇪 Belgique" },
      { v: "suisse", l: "🇨🇭 Suisse" },
    ],
  },
  {
    field: "niveau_etudes",
    label: "Quel niveau d'études visez-vous ?",
    options: [
      { v: "licence", l: "Licence" },
      { v: "master", l: "Master" },
      { v: "doctorat", l: "Doctorat" },
      { v: "bts_dut", l: "BTS / DUT" },
    ],
  },
  {
    field: "domaine",
    label: "Quel est votre domaine d'études ?",
    options: [
      { v: "informatique", l: "Informatique" },
      { v: "medecine", l: "Médecine" },
      { v: "droit", l: "Droit" },
      { v: "commerce", l: "Commerce" },
      { v: "ingenierie", l: "Ingénierie" },
      { v: "autre", l: "Autre" },
    ],
  },
  {
    field: "niveau_francais",
    label: "Quel est votre niveau de français ?",
    options: [
      { v: "courant", l: "Courant" },
      { v: "intermediaire", l: "Intermédiaire" },
      { v: "debutant", l: "Débutant" },
    ],
  },
  {
    field: "test_langue",
    label: "Avez-vous déjà passé le TCF / DELF / DALF ?",
    options: [
      { v: "oui_score", l: "Oui, avec un score" },
      { v: "non", l: "Non" },
    ],
  },
  {
    field: "etablissement",
    label: "Avez-vous un établissement d'accueil confirmé ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "recherche", l: "En recherche" },
      { v: "non", l: "Non" },
    ],
  },
  {
    field: "campus_france_status",
    label: "Avez-vous passé Campus France ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "en_cours", l: "En cours" },
      { v: "non", l: "Non" },
      { v: "na", l: "Non applicable" },
    ],
  },
  {
    field: "budget_mensuel",
    label: "Quel est votre budget mensuel disponible ?",
    options: [
      { v: "lt300", l: "< 300 €" },
      { v: "300_600", l: "300 – 600 €" },
      { v: "gt600", l: "> 600 €" },
    ],
  },
  {
    field: "garant",
    label: "Avez-vous un garant en France / Canada / USA ?",
    options: [
      { v: "oui", l: "Oui" },
      { v: "non", l: "Non" },
    ],
  },
  {
    field: "situation_academique",
    label: "Quelle est votre situation académique actuelle ?",
    options: [
      { v: "bac", l: "Bac" },
      { v: "bac2", l: "Bac+2" },
      { v: "bac3", l: "Bac+3" },
      { v: "bac5", l: "Bac+5 ou plus" },
    ],
  },
];

export default function EtudiantDiagnostic() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(all: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    const payload: EtudiantDiagnosticPayload = {
      pays_destination: all.pays_destination,
      niveau_etudes: all.niveau_etudes,
      domaine: all.domaine,
      niveau_francais: all.niveau_francais,
      test_langue: all.test_langue,
      etablissement: all.etablissement,
      campus_france_status: all.campus_france_status,
      budget_mensuel: all.budget_mensuel,
      garant: all.garant === "oui",
      situation_academique: all.situation_academique,
    };
    try {
      const res = await api.createEtudiantDiagnostic(payload);
      navigate(`/etudiant/dashboard/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
      setSubmitting(false);
    }
  }

  function choose(value: string) {
    const q = QUESTIONS[current];
    const next = { ...answers, [q.field]: value };
    setAnswers(next);
    if (current < QUESTIONS.length - 1) {
      setTimeout(() => setCurrent((c) => c + 1), 180);
    } else {
      submit(next);
    }
  }

  if (submitting) {
    return (
      <p className="py-20 text-center text-slate-500">Calcul de votre score étudiant…</p>
    );
  }

  const q = QUESTIONS[current];

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${((current + 1) / QUESTIONS.length) * 100}%`,
            backgroundColor: "#1434A4",
          }}
        />
      </div>

      <div className="card">
        <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#1434A4" }}>
          Diagnostic étudiant — {current + 1} / {QUESTIONS.length}
        </span>
        <h2 className="mb-6 mt-2 text-xl font-bold text-slate-800">{q.label}</h2>

        <div className="space-y-3">
          {q.options.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => choose(o.v)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                answers[q.field] === o.v
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
              }`}
            >
              <span className="font-medium">{o.l}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {current > 0 && (
        <button
          type="button"
          onClick={() => setCurrent((c) => c - 1)}
          className="mt-4 text-sm text-slate-500 hover:text-slate-700"
        >
          ← Question précédente
        </button>
      )}
    </div>
  );
}
