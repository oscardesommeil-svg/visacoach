import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ScoreGauge from "../components/ScoreGauge";
import PaymentModal from "../components/PaymentModal";
import { api, type DiagnosticResult } from "../lib/api";

/**
 * Affiche le score du diagnostic et propose de débloquer le rapport payant.
 */
export default function Score() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .getDiagnostic(id)
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="py-20 text-center text-slate-500">Chargement…</p>;
  }

  if (error || !result) {
    return (
      <p className="py-20 text-center text-red-600">
        {error ?? "Diagnostic introuvable."}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-center text-3xl font-bold text-slate-900">
        Votre score de diagnostic
      </h1>

      <div className="card flex flex-col items-center">
        <ScoreGauge score={result.score} level={result.level} />
        <p className="mt-6 text-center text-slate-600">{result.summary}</p>
      </div>

      {/* Offre de déblocage */}
      <div className="card mt-8 border-brand-200 bg-brand-50/40">
        <h2 className="text-xl font-bold text-slate-800">
          Allez plus loin avec votre rapport personnalisé
        </h2>
        <ul className="mt-4 space-y-2 text-slate-600">
          <li className="flex gap-2">
            <span className="text-brand-600">✓</span> Analyse détaillée de vos
            points forts et faiblesses
          </li>
          <li className="flex gap-2">
            <span className="text-brand-600">✓</span> Plan d'action concret pour
            renforcer votre dossier
          </li>
          <li className="flex gap-2">
            <span className="text-brand-600">✓</span> Rapport rédigé par IA, reçu
            par email
          </li>
        </ul>

        <div className="mt-6">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Confirmez votre email pour le paiement
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="vous@exemple.com"
          />
        </div>

        <button
          type="button"
          disabled={!email}
          onClick={() => setShowPayment(true)}
          className="btn-primary mt-4 w-full"
        >
          Débloquer mon rapport
        </button>
      </div>

      {showPayment && id && (
        <PaymentModal
          diagnosticId={id}
          email={email}
          onClose={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
