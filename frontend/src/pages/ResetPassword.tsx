import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BLUE = "#1434A4";
const INK = "#0A0F2C";
const SLATE = "#4A5580";
const BORDER = "#DDE3F5";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1px solid ${BORDER}`,
  fontSize: "0.95rem",
  outline: "none",
};

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <h1
        className="text-center text-3xl font-bold"
        style={{ fontFamily: "'Merriweather', Georgia, serif", color: INK }}
      >
        Mot de passe oublié
      </h1>

      <div className="card mt-6">
        {sent ? (
          <div className="text-center">
            <div className="mb-3 text-4xl">📧</div>
            <p style={{ color: SLATE }}>
              Si un compte existe pour <strong>{email}</strong>, un lien de
              réinitialisation vient d'être envoyé. Pensez à vérifier vos spams.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm" style={{ color: SLATE }}>
              Entrez votre email : nous vous enverrons un lien pour réinitialiser
              votre mot de passe.
            </p>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="vous@exemple.com"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: BLUE }}
            >
              {loading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold hover:underline" style={{ color: BLUE }}>
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
