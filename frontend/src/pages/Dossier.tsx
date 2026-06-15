import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DocumentCard from "../components/DocumentCard";
import DossierProgress from "../components/DossierProgress";
import FeedbackIA from "../components/FeedbackIA";
import UploadZone from "../components/UploadZone";
import { api, type DossierDocument, type DossierProgress as Progress } from "../lib/api";
import { docMeta } from "../lib/documents";

/**
 * Espace de constitution du dossier : checklist des documents requis à gauche,
 * zone d'upload + feedback IA à droite. Le score progresse en temps réel.
 */
export default function Dossier() {
  const { diagnostic_id: diagnosticId } = useParams<{ diagnostic_id: string }>();

  const [progress, setProgress] = useState<Progress | null>(null);
  const [documents, setDocuments] = useState<DossierDocument[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!diagnosticId) return;
    const [prog, docs] = await Promise.all([
      api.getProgress(diagnosticId),
      api.listDocuments(diagnosticId),
    ]);
    setProgress(prog);
    setDocuments(docs);
    setSelectedType((current) => current ?? prog.documents_requis[0] ?? null);
  }, [diagnosticId]);

  useEffect(() => {
    refresh()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  // Document déjà uploadé pour un type donné (le plus récent).
  const docForType = (type: string): DossierDocument | undefined =>
    [...documents].reverse().find((d) => d.type === type);

  async function handleUpload(file: File) {
    if (!diagnosticId || !selectedType) return;
    setError(null);
    setBusy(true);
    try {
      setBusyLabel("Envoi du document…");
      const uploaded = await api.uploadDocument(diagnosticId, selectedType, file);
      setDocuments((prev) => [...prev, uploaded]);

      setBusyLabel("Analyse IA en cours… (10-15 s)");
      const verified = await api.verifyDocument(diagnosticId, uploaded.id);
      setDocuments((prev) =>
        prev.map((d) => (d.id === verified.id ? verified : d)),
      );

      const prog = await api.getProgress(diagnosticId);
      setProgress(prog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'upload.");
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  }

  async function handleDelete(doc: DossierDocument) {
    if (!diagnosticId) return;
    setError(null);
    try {
      await api.deleteDocument(diagnosticId, doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      const prog = await api.getProgress(diagnosticId);
      setProgress(prog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-slate-500">Chargement du dossier…</p>;
  }

  if (error && !progress) {
    return <p className="py-20 text-center text-red-600">{error}</p>;
  }

  const required = progress?.documents_requis ?? [];
  const selectedDoc = selectedType ? docForType(selectedType) : undefined;
  const complete =
    progress != null &&
    progress.documents_total > 0 &&
    progress.documents_valides === progress.documents_total;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon dossier visa</h1>
          <p className="mt-1 text-slate-600">
            Ajoutez chaque document : l'IA le vérifie et vous indique comment
            l'améliorer.
          </p>
        </div>
        <Link
          to={`/conseils/${diagnosticId}`}
          className="btn-secondary !px-4 !py-2 text-sm"
        >
          🎯 Conseils & Outils
        </Link>
      </div>

      {progress && (
        <DossierProgress
          score={progress.score_global}
          valides={progress.documents_valides}
          total={progress.documents_total}
        />
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Colonne gauche : checklist */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Documents requis
          </h2>
          {required.map((type) => (
            <DocumentCard
              key={type}
              type={type}
              doc={docForType(type)}
              selected={selectedType === type}
              analyzing={busy && selectedType === type}
              onSelect={() => setSelectedType(type)}
            />
          ))}
        </div>

        {/* Colonne droite : upload + feedback */}
        <div className="space-y-4">
          {selectedType ? (
            <>
              <div className="card">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-2xl">{docMeta(selectedType).icon}</span>
                  <div>
                    <h2 className="font-bold text-slate-800">
                      {docMeta(selectedType).label}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {docMeta(selectedType).hint}
                    </p>
                  </div>
                </div>

                <UploadZone
                  onFile={handleUpload}
                  busy={busy}
                  busyLabel={busyLabel}
                />

                {selectedDoc && (
                  <p className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span className="truncate">📎 {selectedDoc.filename}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedDoc)}
                      className="ml-2 shrink-0 text-red-500 hover:text-red-700"
                    >
                      Supprimer
                    </button>
                  </p>
                )}
              </div>

              {selectedDoc && <FeedbackIA doc={selectedDoc} />}
            </>
          ) : (
            <div className="card text-slate-500">
              Sélectionnez un document à gauche pour commencer.
            </div>
          )}
        </div>
      </div>

      {/* Dossier complet */}
      <div className="mt-8 text-center">
        <button
          type="button"
          disabled={!complete}
          className="btn-primary"
          onClick={() =>
            alert("Votre dossier est complet ! Vous pouvez le déposer en toute confiance.")
          }
        >
          {complete ? "Mon dossier est prêt ✅" : "Complétez tous les documents pour valider"}
        </button>
      </div>
    </div>
  );
}
