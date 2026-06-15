import type { DossierDocument } from "../lib/api";
import { STATUS_META } from "../lib/documents";

interface FeedbackIAProps {
  doc: DossierDocument;
}

/**
 * Affiche le retour de l'analyse IA pour un document : statut coloré,
 * explication et suggestions correctives.
 */
export default function FeedbackIA({ doc }: FeedbackIAProps) {
  if (doc.status === "EN_ATTENTE") return null;

  const meta = STATUS_META[doc.status];

  return (
    <div className={`rounded-xl border p-4 ${meta.bg} border-transparent`}>
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-2 font-semibold ${meta.color}`}>
          <span>{meta.icon}</span> {meta.label}
        </span>
        {doc.note !== null && (
          <span className={`text-sm font-bold ${meta.color}`}>{doc.note}/100</span>
        )}
      </div>

      {doc.feedback && (
        <p className="mt-3 whitespace-pre-line text-sm text-slate-700">
          {doc.feedback}
        </p>
      )}

      {doc.suggestions && doc.suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Suggestions
          </p>
          <ul className="mt-1 space-y-1 text-sm text-slate-700">
            {doc.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className={meta.color}>•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
