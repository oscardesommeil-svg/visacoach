import type { Conseils } from "../lib/api";

interface ConseilsEntretienProps {
  conseils: Conseils;
}

interface SectionProps {
  title: string;
  icon: string;
  items: string[];
  tone?: "default" | "danger" | "success";
}

function Section({ title, icon, items, tone = "default" }: SectionProps) {
  if (items.length === 0) return null;
  const bullet =
    tone === "danger"
      ? "text-red-500"
      : tone === "success"
        ? "text-green-600"
        : "text-brand-600";
  return (
    <div className="card">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
        <span>{icon}</span> {title}
      </h3>
      <ul className="space-y-2 text-sm text-slate-700">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className={`mt-0.5 shrink-0 ${bullet}`}>
              {tone === "danger" ? "✕" : "•"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Affiche les conseils personnalisés structurés (entretien, dossier, erreurs…).
 */
export default function ConseilsEntretien({ conseils }: ConseilsEntretienProps) {
  return (
    <div className="space-y-4">
      <Section
        title="Conseils pour l'entretien consulaire"
        icon="🎤"
        items={conseils.entretien}
      />
      <Section
        title="Présentation du dossier"
        icon="📁"
        items={conseils.dossier}
        tone="success"
      />
      <Section
        title="Erreurs à éviter"
        icon="🚫"
        items={conseils.erreurs_a_eviter}
        tone="danger"
      />
      <Section
        title="Renforcer vos points faibles"
        icon="💪"
        items={conseils.points_faibles}
      />
      {conseils.delais && (
        <div className="card">
          <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800">
            <span>⏳</span> Délais à anticiper
          </h3>
          <p className="whitespace-pre-line text-sm text-slate-700">
            {conseils.delais}
          </p>
        </div>
      )}
    </div>
  );
}
