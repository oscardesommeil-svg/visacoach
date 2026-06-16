import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ScoreGauge from "../components/ScoreGauge";
import PDFEditor from "../components/PDFEditor";
import ModuleCard from "../components/etudiant/ModuleCard";
import BourseCard from "../components/etudiant/BourseCard";
import SimulateurEntretien from "../components/etudiant/SimulateurEntretien";
import {
  api,
  type Bourse,
  type CampusFranceGuide,
  type ChecklistVisa,
  type EtudiantDiagnosticResult,
  type SimulationEntretien,
  type Universite,
} from "../lib/api";

type ModuleKey =
  | "universite"
  | "candidature"
  | "campus"
  | "bourses"
  | "logement"
  | "visa";

const LOGEMENT_TIPS = [
  "Candidatez tôt au CROUS (France) ou aux résidences universitaires — places limitées.",
  "Préparez un dossier : garant, justificatifs de revenus, attestation d'inscription.",
  "Méfiez-vous des arnaques : ne versez jamais d'argent avant d'avoir visité ou signé.",
  "Pensez aux plateformes étudiantes (Studapart, Lokaviz, résidences privées).",
  "Souscrivez une assurance habitation : souvent exigée pour signer le bail.",
];

export default function EtudiantDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userCountry = user?.user_metadata?.country as string | undefined;

  const [diag, setDiag] = useState<EtudiantDiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState<Set<ModuleKey>>(new Set(["universite"]));
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Résultats par module
  const [universites, setUniversites] = useState<Universite[] | null>(null);
  const [lettre, setLettre] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [campus, setCampus] = useState<CampusFranceGuide | null>(null);
  const [simulation, setSimulation] = useState<SimulationEntretien | null>(null);
  const [bourses, setBourses] = useState<Bourse[] | null>(null);
  const [checklist, setChecklist] = useState<ChecklistVisa | null>(null);
  const [logementDone, setLogementDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getEtudiantDiagnostic(id)
      .then(setDiag)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function toggle(key: ModuleKey) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        if (key === "logement") setLogementDone(true);
      }
      return next;
    });
  }

  async function run<T>(key: string, fn: () => Promise<T>, onOk: (v: T) => void) {
    setLoadingKey(key);
    setError(null);
    try {
      onOk(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de génération.");
    } finally {
      setLoadingKey(null);
    }
  }

  function statusFor(key: ModuleKey): "todo" | "doing" | "done" {
    if (loadingKey === key) return "doing";
    const has: Record<ModuleKey, boolean> = {
      universite: !!universites,
      candidature: !!lettre,
      campus: !!campus,
      bourses: !!bourses,
      logement: logementDone,
      visa: !!checklist,
    };
    return has[key] ? "done" : "todo";
  }

  if (loading) return <p className="py-20 text-center text-slate-500">Chargement…</p>;
  if (error && !diag) return <p className="py-20 text-center text-red-600">{error}</p>;
  if (!diag || !id) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">Mon parcours étudiant</h1>

      {/* Score */}
      <div className="card flex flex-col items-center sm:flex-row sm:gap-8">
        <ScoreGauge score={diag.score} level={diag.level} />
        <p className="mt-4 text-center text-slate-600 sm:mt-0 sm:text-left">
          {diag.summary}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Modules */}
      <div className="space-y-4">
        {/* Module 1 — Choix d'université */}
        <ModuleCard
          icon="🎓"
          title="Module 1 — Choix d'université"
          status={statusFor("universite")}
          isOpen={open.has("universite")}
          onToggle={() => toggle("universite")}
          actionLabel="Recommander des universités"
          loading={loadingKey === "universite"}
          onAction={() =>
            run("universite", () => api.etudiantUniversites(id), (r) =>
              setUniversites(r.universites),
            )
          }
        >
          {universites && (
            <div className="grid gap-4 sm:grid-cols-2">
              {universites.map((u, i) => (
                <div key={i} className="rounded-xl p-4" style={{ backgroundColor: "#F4F6FC", border: "1px solid #DDE3F5" }}>
                  <h4 className="font-bold text-slate-800">{u.nom}</h4>
                  <p className="text-xs text-slate-500">{u.ville} · {u.type}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{u.programme}</p>
                  <p className="mt-2 text-sm text-slate-600">{u.pourquoi}</p>
                </div>
              ))}
            </div>
          )}
        </ModuleCard>

        {/* Module 2 — Dossier de candidature */}
        <ModuleCard
          icon="📝"
          title="Module 2 — Dossier de candidature"
          status={statusFor("candidature")}
          isOpen={open.has("candidature")}
          onToggle={() => toggle("candidature")}
          actionLabel="Générer ma lettre de motivation"
          loading={loadingKey === "candidature"}
          onAction={() =>
            run("candidature", () => api.etudiantLettreMotivation(id), (r) => {
              setLettre(r.content);
              setPdfOpen(true);
            })
          }
        >
          {lettre && (
            <button
              type="button"
              onClick={() => setPdfOpen(true)}
              className="btn-secondary !px-4 !py-2 text-sm"
            >
              Rouvrir l'éditeur / télécharger en PDF
            </button>
          )}
        </ModuleCard>

        {/* Module 3 — Campus France */}
        <ModuleCard
          icon="🏛️"
          title="Module 3 — Campus France"
          status={statusFor("campus")}
          isOpen={open.has("campus")}
          onToggle={() => toggle("campus")}
          actionLabel="Générer mon guide Campus France"
          loading={loadingKey === "campus"}
          onAction={() =>
            run("campus", () => api.etudiantCampusFrance(id), setCampus)
          }
        >
          {campus && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 font-bold text-slate-800">📋 Étapes</p>
                <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                  {campus.etapes.map((e, i) => <li key={i}>{e}</li>)}
                </ol>
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-800">❓ Questions probables</p>
                <ul className="space-y-2 text-slate-700">
                  {campus.questions.map((q, i) => (
                    <li key={i}>
                      <span className="font-semibold">{q.question}</span><br />
                      <span className="text-slate-600">{q.reponse}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-bold text-slate-800">🚫 Erreurs à éviter</p>
                <ul className="space-y-1 text-slate-700">
                  {campus.erreurs.map((e, i) => <li key={i} className="flex gap-2"><span className="text-red-500">✕</span>{e}</li>)}
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() =>
                    run("simulation", () => api.etudiantSimulation(id), setSimulation)
                  }
                  disabled={loadingKey === "simulation"}
                  className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60"
                >
                  {loadingKey === "simulation" ? "Génération…" : "🎤 Simuler l'entretien"}
                </button>
                {simulation && (
                  <div className="mt-4">
                    <SimulateurEntretien simulation={simulation} />
                  </div>
                )}
              </div>
            </div>
          )}
        </ModuleCard>

        {/* Module 4 — Bourses */}
        <ModuleCard
          icon="💰"
          title="Module 4 — Bourses disponibles"
          status={statusFor("bourses")}
          isOpen={open.has("bourses")}
          onToggle={() => toggle("bourses")}
          actionLabel="Voir les bourses pour mon profil"
          loading={loadingKey === "bourses"}
          onAction={() =>
            run(
              "bourses",
              () => api.etudiantBourses(diag.pays_destination, diag.niveau_etudes),
              (r) => setBourses(r.bourses),
            )
          }
        >
          {bourses && (
            bourses.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucune bourse répertoriée pour ce pays/niveau pour l'instant.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {bourses.map((b, i) => (
                  <BourseCard key={i} bourse={b} userCountry={userCountry} />
                ))}
              </div>
            )
          )}
        </ModuleCard>

        {/* Module 5 — Logement */}
        <ModuleCard
          icon="🏠"
          title="Module 5 — Logement"
          status={statusFor("logement")}
          isOpen={open.has("logement")}
          onToggle={() => toggle("logement")}
        >
          <ul className="space-y-2 text-sm text-slate-700">
            {LOGEMENT_TIPS.map((t, i) => (
              <li key={i} className="flex gap-2"><span style={{ color: "#1434A4" }}>•</span>{t}</li>
            ))}
          </ul>
        </ModuleCard>

        {/* Module 6 — Visa étudiant */}
        <ModuleCard
          icon="✈️"
          title="Module 6 — Visa étudiant"
          status={statusFor("visa")}
          isOpen={open.has("visa")}
          onToggle={() => toggle("visa")}
          actionLabel="Générer ma checklist visa"
          loading={loadingKey === "visa"}
          onAction={() =>
            run("visa", () => api.etudiantChecklistVisa(id), setChecklist)
          }
        >
          {checklist && (
            <div className="space-y-4">
              {checklist.sections.map((s, i) => (
                <div key={i}>
                  <p className="mb-1 font-bold text-slate-800">{s.titre}</p>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {s.items.map((it, j) => (
                      <li key={j} className="flex gap-2"><span className="text-slate-400">☐</span>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ModuleCard>
      </div>

      {pdfOpen && lettre && (
        <PDFEditor
          title="Lettre de motivation académique"
          content={lettre}
          documentType="lettre_motivation_etudiant"
          diagnosticId={id}
          onClose={() => setPdfOpen(false)}
        />
      )}
    </div>
  );
}
