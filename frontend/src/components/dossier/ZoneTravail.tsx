import { useState } from "react";
import UploadZone from "../UploadZone";
import { api, type ChecklistItem, type DossierPiece } from "../../lib/api";
import { STATUT_META } from "../../lib/dossier";

interface ZoneTravailProps {
  dossierId: string;
  item: ChecklistItem;
  onUploaded: (piece: DossierPiece, scoreGlobal: number) => void;
}

/**
 * Zone de travail pour un document : description officielle, upload, feedback IA
 * et astuces légales.
 */
export default function ZoneTravail({ dossierId, item, onUploaded }: ZoneTravailProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [astuce, setAstuce] = useState<string | null>(null);
  const [astuceLoading, setAstuceLoading] = useState(false);

  const meta = STATUT_META[item.statut];
  const analysed = item.statut !== "a_fournir";

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { piece, score_global } = await api.uploadPiece(dossierId, item.id, file);
      onUploaded(piece, score_global);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  async function loadAstuce() {
    setAstuceLoading(true);
    try {
      const r = await api.getAstuce(dossierId, item.id);
      setAstuce(r.conseils);
    } catch {
      setAstuce("Impossible de récupérer les astuces pour le moment.");
    } finally {
      setAstuceLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-slate-800">{item.label}</h2>
      {item.risque_si_absent && (
        <p className="mt-1 text-xs font-semibold" style={{ color: "#B45309" }}>
          {item.obligatoire ? "Obligatoire" : "Recommandé"} · {item.risque_si_absent}
        </p>
      )}

      <dl className="mt-4 space-y-2 text-sm">
        {item.format && (
          <div>
            <dt className="font-semibold text-slate-700">Format requis</dt>
            <dd className="text-slate-600">{item.format}</dd>
          </div>
        )}
        {item.validite && (
          <div>
            <dt className="font-semibold text-slate-700">Validité</dt>
            <dd className="text-slate-600">{item.validite}</dd>
          </div>
        )}
        {item.delai_obtention && (
          <div>
            <dt className="font-semibold text-slate-700">Délai d'obtention</dt>
            <dd className="text-slate-600">{item.delai_obtention}</dd>
          </div>
        )}
        {item.lien_officiel && (
          <div>
            <dt className="font-semibold text-slate-700">Lien officiel</dt>
            <dd>
              <a
                href={item.lien_officiel}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: "#1434A4" }}
              >
                {item.lien_officiel}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {/* Upload */}
      <div className="mt-5">
        <UploadZone
          onFile={handleUpload}
          busy={uploading}
          busyLabel="Envoi + analyse IA…"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Feedback IA */}
      {analysed && (
        <div
          className="mt-4 rounded-xl p-4"
          style={{ backgroundColor: meta.bg }}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: meta.color }}>
              {meta.icon} {meta.label}
            </span>
            {item.note !== null && (
              <span className="text-sm font-bold" style={{ color: meta.color }}>
                {item.note}/100
              </span>
            )}
          </div>
          {item.feedback_ia && (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-700">
              {item.feedback_ia}
            </p>
          )}
          {item.suggestions.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {item.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: meta.color }}>•</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Astuces */}
      <div className="mt-4">
        {item.astuce && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            💡 {item.astuce}
          </p>
        )}
        {astuce ? (
          <div className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {astuce}
          </div>
        ) : (
          <button
            type="button"
            onClick={loadAstuce}
            disabled={astuceLoading}
            className="btn-secondary mt-2 !px-4 !py-2 text-sm"
          >
            {astuceLoading ? "Chargement…" : "💡 Comment obtenir ce document ?"}
          </button>
        )}
      </div>
    </div>
  );
}
