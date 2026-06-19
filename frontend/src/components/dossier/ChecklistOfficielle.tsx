import type { ChecklistItem } from "../../lib/api";
import { STATUT_META } from "../../lib/dossier";

interface ChecklistOfficielleProps {
  items: ChecklistItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Liste des documents requis (checklist officielle) avec statut visuel.
 */
export default function ChecklistOfficielle({
  items,
  selectedId,
  onSelect,
}: ChecklistOfficielleProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const meta = STATUT_META[item.statut];
        const selected = selectedId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${
              selected
                ? "border-brand-600 bg-brand-50"
                : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-800">
                {item.label}
                {!item.obligatoire && (
                  <span className="ml-1 text-xs font-normal text-slate-400">
                    (recommandé)
                  </span>
                )}
              </span>
            </span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: meta.bg, color: meta.color }}
            >
              {meta.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
