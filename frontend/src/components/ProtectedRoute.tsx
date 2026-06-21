import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Protège une route : affiche un état de chargement le temps de résoudre la
 * session, puis redirige vers /login (en mémorisant l'URL demandée) si
 * l'utilisateur n'est pas connecté.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "2rem" }}>⏳</div>
        <p style={{ color: "#4A5580", fontSize: "0.9rem" }}>Chargement…</p>
      </div>
    );
  }

  if (!user) {
    // Mémorise l'URL demandée pour y revenir après la connexion.
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
