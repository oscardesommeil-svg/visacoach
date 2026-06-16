import type { ReactNode } from "react";

type ModuleStatus = "todo" | "doing" | "done";

interface ModuleCardProps {
  icon: string;
  title: string;
  status: ModuleStatus;
  isOpen: boolean;
  onToggle: () => void;
  actionLabel?: string;
  onAction?: () => void;
  loading?: boolean;
  children?: ReactNode;
}

const STATUS = {
  todo: { icon: "⬜", label: "À faire", color: "#4A5580", bg: "#F4F6FC" },
  doing: { icon: "🔄", label: "En cours", color: "#1434A4", bg: "#EBF0FF" },
  done: { icon: "✅", label: "Complété", color: "#15803D", bg: "#DCFCE7" },
};

/**
 * Carte de module (accordéon) du parcours étudiant.
 */
export default function ModuleCard({
  icon,
  title,
  status,
  isOpen,
  onToggle,
  actionLabel,
  onAction,
  loading,
  children,
}: ModuleCardProps) {
  const s = STATUS[status];

  return (
    <div className="card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <span className="font-bold text-slate-800">{title}</span>
        </span>
        <span className="flex items-center gap-3">
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: s.bg, color: s.color }}
          >
            {s.icon} {s.label}
          </span>
          <span className="text-slate-400">{isOpen ? "▲" : "▼"}</span>
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 py-5">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              disabled={loading}
              className="btn-primary mb-4 !px-5 !py-2.5 text-sm disabled:opacity-60"
            >
              {loading ? "Génération…" : actionLabel}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
