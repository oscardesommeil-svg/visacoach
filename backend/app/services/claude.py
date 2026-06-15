"""Génération du rapport visa personnalisé via l'API Claude (Anthropic).

On utilise le SDK officiel `anthropic` avec le modèle `claude-sonnet-4-6`
(choisi explicitement pour ce produit) et la réflexion adaptative, qui laisse
Claude décider de la profondeur de raisonnement nécessaire.
"""

from __future__ import annotations

import anthropic

from app.core.config import settings

# Client unique. Le SDK lit ANTHROPIC_API_KEY depuis l'environnement, mais on
# passe la clé explicitement pour rester cohérent avec notre config centralisée.
_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """Tu es un expert en immigration et en constitution de dossiers \
de visa pour les ressortissants d'Afrique subsaharienne francophone (Sénégal, \
Côte d'Ivoire, Cameroun, Mali, Congo, etc.).

Tu produis un rapport clair, bienveillant et actionnable, en français, à partir \
du diagnostic d'un candidat. Le rapport doit :
- expliquer ce que révèle le score obtenu ;
- lister les points forts du profil ;
- lister les points de vigilance et les risques de refus ;
- proposer un plan d'action priorisé et concret (documents, démarches, délais) ;
- rester honnête : ne jamais promettre l'obtention du visa.

N'invente pas de règles juridiques précises ou de chiffres officiels que tu \
n'es pas sûr de connaître. Reste général et prudent sur les exigences légales, \
mais précis sur la méthode et l'organisation du dossier.

Formate la réponse en Markdown avec des titres (##), des listes à puces et des \
sections claires."""


def _format_answers(answers: list[dict]) -> str:
    """Met en forme les réponses du diagnostic pour le prompt."""
    lines = []
    for ans in answers:
        qid = ans.get("question_id", "?")
        value = ans.get("value", "?")
        lines.append(f"- {qid} : {value}")
    return "\n".join(lines)


def generate_report(
    *,
    full_name: str | None,
    country: str | None,
    score: int,
    level: str,
    answers: list[dict],
    plan: str = "rapport",
) -> str:
    """Génère le contenu Markdown du rapport personnalisé.

    Args:
        full_name: nom du candidat (peut être None).
        country: pays d'origine.
        score: score 0-100 du diagnostic.
        level: niveau (faible/moyen/bon/excellent).
        answers: liste des réponses brutes [{question_id, value}, ...].
        plan: "rapport" (rapport complet) ou "suivi" (suivi expert, plus détaillé).

    Returns:
        Le rapport au format Markdown.
    """
    nom = full_name or "le candidat"
    pays = country or "non précisé"

    extra = ""
    if plan == "suivi":
        extra = (
            "\n\nCe candidat a souscrit à l'offre « Suivi Expert » : ajoute une "
            "section finale « Accompagnement personnalisé » avec un calendrier "
            "détaillé semaine par semaine et une checklist exhaustive des pièces."
        )

    user_prompt = f"""Voici le diagnostic d'un candidat au visa.

Nom : {nom}
Pays d'origine : {pays}
Score obtenu : {score}/100 (niveau : {level})

Réponses au diagnostic :
{_format_answers(answers)}

Rédige son rapport personnalisé complet.{extra}"""

    message = _client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=4000,
        thinking={"type": "adaptive"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    # On concatène uniquement les blocs de texte (on ignore les blocs thinking).
    parts = [block.text for block in message.content if block.type == "text"]
    return "\n".join(parts).strip()
