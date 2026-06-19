"""Profil de risque consulaire (Claude).

Évalue le risque de refus selon le profil, le type de visa et le couple
pays d'origine / destination, et propose des stratégies légales de compensation.
"""

from __future__ import annotations

import json

import anthropic

from app.core.config import settings

_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

# Taux de refus indicatifs par pays d'origine (%).
TAUX_REFUS = {
    "mali": 52,
    "guinee": 55,
    "cameroun": 44,
    "senegal": 41,
    "congo": 39,
    "cote_divoire": 37,
    "burkina_faso": 46,
    "benin": 38,
    "togo": 40,
    "niger": 47,
    "tchad": 45,
    "gabon": 33,
    "madagascar": 30,
    "mauritanie": 48,
    "rdc": 50,
}

_SYSTEM = (
    "Tu es un expert consulaire. Tu évalues le profil de risque d'un demandeur de "
    "visa et proposes des stratégies légales. Tu réponds UNIQUEMENT avec un JSON."
)


def taux_refus(pays_origine: str) -> int:
    key = (pays_origine or "").lower().replace(" ", "_").replace("'", "")
    return TAUX_REFUS.get(key, 40)


def _niveau(score: int) -> str:
    if score >= 75:
        return "TRÈS ÉLEVÉ"
    if score >= 50:
        return "ÉLEVÉ"
    if score >= 30:
        return "MOYEN"
    return "FAIBLE"


def calculer_profil_risque(
    profil: dict, type_visa: str, pays_origine: str, pays_destination: str
) -> dict:
    """Calcule le profil de risque consulaire. Renvoie un dict structuré."""
    taux = taux_refus(pays_origine)

    user = f"""Analyse le profil de risque d'un demandeur de visa {type_visa} pour \
{pays_destination}, originaire de {pays_origine}.

Profil connu : {json.dumps(profil, ensure_ascii=False)}
Taux de refus historique indicatif depuis {pays_origine} : {taux}%

Réponds avec ce JSON exact :
{{
  "score_risque": 0,
  "niveau": "FAIBLE|MOYEN|ÉLEVÉ|TRÈS ÉLEVÉ",
  "facteurs_aggravants": [{{"facteur": "...", "impact": "...", "strategie": "..."}}],
  "facteurs_rassurants": ["..."],
  "message_cle": "message clé à mettre en avant dans la lettre de motivation"
}}
Le score_risque va de 0 (très faible) à 100 (très élevé)."""

    try:
        msg = _client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2000,
            system=_SYSTEM,
            messages=[{"role": "user", "content": user}],
        )
        raw = "\n".join(b.text for b in msg.content if b.type == "text").strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        data = json.loads(raw)
    except (anthropic.APIError, json.JSONDecodeError, ValueError):
        # Repli déterministe basé sur le taux de refus du pays.
        score = min(100, taux + 10)
        return {
            "score_risque": score,
            "niveau": _niveau(score),
            "facteurs_aggravants": [
                {
                    "facteur": f"Taux de refus élevé depuis {pays_origine}",
                    "impact": f"≈ {taux}% des demandes refusées",
                    "strategie": "Soignez les justificatifs financiers et les attaches au pays.",
                }
            ],
            "facteurs_rassurants": [],
            "message_cle": "Démontrez des attaches fortes et une intention claire de retour.",
        }

    try:
        score = max(0, min(100, int(data.get("score_risque", taux))))
    except (TypeError, ValueError):
        score = taux
    niveau = str(data.get("niveau", _niveau(score))).upper()

    aggravants = []
    for f in data.get("facteurs_aggravants", []) or []:
        if isinstance(f, dict):
            aggravants.append(
                {
                    "facteur": str(f.get("facteur", "")),
                    "impact": str(f.get("impact", "")),
                    "strategie": str(f.get("strategie", "")),
                }
            )
        else:
            aggravants.append({"facteur": str(f), "impact": "", "strategie": ""})

    rassurants = [str(x) for x in (data.get("facteurs_rassurants") or [])]

    return {
        "score_risque": score,
        "niveau": niveau,
        "facteurs_aggravants": aggravants,
        "facteurs_rassurants": rassurants,
        "message_cle": str(data.get("message_cle", "")),
    }
