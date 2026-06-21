import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, type DossierSummary } from "../lib/api";
import { paysLabel, visaLabel } from "../lib/dossier";

const BLUE = "#1434A4";
const GOLD = "#F7B731";
const INK = "#0A0F2C";
const SLATE = "#4A5580";
const MIST = "#F4F6FC";

const STATUT_LABEL: Record<string, string> = {
  en_cours: "En cours",
  pret: "Prêt à déposer",
  depose: "Déposé",
  obtenu: "Obtenu",
  refuse: "Refusé",
};

const LIEN_ICONS: Record<string, string> = {
  mere: "👩",
  pere: "👨",
  conjoint: "💑",
  frere: "👦",
  soeur: "👧",
  enfant: "🧒",
  ami: "🤝",
  autre: "👥",
};

function beneficiaireLabel(d: DossierSummary): string {
  if ((d.beneficiaire_type ?? "moi-meme") === "moi-meme") return "👤 Vous";
  const icon = LIEN_ICONS[d.beneficiaire_lien ?? "autre"] ?? "👥";
  return `${icon} ${d.beneficiaire_prenom || "Proche"}`;
}

function paiementBadge(d: DossierSummary): { label: string; color: string; bg: string } {
  if (d.statut_paiement === "paye")
    return { label: "✅ Payé", color: "#16A34A", bg: "#DCFCE7" };
  if ((d.plan ?? "diagnostic") === "diagnostic")
    return { label: "🆓 Diagnostic gratuit", color: "#2563EB", bg: "#DBEAFE" };
  return { label: "💳 Paiement requis", color: "#D97706", bg: "#FEF3C7" };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [dossiers, setDossiers] = useState<DossierSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";

  useEffect(() => {
    api
      .mesDossiers()
      .then((r) => setDossiers(r.dossiers))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const aDejaUnDossierPaye = dossiers.some((d) => d.statut_paiement === "paye");

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <div className="space-y-8">
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

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: SLATE }}>
          📊 Mes dossiers
        </h2>

        {loading ? (
          <p style={{ color: SLATE }}>Chargement…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : dossiers.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: MIST }}>
            <p style={{ color: SLATE }}>
              Vous n'avez pas encore de dossier. Créez votre premier dossier visa !
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {dossiers.map((d) => {
              const v = visaLabel(d.type_visa);
              const dest = paysLabel(d.pays_destination);
              const badge = paiementBadge(d);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => navigate(`/dossier-universel/${d.id}`)}
                  className="card text-left transition hover:border-brand-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: SLATE }}>
                      {beneficiaireLabel(d)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <h3 className="mt-1 font-bold" style={{ color: INK }}>
                    {v.icon} {v.label} · {dest.flag} {dest.label}
                  </h3>
                  <span className="text-xs" style={{ color: SLATE }}>
                    {STATUT_LABEL[d.statut] ?? d.statut}
                  </span>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${d.score_global}%`, backgroundColor: GOLD }}
                    />
                  </div>
                  <p className="mt-2 text-sm" style={{ color: SLATE }}>
                    Progression : {d.score_global}%
                  </p>
                  {aDejaUnDossierPaye && d.statut_paiement !== "paye" && (
                    <span
                      className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}
                    >
                      🎁 -20% fidélité applicable
                    </span>
                  )}
                  <span className="mt-3 block text-sm font-semibold" style={{ color: BLUE }}>
                    Continuer →
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/nouveau-dossier")}
          className="mt-4 rounded-xl px-5 py-3 text-sm font-bold"
          style={{ backgroundColor: GOLD, color: INK }}
        >
          + Nouveau dossier
        </button>
      </section>
    </div>
  );
}
