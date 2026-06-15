import { useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import ConseilsEntretien from "../components/ConseilsEntretien";
import PDFEditor from "../components/PDFEditor";
import { api, type Conseils as ConseilsData } from "../lib/api";

type GenKey = "lettre" | "invitation" | "plan" | "conseils";

interface PdfEditorState {
  title: string;
  content: string;
  documentType: string;
}

/**
 * Page « Conseils & Outils » : générateurs IA. Les documents (lettre, invitation,
 * programme) s'ouvrent dans l'éditeur PDF ; les conseils s'affichent en ligne.
 */
export default function Conseils() {
  const { diagnostic_id: id } = useParams<{ diagnostic_id: string }>();

  const [loading, setLoading] = useState<GenKey | null>(null);
  const [errors, setErrors] = useState<Partial<Record<GenKey, string>>>({});
  const [conseils, setConseils] = useState<ConseilsData | null>(null);
  const [pdfEditor, setPdfEditor] = useState<PdfEditorState | null>(null);

  // Responsive : bascule en colonne sous 600px.
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 600,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  async function run<T>(
    key: GenKey,
    fn: () => Promise<T>,
    onOk: (value: T) => void,
  ) {
    if (!id) return;
    setLoading(key);
    setErrors((e) => ({ ...e, [key]: undefined }));
    try {
      onOk(await fn());
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [key]: err instanceof Error ? err.message : "Erreur de génération.",
      }));
    } finally {
      setLoading(null);
    }
  }

  const handleLettre = () =>
    run("lettre", () => api.generateLettreMotivation(id!), (r) =>
      setPdfEditor({
        title: "Lettre de motivation",
        content: r.content,
        documentType: "lettre_motivation",
      }),
    );
  const handleInvitation = () =>
    run("invitation", () => api.generateLettreInvitation(id!), (r) =>
      setPdfEditor({
        title: "Lettre d'invitation",
        content: r.content,
        documentType: "invitation",
      }),
    );
  const handleProgramme = () =>
    run("plan", () => api.generatePlanSejour(id!), (r) =>
      setPdfEditor({
        title: "Programme de séjour",
        content: r.content,
        documentType: "programme_sejour",
      }),
    );
  const handleConseils = () =>
    run("conseils", () => api.generateConseils(id!), setConseils);

  if (!id) return null;

  const items: {
    key: GenKey;
    icon: string;
    label: string;
    btnLabel: string;
    action: () => void;
  }[] = [
    {
      key: "lettre",
      icon: "✉️",
      label: "Lettre de motivation",
      btnLabel: "Générer ma lettre",
      action: handleLettre,
    },
    {
      key: "invitation",
      icon: "👨‍👩‍👧",
      label: "Lettre d'invitation (modèle)",
      btnLabel: "Générer le modèle",
      action: handleInvitation,
    },
    {
      key: "plan",
      icon: "📅",
      label: "Programme de séjour",
      btnLabel: "Générer mon programme",
      action: handleProgramme,
    },
    {
      key: "conseils",
      icon: "🎯",
      label: "Conseils personnalisés",
      btnLabel: "Générer mes conseils",
      action: handleConseils,
    },
  ];

  const rowStyle: CSSProperties = {
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: "space-between",
    background: "#F4F6FC",
    border: "1px solid #DDE3F5",
    borderRadius: "12px",
    padding: "20px 24px",
    gap: "16px",
  };

  const btnStyle: CSSProperties = {
    background: "#1434A4",
    color: "white",
    border: "none",
    padding: "10px 22px",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "0.875rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    width: isMobile ? "100%" : "auto",
    opacity: loading !== null ? 0.7 : 1,
  };

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/dossier/${id}`}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Retour au dossier
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Conseils & Outils</h1>
        <p className="mt-2 text-slate-600">
          Générez vos documents et obtenez des conseils personnalisés par l'IA.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {items.map((item) => (
          <div key={item.key}>
            <div style={rowStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span style={{ fontSize: "1.6rem" }}>{item.icon}</span>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0A0F2C" }}>
                  {item.label}
                </span>
              </div>
              <button
                type="button"
                onClick={item.action}
                disabled={loading !== null}
                style={btnStyle}
              >
                {loading === item.key ? "Génération…" : item.btnLabel}
              </button>
            </div>

            {errors[item.key] && (
              <p style={{ color: "#dc2626", fontSize: "0.85rem", marginTop: "8px" }}>
                {errors[item.key]}
              </p>
            )}

            {item.key === "conseils" && conseils && (
              <div style={{ marginTop: "12px" }}>
                <ConseilsEntretien conseils={conseils} />
              </div>
            )}
          </div>
        ))}
      </div>

      {pdfEditor && (
        <PDFEditor
          title={pdfEditor.title}
          content={pdfEditor.content}
          documentType={pdfEditor.documentType}
          diagnosticId={id}
          onClose={() => setPdfEditor(null)}
        />
      )}
    </div>
  );
}
