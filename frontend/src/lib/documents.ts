// Catalogue des types de documents : libellé, icône et conseil d'upload.
// Les types correspondent à ceux du backend (document_analyzer.DOCUMENT_TYPES).

import type { DocStatus } from "./api";

export interface DocMeta {
  label: string;
  icon: string;
  hint: string;
}

export const DOC_META: Record<string, DocMeta> = {
  PASSEPORT: {
    label: "Passeport",
    icon: "🛂",
    hint: "Page d'identité, valide au moins 6 mois après le retour.",
  },
  RELEVE_BANCAIRE: {
    label: "Relevé bancaire",
    icon: "🏦",
    hint: "Les 3 derniers mois, avec mouvements réguliers.",
  },
  JUSTIFICATIF_PRO: {
    label: "Justificatif professionnel",
    icon: "💼",
    hint: "Contrat, attestation employeur ou registre de commerce.",
  },
  LETTRE_MOTIVATION: {
    label: "Lettre de motivation",
    icon: "✉️",
    hint: "Objet du voyage et intention de retour clairement indiqués.",
  },
  ASSURANCE_VOYAGE: {
    label: "Assurance voyage",
    icon: "🛡️",
    hint: "Couverture minimale de 30 000 €, dates du séjour incluses.",
  },
  RESERVATION_VOL: {
    label: "Réservation de vol",
    icon: "✈️",
    hint: "Aller-retour aux dates prévues, à votre nom.",
  },
  RESERVATION_HOTEL: {
    label: "Réservation d'hôtel",
    icon: "🏨",
    hint: "Hébergement couvrant tout le séjour, adresse visible.",
  },
  PHOTO_IDENTITE: {
    label: "Photo d'identité",
    icon: "📷",
    hint: "Fond clair, visage de face, récente.",
  },
  ACTE_NAISSANCE: {
    label: "Acte de naissance",
    icon: "👶",
    hint: "Lisible, traduit si nécessaire, récent si exigé.",
  },
  CERTIFICAT_MARIAGE: {
    label: "Certificat de mariage",
    icon: "💍",
    hint: "Valide et traduit si nécessaire.",
  },
  JUSTIFICATIF_DOMICILE: {
    label: "Justificatif de domicile",
    icon: "🏠",
    hint: "Moins de 3 mois, à votre nom.",
  },
  ATTESTATION_TRAVAIL: {
    label: "Attestation de travail",
    icon: "📝",
    hint: "Employeur, poste, ancienneté, signature et cachet.",
  },
  ATTESTATION_SCOLARITE: {
    label: "Attestation de scolarité",
    icon: "🎓",
    hint: "Établissement et année en cours, cachet officiel.",
  },
  DIPLOME: {
    label: "Diplôme / relevé de notes",
    icon: "📜",
    hint: "À votre nom, établissement identifiable.",
  },
  INVITATION_FAMILLE: {
    label: "Lettre d'invitation (famille)",
    icon: "👨‍👩‍👧",
    hint: "Coordonnées de l'invitant, durée, lien de parenté.",
  },
  INVITATION_ENTREPRISE: {
    label: "Lettre d'invitation (entreprise)",
    icon: "🏢",
    hint: "En-tête officiel, objet professionnel, dates.",
  },
  ACTE_PROPRIETE: {
    label: "Acte de propriété",
    icon: "🏡",
    hint: "Titre officiel à votre nom — renforce vos attaches.",
  },
  DECLARATION_FISCALE: {
    label: "Déclaration fiscale",
    icon: "🧾",
    hint: "Année récente, cohérente avec vos revenus.",
  },
  EXTRAIT_CASIER: {
    label: "Extrait de casier judiciaire",
    icon: "⚖️",
    hint: "Officiel et récent (moins de 3 mois).",
  },
  CERTIFICAT_MEDICAL: {
    label: "Certificat médical",
    icon: "🩺",
    hint: "Récent, signé et cacheté par le médecin.",
  },
};

export function docMeta(type: string): DocMeta {
  return DOC_META[type] ?? { label: type, icon: "📄", hint: "" };
}

// Métadonnées d'affichage par statut.
export const STATUS_META: Record<
  DocStatus,
  { label: string; icon: string; color: string; bg: string }
> = {
  EN_ATTENTE: {
    label: "À fournir",
    icon: "⬜",
    color: "text-slate-500",
    bg: "bg-slate-100",
  },
  VALIDE: {
    label: "Validé",
    icon: "✅",
    color: "text-green-700",
    bg: "bg-green-100",
  },
  ATTENTION: {
    label: "À corriger",
    icon: "⚠️",
    color: "text-amber-700",
    bg: "bg-amber-100",
  },
  PROBLEME: {
    label: "Problème",
    icon: "❌",
    color: "text-red-700",
    bg: "bg-red-100",
  },
};
