import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Capture les erreurs de rendu pour éviter une page blanche en production
 * et afficher un message exploitable à la place.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Visible dans la console du navigateur (utile pour diagnostiquer la prod).
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            maxWidth: 560,
            margin: "80px auto",
            padding: "0 5%",
            textAlign: "center",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <h1 style={{ color: "#0A0F2C", marginTop: 12 }}>Une erreur est survenue</h1>
          <p style={{ color: "#4A5580", marginTop: 8 }}>
            La page n'a pas pu s'afficher. Réessayez ; si le problème persiste,
            videz le cache (Ctrl+Shift+R).
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: "#F4F6FC",
              border: "1px solid #DDE3F5",
              borderRadius: 8,
              color: "#B91C1C",
              fontSize: "0.8rem",
              whiteSpace: "pre-wrap",
              textAlign: "left",
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign("/");
            }}
            style={{
              marginTop: 16,
              background: "#1434A4",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: 8,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
