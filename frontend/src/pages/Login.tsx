import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

const BLUE = "#1434A4";
const GOLD = "#F7B731";
const INK = "#0A0F2C";
const SLATE = "#4A5580";
const BORDER = "#DDE3F5";

const COUNTRIES = [
  "Sénégal",
  "Côte d'Ivoire",
  "Cameroun",
  "Mali",
  "Congo",
  "Burkina Faso",
  "Bénin",
  "Togo",
  "Autres",
];

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1px solid ${BORDER}`,
  fontSize: "0.95rem",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: "4px",
  fontSize: "0.85rem",
  fontWeight: 600,
  color: SLATE,
};

type Tab = "login" | "signup";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");

  // Champs partagés
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Inscription
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate("/dashboard");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, country },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate("/dashboard");
    } else {
      setInfo(
        "Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse, " +
          "puis connectez-vous.",
      );
      setTab("login");
    }
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1
        className="text-center text-3xl font-bold"
        style={{ fontFamily: "'Merriweather', Georgia, serif", color: INK }}
      >
        {tab === "login" ? "Se connecter" : "Créer un compte"}
      </h1>
      <p className="mt-2 text-center" style={{ color: SLATE }}>
        Retrouvez votre dossier visa à tout moment.
      </p>

      {/* Onglets */}
      <div
        className="mt-6 flex rounded-xl p-1"
        style={{ backgroundColor: "#EBF0FF" }}
      >
        {(["login", "signup"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              setError(null);
              setInfo(null);
            }}
            className="flex-1 rounded-lg py-2 text-sm font-semibold transition"
            style={
              tab === t
                ? { backgroundColor: "white", color: BLUE, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                : { color: SLATE }
            }
          >
            {t === "login" ? "Connexion" : "Inscription"}
          </button>
        ))}
      </div>

      <div className="card mt-6">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {info}
          </p>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="vous@exemple.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              style={{ backgroundColor: BLUE }}
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <div className="text-center">
              <Link
                to="/reset-password"
                className="text-sm hover:underline"
                style={{ color: BLUE }}
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Prénom</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={inputStyle}
                  placeholder="Awa"
                />
              </div>
              <div>
                <label style={labelStyle}>Nom</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={inputStyle}
                  placeholder="Diop"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="vous@exemple.com"
              />
            </div>
            <div>
              <label style={labelStyle}>Mot de passe (min. 8 caractères)</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label style={labelStyle}>Pays d'origine</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={inputStyle}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 font-bold transition hover:brightness-95 disabled:opacity-60"
              style={{ backgroundColor: GOLD, color: INK }}
            >
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>
        )}

        {/* Séparateur + Google */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1" style={{ backgroundColor: BORDER }} />
          <span className="text-xs" style={{ color: SLATE }}>
            ou
          </span>
          <span className="h-px flex-1" style={{ backgroundColor: BORDER }} />
        </div>
        <button
          type="button"
          onClick={handleGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 font-semibold transition hover:bg-slate-50"
          style={{ borderColor: BORDER, color: INK }}
        >
          <span>🔵</span> Continuer avec Google
        </button>
      </div>

      <p className="mt-6 text-center text-sm" style={{ color: SLATE }}>
        {tab === "login" ? (
          <>
            Pas encore de compte ?{" "}
            <button
              type="button"
              onClick={() => setTab("signup")}
              className="font-semibold hover:underline"
              style={{ color: BLUE }}
            >
              S'inscrire
            </button>
          </>
        ) : (
          <>
            Déjà un compte ?{" "}
            <button
              type="button"
              onClick={() => setTab("login")}
              className="font-semibold hover:underline"
              style={{ color: BLUE }}
            >
              Se connecter
            </button>
          </>
        )}
      </p>
    </div>
  );
}
