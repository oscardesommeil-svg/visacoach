interface DossierProgressProps {
  score: number; // 0-100
  valides: number;
  total: number;
}

function message(score: number): string {
  if (score >= 100) return "Félicitations, votre dossier est complet ! 🎉";
  if (score >= 75) return "Vous y êtes presque, continuez !";
  if (score >= 40) return "Bonne progression, encore quelques documents.";
  if (score > 0) return "C'est un bon début, poursuivez l'ajout de vos pièces.";
  return "Commencez par ajouter vos premiers documents.";
}

/**
 * Barre de progression globale du dossier.
 */
export default function DossierProgress({
  score,
  valides,
  total,
}: DossierProgressProps) {
  return (
    <div className="card">
      <div className="mb-2 flex items-end justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Progression du dossier
        </span>
        <span className="text-2xl font-extrabold text-slate-800">{score}%</span>
      </div>

      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {valides} / {total} document{total > 1 ? "s" : ""} validé
        {valides > 1 ? "s" : ""}. {message(score)}
      </p>
    </div>
  );
}
