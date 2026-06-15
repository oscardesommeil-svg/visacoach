"""Génération de documents et conseils par l'IA (Claude).

Endpoints :
  POST /api/generation/{diagnostic_id}/lettre-motivation
  POST /api/generation/{diagnostic_id}/lettre-invitation
  POST /api/generation/{diagnostic_id}/plan-sejour
  POST /api/generation/{diagnostic_id}/conseils

Tout est généré en français, personnalisé à partir du diagnostic du candidat.
"""

from __future__ import annotations

import io
import json
import re

import anthropic
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.core.supabase import get_supabase

router = APIRouter()

_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Libellés lisibles (réponses du diagnostic -> texte).
_VISA_LABELS = {
    "tourisme": "tourisme",
    "etudes": "études",
    "travail": "travail",
    "famille": "regroupement familial",
    "affaires": "affaires",
}
_DESTINATION_LABELS = {
    "france": "France",
    "canada": "Canada",
    "belgique": "Belgique",
    "schengen_autre": "espace Schengen",
    "autre": "non précisée",
}
_SITUATION_LABELS = {
    "cdi": "salarié(e) en CDI",
    "cdd": "salarié(e) en CDD",
    "independant": "indépendant(e) / entrepreneur(e)",
    "etudiant": "étudiant(e)",
    "sans_emploi": "sans emploi",
}


# ---------------------------------------------------------------------------
# Modèles
# ---------------------------------------------------------------------------
class GeneratedText(BaseModel):
    """Réponse pour les générations textuelles (lettre, plan…)."""

    content: str


class Conseils(BaseModel):
    """Conseils personnalisés structurés."""

    entretien: list[str]
    dossier: list[str]
    erreurs_a_eviter: list[str]
    delais: str
    points_faibles: list[str]


class PDFRequest(BaseModel):
    """Demande de génération de PDF depuis un contenu Markdown/texte."""

    title: str
    content: str  # Markdown ou texte brut
    document_type: str  # lettre_motivation | programme_sejour | invitation | rapport
    diagnostic_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_diagnostic(diagnostic_id: str) -> dict:
    supabase = get_supabase()
    result = (
        supabase.table("diagnostics")
        .select("*")
        .eq("id", diagnostic_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Diagnostic introuvable.")
    return result.data[0]


def _profile(diagnostic: dict) -> dict:
    """Construit un profil lisible à partir du diagnostic."""
    answers = {a["question_id"]: a["value"] for a in diagnostic.get("answers", [])}
    return {
        "name": diagnostic.get("full_name") or "le candidat",
        "country": diagnostic.get("country") or "non précisé",
        "destination": _DESTINATION_LABELS.get(answers.get("destination", ""), "non précisée"),
        "visa": _VISA_LABELS.get(answers.get("type_visa", ""), "non précisé"),
        "situation": _SITUATION_LABELS.get(answers.get("situation_pro", ""), "non précisée"),
        "score": diagnostic.get("score"),
        "level": diagnostic.get("level"),
    }


def _profile_block(p: dict) -> str:
    return (
        f"- Nom : {p['name']}\n"
        f"- Pays d'origine : {p['country']}\n"
        f"- Destination : {p['destination']}\n"
        f"- Type de visa : {p['visa']}\n"
        f"- Situation professionnelle : {p['situation']}\n"
        f"- Score de diagnostic : {p['score']}/100 (niveau {p['level']})"
    )


def _generate_text(system: str, user: str, max_tokens: int = 2500) -> str:
    """Appelle Claude et renvoie le texte concaténé (hors blocs thinking)."""
    try:
        message = _client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=max_tokens,
            thinking={"type": "adaptive"},
            system=system,
            messages=[{"role": "user", "content": user}],
        )
    except anthropic.APIError as exc:
        raise HTTPException(
            status_code=502, detail=f"Erreur de génération IA : {exc}"
        ) from exc
    return "\n".join(b.text for b in message.content if b.type == "text").strip()


# ---------------------------------------------------------------------------
# Endpoints — générations textuelles
# ---------------------------------------------------------------------------
@router.post("/{diagnostic_id}/lettre-motivation", response_model=GeneratedText)
def lettre_motivation(diagnostic_id: str) -> GeneratedText:
    """Génère une lettre de motivation formelle prête à imprimer."""
    p = _profile(_get_diagnostic(diagnostic_id))
    system = (
        "Tu es un expert en rédaction de lettres de motivation pour les demandes "
        "de visa. Tu écris un français impeccable, formel et convaincant."
    )
    user = f"""Rédige une lettre de motivation complète et personnalisée pour une demande \
de visa de {p['visa']} à destination de {p['destination']}.

Profil du candidat :
{_profile_block(p)}

Contraintes :
- Format lettre formelle : lieu et date, objet, formule d'appel, corps structuré, \
formule de politesse, signature ([Nom] en bas).
- Mentionne clairement l'objet du voyage, la durée envisagée, l'intention de revenir \
au pays d'origine et les attaches qui le justifient.
- Reste honnête et crédible, sans exagération.
- Réponds uniquement avec le texte de la lettre, sans commentaire."""
    return GeneratedText(content=_generate_text(system, user))


@router.post("/{diagnostic_id}/lettre-invitation", response_model=GeneratedText)
def lettre_invitation(diagnostic_id: str) -> GeneratedText:
    """Génère un modèle de lettre d'invitation (à adapter par l'invitant)."""
    p = _profile(_get_diagnostic(diagnostic_id))
    system = (
        "Tu es un expert en démarches de visa. Tu rédiges des modèles de lettres "
        "d'invitation clairs et conformes aux attentes consulaires, en français."
    )
    user = f"""Rédige un MODÈLE de lettre d'invitation que l'hôte/l'invitant dans le \
pays de destination ({p['destination']}) adressera au consulat pour accueillir le candidat.

Profil du candidat invité :
{_profile_block(p)}

Contraintes :
- Mets des champs à compléter entre crochets pour l'invitant : [Nom de l'invitant], \
[Adresse complète], [Téléphone], [Lien avec le candidat], [Dates du séjour].
- Inclus l'engagement d'hébergement / de prise en charge, la durée du séjour et le \
lien avec le candidat.
- Format lettre formelle. Réponds uniquement avec le texte de la lettre."""
    return GeneratedText(content=_generate_text(system, user))


@router.post("/{diagnostic_id}/plan-sejour", response_model=GeneratedText)
def plan_sejour(diagnostic_id: str) -> GeneratedText:
    """Génère un programme de séjour jour par jour cohérent avec le motif."""
    p = _profile(_get_diagnostic(diagnostic_id))
    system = (
        "Tu es un conseiller en voyage et en démarches de visa. Tu produis des "
        "programmes de séjour réalistes et cohérents, en français, au format Markdown."
    )
    user = f"""Génère un programme de séjour détaillé, jour par jour, cohérent avec un \
voyage de {p['visa']} à destination de {p['destination']}.

Profil du candidat :
{_profile_block(p)}

Contraintes :
- Propose une durée plausible (par ex. 7 à 14 jours) et structure le programme par \
journée (Jour 1, Jour 2, …).
- Adapte les activités au motif : tourisme = visites/sites ; affaires = réunions et \
rendez-vous professionnels ; famille = temps avec les proches ; études = démarches \
académiques.
- Reste réaliste et crédible (lieux réels du pays de destination).
- Format Markdown avec des titres. Réponds uniquement avec le programme."""
    return GeneratedText(content=_generate_text(system, user, max_tokens=3000))


# ---------------------------------------------------------------------------
# Endpoint — conseils structurés
# ---------------------------------------------------------------------------
@router.post("/{diagnostic_id}/conseils", response_model=Conseils)
def conseils(diagnostic_id: str) -> Conseils:
    """Génère des conseils personnalisés (entretien, dossier, erreurs, délais…)."""
    p = _profile(_get_diagnostic(diagnostic_id))
    system = (
        "Tu es un coach expert en obtention de visa pour les ressortissants d'Afrique "
        "subsaharienne francophone. Tu donnes des conseils concrets et personnalisés, "
        "en français. Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte "
        "autour ni balises Markdown."
    )
    user = f"""Donne des conseils personnalisés à ce candidat au visa.

Profil :
{_profile_block(p)}

Réponds avec un JSON de la forme exacte :
{{
  "entretien": ["question probable + réponse suggérée", "..."],
  "dossier": ["conseil de présentation du dossier", "..."],
  "erreurs_a_eviter": ["erreur fréquente à éviter selon ce profil", "..."],
  "delais": "texte sur les délais consulaires à anticiper depuis {p['country']}",
  "points_faibles": ["conseil ciblé pour renforcer un point faible détecté", "..."]
}}

Chaque liste contient 3 à 6 éléments concrets et spécifiques à ce profil."""

    raw = _generate_text(system, user, max_tokens=2500)

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="La génération des conseils n'a pas renvoyé un JSON valide.",
        ) from exc

    def _as_list(value: object) -> list[str]:
        if isinstance(value, list):
            return [str(v) for v in value]
        if value:
            return [str(value)]
        return []

    return Conseils(
        entretien=_as_list(data.get("entretien")),
        dossier=_as_list(data.get("dossier")),
        erreurs_a_eviter=_as_list(data.get("erreurs_a_eviter")),
        delais=str(data.get("delais", "")),
        points_faibles=_as_list(data.get("points_faibles")),
    )


# ---------------------------------------------------------------------------
# Endpoint — génération PDF (depuis un contenu Markdown/texte éditable)
# ---------------------------------------------------------------------------
def _xml_escape(text: str) -> str:
    """Échappe les caractères spéciaux pour le mini-HTML de reportlab."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


@router.post("/pdf")
def generate_pdf(body: PDFRequest) -> StreamingResponse:
    """Génère un PDF depuis un contenu texte/Markdown (parsing Markdown basique).

    Endpoint synchrone : reportlab est bloquant, FastAPI l'exécute donc dans un
    threadpool sans bloquer la boucle d'événements.
    """
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        "Header",
        parent=styles["Normal"],
        fontSize=10,
        textColor=HexColor("#1434A4"),
        fontName="Helvetica-Bold",
        spaceAfter=6,
    )
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=HexColor("#0A0F2C"),
        fontName="Helvetica-Bold",
        spaceAfter=20,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        textColor=HexColor("#0A0F2C"),
        spaceAfter=10,
    )
    h2_style = ParagraphStyle(
        "DocH2",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=HexColor("#1434A4"),
        fontName="Helvetica-Bold",
        spaceBefore=16,
        spaceAfter=8,
    )
    bold_style = ParagraphStyle(
        "DocBold", parent=body_style, fontName="Helvetica-Bold"
    )

    story = [
        Paragraph("VisaCoach — Accompagnement visa", header_style),
        Spacer(1, 0.3 * cm),
        Paragraph(_xml_escape(body.title), title_style),
        Spacer(1, 0.5 * cm),
    ]

    def _inline(text: str) -> str:
        """Échappe puis convertit le gras Markdown **...** en <b>...</b>."""
        return re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", _xml_escape(text))

    for raw_line in body.content.split("\n"):
        line = raw_line.strip()
        if not line:
            story.append(Spacer(1, 0.3 * cm))
        elif line.startswith("## "):
            story.append(Paragraph(_inline(line[3:]), h2_style))
        elif line.startswith("# "):
            story.append(Paragraph(_inline(line[2:]), title_style))
        elif line.startswith(("- ", "* ")):
            story.append(Paragraph(f"• {_inline(line[2:])}", body_style))
        elif line.startswith("**") and line.endswith("**") and len(line) > 4:
            story.append(Paragraph(_xml_escape(line[2:-2]), bold_style))
        else:
            story.append(Paragraph(_inline(line), body_style))

    footer_style = ParagraphStyle(
        "DocFooter",
        parent=styles["Normal"],
        fontSize=8,
        textColor=HexColor("#9CA3AF"),
        alignment=1,
    )
    story.append(Spacer(1, 1 * cm))
    story.append(
        Paragraph(
            "Document généré par VisaCoach — visacoach.fr | Outil d'aide à la "
            "préparation. Ne garantit pas l'obtention du visa.",
            footer_style,
        )
    )

    try:
        doc.build(story)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Échec de la génération du PDF : {exc}"
        ) from exc

    buffer.seek(0)
    safe_id = (body.diagnostic_id or "doc")[:8]
    filename = f"visacoach_{body.document_type}_{safe_id}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
