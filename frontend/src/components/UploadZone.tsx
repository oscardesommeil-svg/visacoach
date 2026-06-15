import { useRef, useState } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  busy?: boolean; // upload + analyse en cours
  busyLabel?: string;
}

const ACCEPTED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

/**
 * Zone de dépôt drag & drop (ou clic) pour uploader un document.
 * Valide le type et la taille, puis remonte le fichier au parent via `onFile`.
 */
export default function UploadZone({ onFile, busy, busyLabel }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateAndSend(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError("Format non supporté. Utilisez un PDF, un JPG ou un PNG.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Fichier trop volumineux (max 5 Mo).");
      return;
    }
    onFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSend(file);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy)
            inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragOver
            ? "border-brand-600 bg-brand-50"
            : "border-slate-300 bg-slate-50 hover:border-brand-400"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        {busy ? (
          <>
            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="font-medium text-slate-700">
              {busyLabel ?? "Traitement en cours…"}
            </p>
          </>
        ) : (
          <>
            <span className="text-4xl">📤</span>
            <p className="mt-3 font-medium text-slate-700">
              Glissez votre fichier ici ou cliquez pour choisir
            </p>
            <p className="mt-1 text-xs text-slate-400">PDF, JPG ou PNG — max 5 Mo</p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSend(file);
            e.target.value = ""; // permet de re-sélectionner le même fichier
          }}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
