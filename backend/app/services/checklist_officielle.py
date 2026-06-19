"""Checklists officielles des documents par type de visa et pays.

Plutôt que de coder en dur les 7 × 9 combinaisons, la checklist est composée
d'un socle commun + d'ajouts selon le type de visa + d'adaptations selon la zone
(Schengen vs hors-Schengen). Données basées sur les exigences consulaires usuelles.

Chaque item :
  {id, label, obligatoire, format, astuce, risque_si_absent,
   validite?, delai_obtention?, lien_officiel?}
"""

from __future__ import annotations

SCHENGEN = {"france", "belgique", "allemagne", "espagne", "portugal", "suisse"}

# --- Items réutilisables ---------------------------------------------------
PASSEPORT = {
    "id": "passeport",
    "label": "Passeport biométrique",
    "obligatoire": True,
    "validite": "6 mois après le retour",
    "format": "Original + copie de la page biographique",
    "delai_obtention": "2-4 semaines",
    "astuce": "Votre passeport doit avoir au moins 2 pages vierges.",
    "risque_si_absent": "BLOQUANT — dossier irrecevable",
}
PHOTO = {
    "id": "photo_identite",
    "label": "Photos d'identité",
    "obligatoire": True,
    "format": "2 photos 35x45mm, fond blanc, moins de 6 mois",
    "astuce": "Les photos de cabine automatique sont acceptées si le format est respecté.",
    "risque_si_absent": "BLOQUANT",
}
RELEVE_BANCAIRE = {
    "id": "releve_bancaire",
    "label": "Relevés bancaires",
    "obligatoire": True,
    "format": "3 derniers mois, tamponnés par la banque",
    "astuce": "Solde recommandé ≈ 50€/jour de séjour. Évitez les dépôts brutaux juste avant le dépôt.",
    "risque_si_absent": "CRITIQUE — cause fréquente de refus",
}
JUSTIF_PRO = {
    "id": "justificatif_professionnel",
    "label": "Justificatif professionnel",
    "obligatoire": True,
    "format": "Contrat de travail OU attestation employeur OU registre de commerce",
    "astuce": "L'attestation doit mentionner poste, salaire et autorisation d'absence.",
    "risque_si_absent": "CRITIQUE",
}


def _formulaire(pays: str) -> dict:
    if pays in SCHENGEN:
        return {
            "id": "formulaire_demande",
            "label": "Formulaire de demande Schengen",
            "obligatoire": True,
            "format": "Formulaire officiel rempli en français, signé",
            "lien_officiel": "https://france-visas.gouv.fr",
            "astuce": "Remplissez-le en ligne pour éviter les erreurs.",
            "risque_si_absent": "BLOQUANT",
        }
    return {
        "id": "formulaire_demande",
        "label": "Formulaire de demande de visa",
        "obligatoire": True,
        "format": "Formulaire officiel du consulat, rempli et signé",
        "astuce": "Téléchargez le formulaire à jour sur le site du consulat concerné.",
        "risque_si_absent": "BLOQUANT",
    }


def _assurance(pays: str) -> dict:
    if pays in SCHENGEN:
        return {
            "id": "assurance_voyage",
            "label": "Assurance voyage",
            "obligatoire": True,
            "format": "Couverture min. 30 000€, valable dans tout l'espace Schengen",
            "delai_obtention": "Immédiat en ligne",
            "astuce": "AXA, Allianz, MAIF proposent des assurances Schengen dès ~15€/semaine.",
            "risque_si_absent": "BLOQUANT",
        }
    return {
        "id": "assurance_voyage",
        "label": "Assurance voyage / santé",
        "obligatoire": True,
        "format": "Couverture frais médicaux et rapatriement pour toute la durée",
        "astuce": "Vérifiez le montant minimum exigé par le pays de destination.",
        "risque_si_absent": "CRITIQUE",
    }


HEBERGEMENT = {
    "id": "justificatif_hebergement",
    "label": "Justificatif d'hébergement",
    "obligatoire": True,
    "format": "Réservation d'hôtel OU attestation d'accueil légalisée",
    "astuce": "Réservation Booking.com avec annulation gratuite : pas besoin de payer d'avance.",
    "risque_si_absent": "BLOQUANT",
}
BILLET = {
    "id": "billet_avion",
    "label": "Réservation de vol aller-retour",
    "obligatoire": True,
    "format": "Réservation confirmée (pas obligatoirement payée)",
    "astuce": "Réservez un billet remboursable ou une réservation temporaire.",
    "risque_si_absent": "BLOQUANT",
}
LETTRE_MOTIVATION = {
    "id": "lettre_motivation",
    "label": "Lettre de motivation",
    "obligatoire": False,
    "format": "Lettre expliquant le motif et le programme du séjour",
    "astuce": "Non obligatoire mais renforce fortement le dossier. VisaCoach peut la générer.",
    "risque_si_absent": "RECOMMANDÉ",
}

# --- Ajouts spécifiques par type de visa -----------------------------------
_TYPE_ITEMS: dict[str, list[dict]] = {
    "tourisme": [
        LETTRE_MOTIVATION,
        {
            "id": "itineraire",
            "label": "Itinéraire / programme de voyage",
            "obligatoire": False,
            "format": "Programme jour par jour du séjour",
            "astuce": "Un itinéraire crédible rassure le consulat sur l'objet du voyage.",
            "risque_si_absent": "RECOMMANDÉ",
        },
    ],
    "etudiant": [
        {
            "id": "attestation_inscription",
            "label": "Attestation d'inscription / admission",
            "obligatoire": True,
            "format": "Lettre d'admission de l'établissement d'accueil",
            "astuce": "Sans admission confirmée, le visa étudiant est presque impossible.",
            "risque_si_absent": "BLOQUANT",
        },
        {
            "id": "campus_france",
            "label": "Attestation Campus France",
            "obligatoire": True,
            "format": "Attestation « Études en France » validée",
            "lien_officiel": "https://www.campusfrance.org",
            "astuce": "Obligatoire pour la France via la procédure Études en France.",
            "risque_si_absent": "BLOQUANT (France)",
        },
        {
            "id": "diplomes",
            "label": "Diplômes et relevés de notes",
            "obligatoire": True,
            "format": "Copies certifiées + traductions si nécessaire",
            "astuce": "Faites traduire par un traducteur assermenté si non francophones.",
            "risque_si_absent": "CRITIQUE",
        },
        {
            "id": "attestation_langue",
            "label": "Test de langue (TCF/DELF/IELTS)",
            "obligatoire": False,
            "format": "Attestation de niveau avec score",
            "astuce": "Souvent exigé selon le programme — anticipez la session d'examen.",
            "risque_si_absent": "RECOMMANDÉ",
        },
        {
            "id": "garant_financier",
            "label": "Garantie financière / prise en charge",
            "obligatoire": True,
            "format": "Attestation de bourse OU garant + relevés",
            "astuce": "Montant de référence ≈ 615€/mois (France). Justifiez la source des fonds.",
            "risque_si_absent": "CRITIQUE",
        },
    ],
    "famille": [
        {
            "id": "attestation_accueil",
            "label": "Attestation d'accueil",
            "obligatoire": True,
            "format": "Attestation légalisée en mairie par l'hébergeant",
            "astuce": "L'hôte doit la faire valider en mairie (France) — anticipez les délais.",
            "risque_si_absent": "BLOQUANT",
        },
        {
            "id": "lien_parente",
            "label": "Justificatif de lien de parenté",
            "obligatoire": True,
            "format": "Actes d'état civil prouvant le lien familial",
            "astuce": "Actes de naissance/mariage traduits si nécessaire.",
            "risque_si_absent": "CRITIQUE",
        },
        {
            "id": "piece_identite_hote",
            "label": "Pièce d'identité de l'hôte",
            "obligatoire": True,
            "format": "Copie du titre de séjour ou pièce d'identité de l'hébergeant",
            "astuce": "Joignez aussi un justificatif de domicile récent de l'hôte.",
            "risque_si_absent": "CRITIQUE",
        },
    ],
    "affaires": [
        {
            "id": "invitation_entreprise",
            "label": "Lettre d'invitation de l'entreprise",
            "obligatoire": True,
            "format": "En-tête officiel, objet, dates, prise en charge",
            "astuce": "Doit préciser la nature professionnelle et qui prend en charge les frais.",
            "risque_si_absent": "BLOQUANT",
        },
        {
            "id": "ordre_mission",
            "label": "Ordre de mission",
            "obligatoire": True,
            "format": "Document de votre employeur détaillant la mission",
            "astuce": "Cohérent avec l'invitation et vos justificatifs professionnels.",
            "risque_si_absent": "CRITIQUE",
        },
    ],
    "medical": [
        {
            "id": "certificat_medical",
            "label": "Certificat médical / rapport",
            "obligatoire": True,
            "format": "Rapport du médecin traitant précisant la pathologie",
            "astuce": "Doit justifier la nécessité de soins à l'étranger.",
            "risque_si_absent": "BLOQUANT",
        },
        {
            "id": "prise_en_charge_hopital",
            "label": "Lettre d'acceptation de l'établissement de soins",
            "obligatoire": True,
            "format": "Document de l'hôpital/clinique avec devis et dates",
            "astuce": "Le devis doit correspondre à votre capacité financière prouvée.",
            "risque_si_absent": "BLOQUANT",
        },
        {
            "id": "preuve_financement_soins",
            "label": "Preuve de financement des soins",
            "obligatoire": True,
            "format": "Relevés / attestation de prise en charge des frais médicaux",
            "astuce": "Anticipez le coût total (soins + séjour + accompagnant).",
            "risque_si_absent": "CRITIQUE",
        },
    ],
    "conjoint": [
        {
            "id": "acte_mariage",
            "label": "Acte de mariage / PACS",
            "obligatoire": True,
            "format": "Acte récent + traduction si nécessaire",
            "astuce": "Acte de moins de 3 mois recommandé.",
            "risque_si_absent": "BLOQUANT",
        },
        {
            "id": "preuve_vie_commune",
            "label": "Preuves de vie commune / relation",
            "obligatoire": False,
            "format": "Photos, échanges, justificatifs communs",
            "astuce": "Renforce la crédibilité de la relation auprès du consulat.",
            "risque_si_absent": "RECOMMANDÉ",
        },
        {
            "id": "titre_sejour_conjoint",
            "label": "Titre de séjour / nationalité du conjoint",
            "obligatoire": True,
            "format": "Copie du titre de séjour ou passeport du conjoint",
            "astuce": "Joignez un justificatif de domicile du conjoint.",
            "risque_si_absent": "CRITIQUE",
        },
    ],
    "transit": [
        {
            "id": "visa_destination_finale",
            "label": "Visa du pays de destination finale",
            "obligatoire": True,
            "format": "Visa valide pour la destination après le transit",
            "astuce": "Le transit suppose un visa/entrée garantie dans le pays final.",
            "risque_si_absent": "BLOQUANT",
        },
        {
            "id": "billet_continuation",
            "label": "Billet de continuation",
            "obligatoire": True,
            "format": "Réservation du vol vers la destination finale",
            "astuce": "Les dates doivent s'enchaîner logiquement avec l'arrivée.",
            "risque_si_absent": "BLOQUANT",
        },
    ],
}


def get_checklist(type_visa: str, pays_destination: str) -> list[dict]:
    """Compose la checklist officielle pour un type de visa + pays."""
    pays = (pays_destination or "").lower()
    type_visa = (type_visa or "tourisme").lower()

    # Socle commun.
    base = [PASSEPORT, PHOTO, _formulaire(pays), _assurance(pays)]

    # Le transit n'exige ni hébergement ni preuves de séjour classiques.
    if type_visa != "transit":
        base += [HEBERGEMENT, BILLET, RELEVE_BANCAIRE, JUSTIF_PRO]
    else:
        base += [RELEVE_BANCAIRE]

    extras = list(_TYPE_ITEMS.get(type_visa, _TYPE_ITEMS["tourisme"]))

    # Campus France ne s'applique qu'à la France.
    if type_visa == "etudiant" and pays != "france":
        extras = [e for e in extras if e["id"] != "campus_france"]

    # Déduplication par id en conservant l'ordre.
    seen: set[str] = set()
    result: list[dict] = []
    for item in [*base, *extras]:
        if item["id"] not in seen:
            seen.add(item["id"])
            result.append(item)
    return result
