import type { Bourse } from "../../lib/api";

interface BourseCardProps {
  bourse: Bourse;
  /** Pays d'origine de l'utilisateur (pour estimer l'éligibilité). */
  userCountry?: string;
}

/**
 * Carte d'une bourse : montant mis en avant, deadline, difficulté, lien officiel.
 */
export default function BourseCard({ bourse, userCountry }: BourseCardProps) {
  const eligible =
    !!userCountry &&
    bourse.eligible_pays.some(
      (p) => p.toLowerCase() === userCountry.toLowerCase(),
    );

  return (
    <div
      className="rounded-2xl bg-white p-5"
      style={{ border: "1px solid #DDE3F5" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-800">{bourse.nom}</h4>
          <p className="text-xs text-slate-500">{bourse.organisme}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={
            eligible
              ? { backgroundColor: "#DCFCE7", color: "#15803D" }
              : { backgroundColor: "#FEF3C7", color: "#B45309" }
          }
        >
          {eligible ? "✓ Éligible" : "Vérifier"}
        </span>
      </div>

      <p className="mt-3 text-2xl font-extrabold" style={{ color: "#1434A4" }}>
        {bourse.montant}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
        <span>📅 {bourse.deadline}</span>
        <span>🎯 {bourse.difficulte}</span>
        <span>🎓 {bourse.niveau.join(", ")}</span>
      </div>

      <a
        href={bourse.lien}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-sm font-semibold hover:underline"
        style={{ color: "#1434A4" }}
      >
        Voir l'offre officielle →
      </a>
    </div>
  );
}
