import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

/**
 * Page de retour après paiement (CinetPay ou Stripe).
 *
 * On récupère l'identifiant du diagnostic mémorisé avant la redirection,
 * on déclenche la génération du rapport, puis on redirige vers /rapport/:id.
 * La vérification réelle du paiement est faite côté backend (webhook /
 * notification serveur->serveur) avant toute génération.
 */
export default function Success() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Vérification de votre paiement…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const diagnosticId = localStorage.getItem("visacoach_diagnostic_id");
    if (!diagnosticId) {
      setError("Impossible de retrouver votre diagnostic. Contactez le support.");
      return;
    }

    let attempts = 0;
    const maxAttempts = 8;

    async function tryGenerate() {
      attempts += 1;
      try {
        setStatus("Génération de votre rapport personnalisé…");
        await api.generateReport(diagnosticId!);
        localStorage.removeItem("visacoach_diagnostic_id");
        navigate(`/rapport/${diagnosticId}`);
      } catch (err) {
        // Le paiement n'est peut-être pas encore confirmé côté backend :
        // on réessaie quelques fois avant d'abandonner.
        if (attempts < maxAttempts) {
          setStatus(
            `Confirmation du paiement en cours… (tentative ${attempts}/${maxAttempts})`,
          );
          setTimeout(tryGenerate, 3000);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Le paiement n'a pas pu être confirmé. Réessayez dans quelques minutes.",
          );
        }
      }
    }

    tryGenerate();
  }, [navigate]);

  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      {error ? (
        <>
          <h1 className="text-2xl font-bold text-red-600">Un souci est survenu</h1>
          <p className="mt-4 text-slate-600">{error}</p>
        </>
      ) : (
        <>
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <h1 className="text-2xl font-bold text-slate-800">Merci !</h1>
          <p className="mt-4 text-slate-600">{status}</p>
        </>
      )}
    </div>
  );
}
