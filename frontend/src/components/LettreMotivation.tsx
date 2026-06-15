import { useState } from "react";
import ReactMarkdown from "react-markdown";

interface LettreMotivationProps {
  title: string;
  content: string;
  /** Rendre en Markdown (programme de séjour) plutôt qu'en texte brut (lettre). */
  markdown?: boolean;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Affiche un texte généré par l'IA (lettre, programme…) avec copie et impression.
 */
export default function LettreMotivation({
  title,
  content,
  markdown,
}: LettreMotivationProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponible */
    }
  }

  function handlePrint() {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(
      `<html><head><title>${escapeHtml(title)}</title>` +
        "<style>body{font-family:Georgia,serif;white-space:pre-wrap;" +
        "padding:48px;line-height:1.6;color:#1e293b;}</style></head><body>" +
        escapeHtml(content) +
        "</body></html>",
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            {copied ? "Copié ✓" : "Copier"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Imprimer
          </button>
        </div>
      </div>

      {markdown ? (
        <div className="prose prose-slate max-w-none prose-headings:font-bold">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <div className="whitespace-pre-wrap font-serif leading-relaxed text-slate-700">
          {content}
        </div>
      )}
    </div>
  );
}
