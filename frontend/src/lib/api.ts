// Client API VisaCoach : enveloppe fetch typée vers le backend FastAPI.

import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Renvoie l'en-tête X-User-Id si un utilisateur est connecté, sinon {}. */
async function userIdHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user?.id;
    return id ? { "X-User-Id": id } : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Types partagés
// ---------------------------------------------------------------------------
export interface QuestionOption {
  value: string;
  label: string;
}

export interface Question {
  id: string;
  label: string;
  options: QuestionOption[];
}

export interface Answer {
  question_id: string;
  value: string;
}

export type Level = "faible" | "moyen" | "bon" | "excellent";

export interface DiagnosticResult {
  id: string;
  score: number;
  level: Level;
  summary: string;
}

export type Plan = "rapport" | "suivi";
export type Provider = "cinetpay" | "stripe";

export interface CheckoutResult {
  order_id: string;
  provider: Provider;
  payment_url: string;
}

export interface Report {
  id: string;
  diagnostic_id: string;
  plan: Plan;
  content: string;
  email_sent: boolean;
}

// --- Dossier ---------------------------------------------------------
export type DocStatus = "EN_ATTENTE" | "VALIDE" | "ATTENTION" | "PROBLEME";

export interface DossierDocument {
  id: string;
  diagnostic_id: string;
  type: string;
  filename: string;
  status: DocStatus;
  note: number | null;
  feedback: string | null;
  suggestions: string[] | null;
}

export interface DossierProgress {
  diagnostic_id: string;
  score_global: number;
  documents_requis: string[];
  documents_valides: number;
  documents_total: number;
}

// --- Génération IA ---------------------------------------------------
export interface GeneratedText {
  content: string;
}

export interface Conseils {
  entretien: string[];
  dossier: string[];
  erreurs_a_eviter: string[];
  delais: string;
  points_faibles: string[];
}

// ---------------------------------------------------------------------------
// Helper générique
// ---------------------------------------------------------------------------
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeader = await userIdHeader();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    let message = `Erreur ${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) message = data.detail;
    } catch {
      // réponse non-JSON : on garde le message par défaut
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
export const api = {
  // Diagnostics
  getQuestions: () =>
    request<{ questions: Question[] }>("/api/diagnostics/questions"),

  submitDiagnostic: (payload: {
    email: string;
    full_name?: string;
    country?: string;
    answers: Answer[];
  }) =>
    request<DiagnosticResult>("/api/diagnostics", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getDiagnostic: (id: string) =>
    request<DiagnosticResult>(`/api/diagnostics/${id}`),

  // Diagnostics de l'utilisateur connecté (lus côté backend via service_role,
  // l'en-tête X-User-Id est ajouté automatiquement par request()).
  listUserDiagnostics: () =>
    request<
      {
        id: string;
        score: number;
        level: Level;
        answers: Answer[];
        created_at: string;
      }[]
    >("/api/diagnostics/mine"),

  // Paiements
  checkout: (
    provider: Provider,
    payload: {
      diagnostic_id: string;
      email: string;
      plan: Plan;
      full_name?: string;
    },
  ) =>
    request<CheckoutResult>(`/api/payments/${provider}/checkout`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Rapports
  generateReport: (diagnostic_id: string) =>
    request<Report>("/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({ diagnostic_id }),
    }),

  getReport: (diagnostic_id: string) =>
    request<Report>(`/api/reports/${diagnostic_id}`),

  // Dossier
  getProgress: (diagnostic_id: string) =>
    request<DossierProgress>(`/api/dossier/${diagnostic_id}/progress`),

  listDocuments: (diagnostic_id: string) =>
    request<DossierDocument[]>(`/api/dossier/${diagnostic_id}/documents`),

  uploadDocument: async (
    diagnostic_id: string,
    type: string,
    file: File,
  ): Promise<DossierDocument> => {
    const form = new FormData();
    form.append("type", type);
    form.append("file", file);
    // Pas de Content-Type manuel : le navigateur ajoute la boundary multipart.
    const response = await fetch(
      `${API_URL}/api/dossier/${diagnostic_id}/documents`,
      { method: "POST", body: form, headers: await userIdHeader() },
    );
    if (!response.ok) {
      let message = `Erreur ${response.status}`;
      try {
        const data = await response.json();
        if (data?.detail) message = data.detail;
      } catch {
        /* réponse non-JSON */
      }
      throw new Error(message);
    }
    return (await response.json()) as DossierDocument;
  },

  verifyDocument: (diagnostic_id: string, doc_id: string) =>
    request<DossierDocument>(
      `/api/dossier/${diagnostic_id}/verify/${doc_id}`,
      { method: "POST" },
    ),

  deleteDocument: (diagnostic_id: string, doc_id: string) =>
    request<{ deleted: boolean }>(
      `/api/dossier/${diagnostic_id}/documents/${doc_id}`,
      { method: "DELETE" },
    ),

  // Génération IA
  generateLettreMotivation: (diagnostic_id: string) =>
    request<GeneratedText>(
      `/api/generation/${diagnostic_id}/lettre-motivation`,
      { method: "POST" },
    ),

  generateLettreInvitation: (diagnostic_id: string) =>
    request<GeneratedText>(
      `/api/generation/${diagnostic_id}/lettre-invitation`,
      { method: "POST" },
    ),

  generatePlanSejour: (diagnostic_id: string) =>
    request<GeneratedText>(`/api/generation/${diagnostic_id}/plan-sejour`, {
      method: "POST",
    }),

  generateConseils: (diagnostic_id: string) =>
    request<Conseils>(`/api/generation/${diagnostic_id}/conseils`, {
      method: "POST",
    }),
};

export { API_URL };
