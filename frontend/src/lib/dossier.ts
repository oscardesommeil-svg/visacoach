// Libellés et métadonnées partagés pour le parcours universel.
import type { PieceStatut } from "./api";

export const TYPE_VISA: {
  id: string;
  icon: string;
  label: string;
  desc: string;
}[] = [
  { id: "tourisme", icon: "🏖️", label: "Tourisme", desc: "Voyage de loisirs, vacances" },
  { id: "etudiant", icon: "🎓", label: "Étudiant", desc: "Études, formation, Campus France" },
  { id: "famille", icon: "👨‍👩‍👧", label: "Famille", desc: "Visite famille, regroupement" },
  { id: "affaires", icon: "💼", label: "Affaires", desc: "Voyage professionnel, conférences" },
  { id: "medical", icon: "🏥", label: "Médical", desc: "Soins médicaux, traitement" },
  { id: "conjoint", icon: "💍", label: "Conjoint/Partenaire", desc: "Rejoindre son conjoint" },
  { id: "transit", icon: "✈️", label: "Transit", desc: "Escale, transit aéroportuaire" },
];

export const PAYS_DESTINATION: {
  id: string;
  flag: string;
  label: string;
  zone: string;
}[] = [
  { id: "france", flag: "🇫🇷", label: "France", zone: "Schengen" },
  { id: "canada", flag: "🇨🇦", label: "Canada", zone: "Amérique du Nord" },
  { id: "usa", flag: "🇺🇸", label: "États-Unis", zone: "Amérique du Nord" },
  { id: "belgique", flag: "🇧🇪", label: "Belgique", zone: "Schengen" },
  { id: "allemagne", flag: "🇩🇪", label: "Allemagne", zone: "Schengen" },
  { id: "espagne", flag: "🇪🇸", label: "Espagne", zone: "Schengen" },
  { id: "portugal", flag: "🇵🇹", label: "Portugal", zone: "Schengen" },
  { id: "suisse", flag: "🇨🇭", label: "Suisse", zone: "Schengen" },
  { id: "uk", flag: "🇬🇧", label: "Royaume-Uni", zone: "Europe" },
];

export const PAYS_ORIGINE: { id: string; flag: string; label: string }[] = [
  { id: "senegal", flag: "🇸🇳", label: "Sénégal" },
  { id: "cote_divoire", flag: "🇨🇮", label: "Côte d'Ivoire" },
  { id: "cameroun", flag: "🇨🇲", label: "Cameroun" },
  { id: "mali", flag: "🇲🇱", label: "Mali" },
  { id: "congo", flag: "🇨🇬", label: "Congo" },
  { id: "burkina_faso", flag: "🇧🇫", label: "Burkina Faso" },
  { id: "benin", flag: "🇧🇯", label: "Bénin" },
  { id: "togo", flag: "🇹🇬", label: "Togo" },
  { id: "guinee", flag: "🇬🇳", label: "Guinée" },
  { id: "niger", flag: "🇳🇪", label: "Niger" },
  { id: "tchad", flag: "🇹🇩", label: "Tchad" },
  { id: "gabon", flag: "🇬🇦", label: "Gabon" },
  { id: "madagascar", flag: "🇲🇬", label: "Madagascar" },
  { id: "mauritanie", flag: "🇲🇷", label: "Mauritanie" },
  { id: "rdc", flag: "🇨🇩", label: "RD Congo" },
];

export function visaLabel(id: string): { icon: string; label: string } {
  const v = TYPE_VISA.find((t) => t.id === id);
  return v ? { icon: v.icon, label: v.label } : { icon: "📋", label: id };
}

export function paysLabel(id: string): { flag: string; label: string } {
  const all = [...PAYS_DESTINATION, ...PAYS_ORIGINE];
  const p = all.find((x) => x.id === id);
  return p ? { flag: p.flag, label: p.label } : { flag: "🏳️", label: id };
}

export const STATUT_META: Record<
  PieceStatut,
  { icon: string; label: string; color: string; bg: string }
> = {
  a_fournir: { icon: "⬜", label: "À fournir", color: "#4A5580", bg: "#F4F6FC" },
  uploade: { icon: "📤", label: "Téléversé", color: "#1434A4", bg: "#EBF0FF" },
  valide: { icon: "✅", label: "Validé", color: "#15803D", bg: "#DCFCE7" },
  incomplet: { icon: "⚠️", label: "À corriger", color: "#B45309", bg: "#FEF3C7" },
  probleme: { icon: "❌", label: "Problème", color: "#B91C1C", bg: "#FEE2E2" },
};
