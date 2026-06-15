/**
 * Page affichée hors connexion.
 * (Le shell de l'app est précaché par le service worker ; cette page sert de
 *  repli explicite et de point de re-tentative.)
 */
export default function Offline() {
  return (
    <div style={{ textAlign: "center", padding: "80px 5%" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>📡</div>
      <h1
        style={{
          fontFamily: "'Merriweather', Georgia, serif",
          fontSize: "1.8rem",
          marginBottom: "12px",
          color: "#0A0F2C",
        }}
      >
        Pas de connexion internet
      </h1>
      <p style={{ color: "#4A5580", marginBottom: "24px" }}>
        Reconnectez-vous pour accéder à VisaCoach. Vos données de diagnostic sont
        sauvegardées.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: "#1434A4",
          color: "white",
          border: "none",
          padding: "12px 28px",
          borderRadius: "8px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
