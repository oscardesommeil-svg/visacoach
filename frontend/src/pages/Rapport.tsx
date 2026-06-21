import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import PDFEditor from "../components/PDFEditor";
import MartinAvatar from "../components/MartinAvatar";
import { api, type Report } from "../lib/api";

/**
 * Affiche le rapport personnalisé (Markdown) généré par Claude.
 */
export default function Rapport() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    if (!id) return;
    // On tente de récupérer le rapport déjà généré ; sinon on le génère.
    api
      .getReport(id)
      .catch(() => api.generateReport(id))
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <p className="py-20 text-center text-slate-500">
        Chargement de votre rapport…
      </p>
    );
  }

  if (error || !report) {
    return (
      <div className="py-20 text-center">
        <p className="text-red-600">{error ?? "Rapport introuvable."}</p>
        <p className="mt-2 text-sm text-slate-500">
          Si vous venez de payer, patientez quelques instants puis rechargez la
          page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* En-tête : rapport signé Martin */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px" }}>
        <MartinAvatar size="md" />
        <div>
          <div style={{ fontWeight: 700, color: "#0A0F2C" }}>Rapport rédigé par Martin</div>
          <div style={{ fontSize: "0.8rem", color: "#4A5580" }}>Conseiller visa · VisaCoach</div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Votre rapport</h1>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {report.plan === "suivi" ? "Suivi Expert" : "Rapport complet"}
        </span>
      </div>

      {report.email_sent && (
        <p className="mb-6 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ Une copie de ce rapport vous a été envoyée par email.
        </p>
      )}

      <article className="card prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-brand-700">
        <ReactMarkdown>{report.content}</ReactMarkdown>
      </article>

      {/* Étape suivante : constitution du dossier assistée par IA */}
      <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50/40 p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">
          Passez à l'action : constituez votre dossier
        </h2>
        <p className="mt-2 text-slate-600">
          Uploadez vos documents un par un et laissez l'IA les vérifier et vous
          guider, pièce par pièce.
        </p>
        <Link to={`/dossier/${report.diagnostic_id}`} className="btn-primary mt-4">
          Constituer mon dossier avec l'aide de l'IA →
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowPdf(true)}
          className="btn-primary"
        >
          ⬇️ Télécharger mon rapport PDF
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary"
        >
          Imprimer
        </button>
      </div>

      {showPdf && (
        <PDFEditor
          title="Rapport de diagnostic visa"
          content={report.content}
          documentType="rapport"
          diagnosticId={report.diagnostic_id}
          onClose={() => setShowPdf(false)}
        />
      )}
    </div>
  );
}
