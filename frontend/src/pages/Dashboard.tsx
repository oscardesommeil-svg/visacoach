import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, type DossierProgress } from "../lib/api";

const BLUE = "#1434A4";
const GOLD = "#F7B731";
const INK = "#0A0F2C";
const SLATE = "#4A5580";
const MIST = "#F4F6FC";

interface DiagAnswer {
  question_id: string;
  value: string;
}

interface DiagRow {
  id: string;
  score: number;
  level: string;
  answers: DiagAnswer[];
  created_at: string;
}

interface DossierCard {
  diag: DiagRow;
  progress: DossierProgress | null;
}

const VISA_LABELS: Record<string, string> = {
  tourisme: "Tourisme",
  etudes: "Études",
  travail: "Travail",
  famille: "Regroupement familial",
  affaires: "Affaires",
};
const DEST_LABELS: Record<string, string> = {
  france: "Schengen France",
  canada: "Canada",
  belgique: "Belgique",
  schengen_autre: "Schengen",
  autre: "Autre destination",
};

function answerValue(answers: DiagAnswer[], id: string): string {
  return answers.find((a) => a.question_id === id)?.value ?? "";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [cards, setCards] = useState<DossierCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        // Lecture via le backend (service_role) — robuste vis-à-vis de la RLS.
        const diags = (await api.listUserDiagnostics()) as DiagRow[];
        // Récupère la progression de chaque dossier via le backend (service_role).
        const withProgress = await Promise.all(
          diags.map(async (diag) => {
            try {
              const progress = await api.getProgress(diag.id);
              return { diag, progress };
            } catch {
              return { diag, progress: null };
            }
          }),
        );
        if (!cancelled) setCards(withProgress);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const latestId = cards[0]?.diag.id;

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ color: INK }}>
          👋 Bonjour {firstName} !
        </h1>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "#DDE3F5", color: SLATE }}
        >
          Se déconnecter
        </button>
      </div>

      {/* Dossiers */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: SLATE }}>
          📊 Mes dossiers
        </h2>

        {loading ? (
          <p style={{ color: SLATE }}>Chargement de vos dossiers…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : cards.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: MIST }}
          >
            <p style={{ color: SLATE }}>
              Vous n'avez pas encore de dossier. Lancez votre premier diagnostic !
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map(({ diag, progress }) => {
              const visa = VISA_LABELS[answerValue(diag.answers, "type_visa")] || "Visa";
              const dest =
                DEST_LABELS[answerValue(diag.answers, "destination")] || "";
              return (
                <div key={diag.id} className="card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold" style={{ color: INK }}>
                        Visa {dest} · {visa}
                      </h3>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-sm" style={{ color: SLATE }}>
                          Score : <strong>{diag.score}/100</strong>
                        </span>
                        <div
                          className="h-2 w-32 overflow-hidden rounded-full"
                          style={{ backgroundColor: MIST }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${diag.score}%`, backgroundColor: GOLD }}
                          />
                        </div>
                        <span className="text-xs capitalize" style={{ color: SLATE }}>
                          {diag.level}
                        </span>
                      </div>
                      {progress && (
                        <p className="mt-2 text-sm" style={{ color: SLATE }}>
                          Documents : {progress.documents_valides}/
                          {progress.documents_total} validés
                        </p>
                      )}
                    </div>
                    <Link
                      to={`/dossier/${diag.id}`}
                      className="rounded-xl px-4 py-2 text-sm font-bold text-white"
                      style={{ backgroundColor: BLUE }}
                    >
                      Continuer mon dossier →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/diagnostic")}
          className="mt-4 rounded-xl px-5 py-3 text-sm font-bold"
          style={{ backgroundColor: GOLD, color: INK }}
        >
          + Nouveau diagnostic
        </button>
      </section>

      {/* Actions rapides */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: SLATE }}>
          📋 Actions rapides
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate(latestId ? `/dossier/${latestId}` : "/diagnostic")}
            className="rounded-xl border p-4 text-left font-semibold"
            style={{ borderColor: "#DDE3F5", color: INK }}
          >
            📄 Mes documents
          </button>
          <button
            type="button"
            onClick={() => navigate(latestId ? `/conseils/${latestId}` : "/diagnostic")}
            className="rounded-xl border p-4 text-left font-semibold"
            style={{ borderColor: "#DDE3F5", color: INK }}
          >
            ✍️ Mes lettres
          </button>
          <a
            href="https://wa.me/33767787541?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20VisaCoach"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border p-4 text-left font-semibold"
            style={{ borderColor: "#DDE3F5", color: INK }}
          >
            💬 Chat
          </a>
        </div>
        {!latestId && (
          <p style={{ fontSize: "0.8rem", color: SLATE, marginTop: "8px" }}>
            Lancez d'abord un diagnostic pour accéder à vos documents.
          </p>
        )}
      </section>
    </div>
  );
}
