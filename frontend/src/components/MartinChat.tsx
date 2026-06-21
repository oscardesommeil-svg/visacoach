import { useEffect, useRef, useState } from "react";
import MartinAvatar from "./MartinAvatar";

interface MartinChatProps {
  dossierId?: string; // contexte du dossier pour réponses personnalisées
  diagnosticData?: Record<string, unknown> | null; // données pour personnaliser
  context?: "diagnostic" | "dossier" | "rapport" | "general";
}

interface Message {
  role: "martin" | "user";
  content: string;
  timestamp: Date;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const C = {
  blue: "#1434A4",
  gold: "#F7B731",
  ink: "#0A0F2C",
  slate: "#4A5580",
  mist: "#F4F6FC",
  border: "#DDE3F5",
  white: "#FFFFFF",
};

/** Widget de chat flottant : Martin, le conseiller visa de VisaCoach. */
export default function MartinChat({
  dossierId,
  diagnosticData,
  context = "general",
}: MartinChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Message d'accueil de Martin (au premier ouvrage du chat).
  useEffect(() => {
    if (open && !initialized) {
      setInitialized(true);
      const typeVisa = (diagnosticData?.type_visa as string) ?? "";
      const dest = (diagnosticData?.pays_destination as string) ?? "";
      const welcome: Message = {
        role: "martin",
        content:
          context === "dossier" && diagnosticData
            ? `Bonjour ! Je suis Martin, votre conseiller visa chez VisaCoach. J'ai votre dossier ${typeVisa} pour ${dest} sous les yeux. Posez-moi toutes vos questions — je suis là pour maximiser vos chances ! 🎯`
            : `Bonjour ! Je suis Martin, votre conseiller visa chez VisaCoach. Je connais les procédures consulaires pour la France, le Canada et les USA. Quelle est votre question ? 😊`,
        timestamp: new Date(),
      };
      setMessages([welcome]);
    }
  }, [open, initialized, context, diagnosticData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/martin/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role === "martin" ? "assistant" : "user",
            content: m.content,
          })),
          context,
          diagnostic_data: diagnosticData ?? null,
          dossier_id: dossierId ?? null,
        }),
      });

      if (!response.ok) throw new Error("Réponse invalide");
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "martin",
          content:
            data.response ||
            "Désolé, je n'ai pas pu formuler de réponse. Pouvez-vous reformuler ?",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "martin",
          content:
            "Désolé, je rencontre un problème technique. Réessayez dans quelques instants ou contactez-nous via WhatsApp.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant Martin */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
            background: C.blue,
            color: C.white,
            border: "none",
            borderRadius: "50px",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 700,
            fontSize: "0.875rem",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(20,52,164,0.4)",
            fontFamily: "inherit",
          }}
        >
          <MartinAvatar size="sm" withStatus />
          <span>Parler à Martin</span>
        </button>
      )}

      {/* Fenêtre de chat */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
            width: "360px",
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "520px",
            background: C.white,
            borderRadius: "16px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: `1px solid ${C.border}`,
          }}
        >
          {/* Header */}
          <div
            style={{
              background: C.blue,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <MartinAvatar size="sm" withStatus />
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: C.white }}>Martin</div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.7)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      background: "#4ADE80",
                      borderRadius: "50%",
                      display: "inline-block",
                    }}
                  />
                  Conseiller visa · En ligne
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                color: C.white,
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              background: C.mist,
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  flexDirection: msg.role === "user" ? "row-reverse" : "row",
                }}
              >
                {msg.role === "martin" && <MartinAvatar size="sm" />}
                <div
                  style={{
                    maxWidth: "80%",
                    background: msg.role === "martin" ? C.white : C.blue,
                    color: msg.role === "martin" ? C.ink : C.white,
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "martin" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                    fontSize: "0.85rem",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <MartinAvatar size="sm" />
                <div
                  style={{
                    background: C.white,
                    padding: "10px 14px",
                    borderRadius: "4px 14px 14px 14px",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: "6px",
                        height: "6px",
                        background: C.slate,
                        borderRadius: "50%",
                        animation: `martin-bounce 1s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: "12px",
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: "8px",
              background: C.white,
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Posez votre question à Martin..."
              style={{
                flex: 1,
                border: `1px solid ${C.border}`,
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.85rem",
                outline: "none",
                fontFamily: "inherit",
                color: C.ink,
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: input.trim() ? C.blue : C.border,
                color: C.white,
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                cursor: input.trim() ? "pointer" : "not-allowed",
                fontSize: "0.85rem",
                fontWeight: 700,
                transition: "background 0.2s",
              }}
            >
              →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes martin-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
