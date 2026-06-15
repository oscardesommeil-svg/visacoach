import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import Diagnostic from "./pages/Diagnostic";
import Score from "./pages/Score";
import Rapport from "./pages/Rapport";
import Dossier from "./pages/Dossier";
import Conseils from "./pages/Conseils";
import Success from "./pages/Success";
import Offline from "./pages/Offline";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ResetPassword from "./pages/ResetPassword";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

/** Événement `beforeinstallprompt` (non standardisé dans lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Layout principal + routage de l'application.
 *
 * Tunnel : Home -> Diagnostic -> Score -> (paiement) -> Success -> Rapport
 */
export default function App() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Mon compte";

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate("/");
  };

  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  return (
    <div className="flex min-h-full flex-col">
      <header style={{ backgroundColor: "#1434A4" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#F7B731" }}
            >
              ✈
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Visa<span style={{ color: "#F7B731" }}>Coach</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            <a href="/#process" className="text-sm font-medium text-white/85 hover:text-white">
              Comment ça marche
            </a>
            <a href="/#pricing" className="text-sm font-medium text-white/85 hover:text-white">
              Tarifs
            </a>
            <a href="/#faq" className="text-sm font-medium text-white/85 hover:text-white">
              FAQ
            </a>
          </nav>

          {user ? (
            <div className="flex items-center gap-3">
              {/* Menu profil */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  👤 {firstName} ▾
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5">
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Mon tableau de bord
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Mes documents
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-slate-50"
                    >
                      Se déconnecter
                    </button>
                  </div>
                )}
              </div>
              <Link
                to="/dashboard"
                className="rounded-xl px-4 py-2 text-sm font-bold transition hover:brightness-95"
                style={{ backgroundColor: "#F7B731", color: "#0A0F2C" }}
              >
                Mon dossier →
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-white/90 hover:text-white"
              >
                Se connecter
              </Link>
              <Link
                to="/diagnostic"
                className="rounded-xl px-4 py-2 text-sm font-bold transition hover:brightness-95"
                style={{ backgroundColor: "#F7B731", color: "#0A0F2C" }}
              >
                Diagnostic gratuit →
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Bannière d'installation PWA */}
      {showInstallBanner && (
        <div
          style={{
            background: "#1434A4",
            color: "white",
            padding: "12px 5%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            📱 Installez VisaCoach sur votre téléphone pour un accès rapide
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleInstall}
              style={{
                background: "#F7B731",
                color: "#0A0F2C",
                border: "none",
                padding: "8px 18px",
                borderRadius: "6px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.82rem",
              }}
            >
              Installer
            </button>
            <button
              type="button"
              onClick={() => setShowInstallBanner(false)}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.3)",
                padding: "8px 14px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.82rem",
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/diagnostic" element={<Diagnostic />} />
          <Route path="/score/:id" element={<Score />} />
          <Route path="/rapport/:id" element={<Rapport />} />
          <Route path="/dossier/:diagnostic_id" element={<Dossier />} />
          <Route path="/conseils/:diagnostic_id" element={<Conseils />} />
          <Route path="/success" element={<Success />} />
          <Route path="/offline" element={<Offline />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} VisaCoach — Accompagnement méthodologique.
          Ne garantit pas l'obtention du visa.
        </div>
      </footer>

      {/* Bouton WhatsApp flottant (global) */}
      <a
        href="https://wa.me/33767787541?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20VisaCoach"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 1000,
          background: "#25D366",
          color: "white",
          borderRadius: "50px",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: 700,
          fontSize: "0.875rem",
          textDecoration: "none",
          boxShadow: "0 4px 20px rgba(37,211,102,0.4)",
        }}
      >
        💬 Une question ?
      </a>
    </div>
  );
}
