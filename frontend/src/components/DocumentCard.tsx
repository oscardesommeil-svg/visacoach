import type { DossierDocument } from "../lib/api";
import { docMeta, STATUS_META } from "../lib/documents";

interface DocumentCardProps {
  type: string;
  doc?: DossierDocument;
  selected: boolean;
  analyzing?: boolean;
  onSelect: () => void;
}

/**
 * Carte d'un document requis : icône, libellé, statut visuel, sélectionnable.
 */
export default function DocumentCard({
  type,
  doc,
  selected,
  analyzing,
  onSelect,
}: DocumentCardProps) {
  const meta = docMeta(type);
  const status = doc?.status ?? "EN_ATTENTE";
  const statusMeta = STATUS_META[status];

  // État "analyse en cours" (transitoire, piloté par le parent).
  const badge = analyzing
    ? { icon: "🔄", label: "Analyse en cours", color: "text-brand-600", bg: "bg-brand-50" }
    : statusMeta;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
        selected
          ? "border-brand-600 bg-brand-50"
          : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
      }`}
    >
      <span className="text-2xl">{meta.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-800">
          {meta.label}
        </span>
        <span
          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.color}`}
        >
          <span className={analyzing ? "animate-spin" : ""}>{badge.icon}</span>
          {badge.label}
        </span>
      </span>
    </button>
  );
}
