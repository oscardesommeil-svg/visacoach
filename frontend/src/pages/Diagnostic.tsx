import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionCard from "../components/QuestionCard";
import { api, type Answer, type Question } from "../lib/api";

/**
 * Parcours du diagnostic : on charge les 7 questions, l'utilisateur répond,
 * puis saisit ses coordonnées avant l'envoi. Redirige vers /score/:id.
 */
export default function Diagnostic() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getQuestions()
      .then((data) => setQuestions(data.questions))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Avance automatiquement à la question suivante (ou au formulaire final).
    setTimeout(() => {
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1);
      } else {
        setShowForm(true);
      }
    }, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const answersList: Answer[] = questions.map((q) => ({
      question_id: q.id,
      value: answers[q.id],
    }));

    try {
      const result = await api.submitDiagnostic({
        email,
        full_name: fullName || undefined,
        country: country || undefined,
        answers: answersList,
      });
      navigate(`/score/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-slate-500">Chargement…</p>;
  }

  if (error && questions.length === 0) {
    return (
      <p className="py-20 text-center text-red-600">
        Impossible de charger le diagnostic : {error}
      </p>
    );
  }

  // Étape finale : formulaire de coordonnées.
  if (showForm) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">
          Presque terminé !
        </h1>
        <p className="mb-6 text-slate-600">
          Indiquez vos coordonnées pour recevoir votre score et votre rapport.
        </p>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nom complet
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Awa Diop"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Pays d'origine
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Sénégal"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Calcul en cours…" : "Voir mon score"}
          </button>
        </form>
      </div>
    );
  }

  // Étapes des questions.
  const question = questions[current];
  return (
    <div className="mx-auto max-w-lg">
      {/* Barre de progression */}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <QuestionCard
        question={question}
        index={current}
        total={questions.length}
        selected={answers[question.id]}
        onSelect={(value) => handleSelect(question.id, value)}
      />

      {current > 0 && (
        <button
          type="button"
          onClick={() => setCurrent((c) => c - 1)}
          className="mt-4 text-sm text-slate-500 hover:text-slate-700"
        >
          ← Question précédente
        </button>
      )}
    </div>
  );
}
