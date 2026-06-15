"""Analyse IA des documents du dossier visa via l'API Claude.

Chaque document est envoyé à Claude (image en base64, ou PDF via le bloc
`document` natif) avec des consignes de vérification spécifiques à son type.
Claude renvoie un verdict structuré :

    {
        "status": "VALIDE" | "ATTENTION" | "PROBLEME",
        "note": int,            # 0-100 pour ce document
        "feedback": str,        # explication détaillée en français
        "suggestions": list[str]  # actions correctives si nécessaire
    }
"""

from __future__ import annotations

import base64
import json
from datetime import date

import anthropic

from app.core.config import settings

_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Types de documents reconnus + libellé lisible.
DOCUMENT_TYPES: dict[str, str] = {
    # Socle
    "PASSEPORT": "Passeport biométrique",
    "PHOTO_IDENTITE": "Photo d'identité",
    "RELEVE_BANCAIRE": "Relevé bancaire",
    "LETTRE_MOTIVATION": "Lettre de motivation",
    "ASSURANCE_VOYAGE": "Assurance voyage",
    "JUSTIFICATIF_PRO": "Justificatif professionnel",
    # Réservations
    "RESERVATION_VOL": "Réservation de vol",
    "RESERVATION_HOTEL": "Réservation d'hébergement",
    # État civil
    "ACTE_NAISSANCE": "Acte de naissance",
    "CERTIFICAT_MARIAGE": "Certificat de mariage",
    "JUSTIFICATIF_DOMICILE": "Justificatif de domicile",
    # Emploi / études
    "ATTESTATION_TRAVAIL": "Attestation de travail / contrat",
    "ATTESTATION_SCOLARITE": "Attestation de scolarité",
    "DIPLOME": "Diplôme / relevé de notes",
    # Invitations
    "INVITATION_FAMILLE": "Lettre d'invitation (famille)",
    "INVITATION_ENTREPRISE": "Lettre d'invitation (entreprise)",
    # Patrimoine / fiscalité / divers
    "ACTE_PROPRIETE": "Acte de propriété / titre foncier",
    "DECLARATION_FISCALE": "Déclaration fiscale",
    "EXTRAIT_CASIER": "Extrait de casier judiciaire",
    "CERTIFICAT_MEDICAL": "Certificat médical",
}

# Alias rétrocompatible avec la nomenclature demandée.
TYPES_DOCUMENTS = DOCUMENT_TYPES

# Consignes de vérification propres à chaque type de document.
_CHECKS: dict[str, str] = {
    "PASSEPORT": (
        "Vérifie : la date d'expiration (le passeport doit être valide au moins "
        "6 mois APRÈS la date de retour prévue), la présence de pages vierges "
        "pour les visas, la lisibilité de la page d'identité, et que le document "
        "n'est pas expiré aujourd'hui."
    ),
    "RELEVE_BANCAIRE": (
        "Vérifie : que le relevé couvre au moins les 3 derniers mois, la présence "
        "de mouvements réguliers (salaire/revenus), un solde suffisant et stable, "
        "l'absence de dépôts massifs suspects juste avant la demande, et que le nom "
        "du titulaire est visible."
    ),
    "JUSTIFICATIF_PRO": (
        "Vérifie : que le document prouve une activité professionnelle réelle "
        "(contrat de travail, attestation employeur, registre de commerce, statuts "
        "d'entreprise), qu'il est officiel/daté, et qu'il mentionne la fonction ou "
        "l'activité du demandeur."
    ),
    "LETTRE_MOTIVATION": (
        "Vérifie : la cohérence générale, la mention claire de l'objet du voyage, "
        "la mention explicite d'une date de retour / intention de revenir, le ton "
        "professionnel, et l'absence de contradictions."
    ),
    "ASSURANCE_VOYAGE": (
        "Vérifie : un montant de couverture d'au moins 30 000 € (frais médicaux et "
        "rapatriement), des dates couvrant tout le séjour, et la zone géographique "
        "correspondant à la destination."
    ),
    "RESERVATION_VOL": (
        "Vérifie : la présence d'un aller-retour, des dates cohérentes, la "
        "destination correspondant au visa demandé, et le nom du voyageur."
    ),
    "RESERVATION_HOTEL": (
        "Vérifie : des dates couvrant le séjour, une adresse d'hébergement claire "
        "dans le pays de destination, et le nom du voyageur."
    ),
    "PHOTO_IDENTITE": (
        "Vérifie : un fond uni et clair (idéalement blanc), un visage de face bien "
        "centré et net, une expression neutre, et l'absence d'accessoires masquant "
        "le visage. Signale si la photo semble ancienne ou de mauvaise qualité."
    ),
    "ACTE_NAISSANCE": (
        "Vérifie : la lisibilité complète, la présence d'un cachet/officialité, la "
        "nécessité d'une traduction assermentée si le document n'est pas dans la "
        "langue du pays de destination, et la fraîcheur (moins de 3 mois si une copie "
        "récente est exigée)."
    ),
    "CERTIFICAT_MARIAGE": (
        "Vérifie : la validité et l'officialité du document, la lisibilité des noms "
        "et de la date, et la nécessité d'une traduction assermentée si nécessaire."
    ),
    "JUSTIFICATIF_DOMICILE": (
        "Vérifie : que le document a moins de 3 mois, qu'il est au nom du demandeur, "
        "et qu'il mentionne une adresse claire (facture d'eau/électricité, quittance "
        "de loyer, attestation d'hébergement)."
    ),
    "ATTESTATION_TRAVAIL": (
        "Vérifie : la mention de l'employeur, du poste occupé, de la date d'embauche "
        "et de l'ancienneté, la présence d'une signature et d'un cachet, et idéalement "
        "l'autorisation d'absence pour la période du voyage."
    ),
    "ATTESTATION_SCOLARITE": (
        "Vérifie : l'établissement, l'année scolaire/universitaire en cours, le nom "
        "de l'étudiant, et la présence d'un cachet officiel."
    ),
    "DIPLOME": (
        "Vérifie : la lisibilité, l'établissement délivreur, le nom du titulaire, et "
        "la cohérence avec le parcours déclaré. Pour un relevé de notes, vérifie les "
        "résultats et l'année."
    ),
    "INVITATION_FAMILLE": (
        "Vérifie : les coordonnées complètes de l'invitant (nom, adresse, contact), "
        "la durée du séjour proposée, le lien de parenté précisé, et l'engagement de "
        "prise en charge si mentionné."
    ),
    "INVITATION_ENTREPRISE": (
        "Vérifie : l'en-tête officiel de l'entreprise invitante, l'objet professionnel "
        "de l'invitation, les dates, et les coordonnées du signataire (nom, fonction)."
    ),
    "ACTE_PROPRIETE": (
        "Vérifie : l'officialité du titre (cachet, enregistrement), le nom du "
        "propriétaire correspondant au demandeur, et la description du bien. Cela "
        "renforce les attaches au pays d'origine."
    ),
    "DECLARATION_FISCALE": (
        "Vérifie : une année fiscale récente, la cohérence des revenus déclarés avec "
        "le relevé bancaire et l'activité, et l'officialité du document (cachet de "
        "l'administration fiscale)."
    ),
    "EXTRAIT_CASIER": (
        "Vérifie : l'officialité, la fraîcheur (généralement moins de 3 mois), le nom "
        "du demandeur, et l'absence de mentions problématiques."
    ),
    "CERTIFICAT_MEDICAL": (
        "Vérifie : la date récente, la signature et le cachet du médecin, et la "
        "mention des éléments exigés par le consulat le cas échéant."
    ),
}

_SYSTEM_PROMPT = (
    "Tu es un agent de vérification de dossiers de visa pour les ressortissants "
    "d'Afrique subsaharienne francophone. Tu analyses un document fourni en image "
    "ou en PDF et tu évalues s'il est conforme aux exigences d'une demande de visa. "
    "Sois rigoureux mais bienveillant, et toujours en français. "
    "Tu réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou "
    "après, sans balises Markdown."
)

_ALLOWED_MEDIA_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/jpg": "image",
    "image/png": "image",
}


def _build_document_block(file_bytes: bytes, content_type: str) -> dict:
    """Construit le bloc de contenu Claude (image ou document PDF)."""
    b64 = base64.standard_b64encode(file_bytes).decode("utf-8")
    kind = _ALLOWED_MEDIA_TYPES.get(content_type)

    if kind == "pdf":
        return {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": b64,
            },
        }

    # Image : on normalise le media_type (jpg -> jpeg).
    media_type = "image/jpeg" if content_type in ("image/jpg", "image/jpeg") else "image/png"
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": b64},
    }


def _parse_verdict(text: str) -> dict:
    """Parse la réponse JSON de Claude de façon défensive."""
    cleaned = text.strip()
    # Retire d'éventuelles balises de code Markdown ```json ... ```
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    data = json.loads(cleaned)  # peut lever JSONDecodeError -> géré par l'appelant

    status = str(data.get("status", "ATTENTION")).upper()
    if status not in ("VALIDE", "ATTENTION", "PROBLEME"):
        status = "ATTENTION"

    note = data.get("note", 0)
    try:
        note = max(0, min(100, int(note)))
    except (TypeError, ValueError):
        note = 0

    suggestions = data.get("suggestions", [])
    if not isinstance(suggestions, list):
        suggestions = [str(suggestions)]
    suggestions = [str(s) for s in suggestions]

    return {
        "status": status,
        "note": note,
        "feedback": str(data.get("feedback", "")).strip(),
        "suggestions": suggestions,
    }


def analyze_document(
    *,
    doc_type: str,
    file_bytes: bytes,
    content_type: str,
    context: dict | None = None,
) -> dict:
    """Analyse un document et renvoie le verdict structuré.

    Args:
        doc_type: type du document (clé de DOCUMENT_TYPES).
        file_bytes: contenu binaire du fichier.
        content_type: MIME type (application/pdf, image/jpeg, image/png).
        context: infos du dossier (destination, type de visa…).

    Returns:
        dict {status, note, feedback, suggestions}.
    """
    if content_type not in _ALLOWED_MEDIA_TYPES:
        return {
            "status": "PROBLEME",
            "note": 0,
            "feedback": (
                f"Format de fichier non supporté ({content_type}). "
                "Utilisez un PDF, un JPG ou un PNG."
            ),
            "suggestions": ["Convertissez le document en PDF, JPG ou PNG."],
        }

    context = context or {}
    label = DOCUMENT_TYPES.get(doc_type, doc_type)
    checks = _CHECKS.get(
        doc_type, "Vérifie la cohérence générale et la lisibilité du document."
    )

    instructions = f"""Analyse ce document de type « {label} » pour une demande de visa.

Contexte du candidat :
- Pays d'origine : {context.get('country', 'non précisé')}
- Destination : {context.get('destination', 'non précisée')}
- Type de visa : {context.get('visa_type', 'non précisé')}
- Date du jour : {date.today().isoformat()}

Points à vérifier :
{checks}

Règles de notation :
- "VALIDE" (note 80-100) : le document est conforme et exploitable.
- "ATTENTION" (note 50-79) : utilisable mais des points sont à améliorer.
- "PROBLEME" (note 0-49) : le document est non conforme ou inexploitable.

Réponds UNIQUEMENT avec un JSON de la forme :
{{"status": "...", "note": 0, "feedback": "...", "suggestions": ["...", "..."]}}"""

    try:
        message = _client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1500,
            thinking={"type": "adaptive"},
            system=_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        _build_document_block(file_bytes, content_type),
                        {"type": "text", "text": instructions},
                    ],
                }
            ],
        )
    except anthropic.APIError as exc:
        return {
            "status": "ATTENTION",
            "note": 0,
            "feedback": f"L'analyse automatique a échoué : {exc}. Réessayez.",
            "suggestions": ["Relancez la vérification dans quelques instants."],
        }

    text = "\n".join(b.text for b in message.content if b.type == "text").strip()

    try:
        return _parse_verdict(text)
    except (json.JSONDecodeError, ValueError):
        # Claude n'a pas renvoyé de JSON exploitable : on dégrade proprement.
        return {
            "status": "ATTENTION",
            "note": 0,
            "feedback": text
            or "Le document n'a pas pu être analysé automatiquement.",
            "suggestions": ["Vérifiez la lisibilité du document et réessayez."],
        }
