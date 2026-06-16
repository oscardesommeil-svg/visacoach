import { useState } from "react";
import type { SimulationEntretien } from "../../lib/api";

interface SimulateurEntretienProps {
  simulation: SimulationEntretien;
}

/**
 * Simulation d'entretien Campus France : l'utilisateur répond librement,
 * puis révèle la réponse suggérée et ce que l'examinateur évalue.
 */
export default function SimulateurEntretien({
  simulation,
}: SimulateurEntretienProps) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const reveal = (i: number) =>
    setRevealed((prev) => new Set(prev).add(i));

  return (
    <div className="space-y-4">
      {simulation.questions.map((q, i) => (
        <div
          key={i}
          className="rounded-xl p-4"
          style={{ backgroundColor: "#F4F6FC", border: "1px solid #DDE3F5" }}
        >
          <p className="font-semibold text-slate-800">
            {i + 1}. {q.question}
          </p>

          <textarea
            value={answers[i] ?? ""}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, [i]: e.target.value }))
            }
            placeholder="Votre réponse…"
            className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand-500 focus:outline-none"
            rows={2}
          />

          {revealed.has(i) ? (
            <div className="mt-3 space-y-2 rounded-lg bg-white p-3 text-sm">
              <p>
                <span className="font-semibold" style={{ color: "#15803D" }}>
                  Réponse suggérée :
                </span>{" "}
                {q.reponse_suggeree}
              </p>
              <p className="text-slate-500">
                <span className="font-semibold">🎯 L'examinateur évalue :</span>{" "}
                {q.evaluation}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => reveal(i)}
              className="mt-3 text-sm font-semibold hover:underline"
              style={{ color: "#1434A4" }}
            >
              Voir la réponse suggérée →
            </button>
          )}
        </div>
      ))}

      {simulation.conseils.length > 0 && (
        <div className="rounded-xl bg-white p-4" style={{ border: "1px solid #DDE3F5" }}>
          <p className="mb-2 font-bold text-slate-800">💡 Conseils de présentation</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {simulation.conseils.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: "#1434A4" }}>•</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
