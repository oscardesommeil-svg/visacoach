import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { API_URL } from "../lib/api";

interface PDFEditorProps {
  title: string;
  content: string; // Contenu initial généré par l'IA
  documentType: string;
  diagnosticId: string;
  onClose: () => void;
}

const C = {
  blue: "#1434A4",
  gold: "#F7B731",
  ink: "#0A0F2C",
  slate: "#4A5580",
  mist: "#F4F6FC",
  border: "#DDE3F5",
  white: "#FFFFFF",
};

/**
 * Éditeur de document avec aperçu Markdown, puis téléchargement en PDF
 * (généré côté backend via reportlab).
 */
export default function PDFEditor({
  title,
  content,
  documentType,
  diagnosticId,
  onClose,
}: PDFEditorProps) {
  const [text, setText] = useState(content);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/generation/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: text,
          document_type: documentType,
          diagnostic_id: diagnosticId,
        }),
      });
      if (!response.ok) throw new Error("Erreur lors de la génération du PDF.");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visacoach_${documentType}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du téléchargement.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: C.white,
          borderRadius: "16px",
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: C.blue,
            color: C.white,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>📄 {title}</div>
            <div style={{ fontSize: "0.78rem", opacity: 0.7, marginTop: "2px" }}>
              Modifiez le document puis téléchargez en PDF
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: C.white,
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Corps : éditeur + aperçu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Éditeur */}
          <div
            style={{
              borderRight: `1px solid ${C.border}`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "10px 16px",
                background: C.mist,
                borderBottom: `1px solid ${C.border}`,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: C.slate,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              ✏️ Éditeur
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{
                flex: 1,
                padding: "16px",
                border: "none",
                outline: "none",
                resize: "none",
                fontFamily: "monospace",
                fontSize: "0.82rem",
                lineHeight: 1.7,
                color: C.ink,
                background: C.white,
              }}
            />
          </div>

          {/* Aperçu */}
          <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
              style={{
                padding: "10px 16px",
                background: C.mist,
                borderBottom: `1px solid ${C.border}`,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: C.slate,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              👁️ Aperçu
            </div>
            <div
              className="prose prose-slate max-w-none"
              style={{
                flex: 1,
                overflow: "auto",
                padding: "20px",
                fontSize: "0.85rem",
                lineHeight: 1.7,
                color: C.ink,
              }}
            >
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            alignItems: "center",
            flexWrap: "wrap",
            background: C.mist,
          }}
        >
          {error && (
            <span style={{ marginRight: "auto", color: "#dc2626", fontSize: "0.82rem" }}>
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              color: C.slate,
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            {copied ? "✅ Copié !" : "📋 Copier le texte"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            style={{
              background: C.blue,
              color: C.white,
              border: "none",
              padding: "10px 24px",
              borderRadius: "8px",
              fontWeight: 700,
              cursor: downloading ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              opacity: downloading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {downloading ? "⏳ Génération..." : "⬇️ Télécharger PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
