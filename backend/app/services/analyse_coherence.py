"""Analyse de cohérence inter-documents d'un dossier visa (Claude).

Détecte les incohérences entre les pièces fournies (dates, montants, identités…)
qui sont des causes fréquentes de refus.
"""

from __future__ import annotations

import json

import anthropic

from app.core.config import settings

_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

_SYSTEM = (
    "Tu es un expert consulaire senior qui analyse la cohérence d'un dossier de "
    "visa. Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour."
)


def _json_call(system: str, user: str, max_tokens: int = 3000):
    # Sortie JSON : pas de thinking (budget partagé), parse défensif.
    msg = _client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = "\n".join(b.text for b in msg.content if b.type == "text").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)


def _as_str_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return [str(value)] if value else []
    out: list[str] = []
    for v in value:
        if isinstance(v, dict):
            out.append(" — ".join(str(x) for x in v.values() if x))
        else:
            out.append(str(v))
    return out


def analyser_coherence(documents_uploades: list[dict], profil: dict) -> dict:
    """Analyse la cohérence entre les documents fournis. Renvoie un dict structuré."""
    user = f"""Voici les documents fournis et leurs analyses :
{json.dumps(documents_uploades, ensure_ascii=False, indent=2)}

Profil du demandeur :
{json.dumps(profil, ensure_ascii=False, indent=2)}

Analyse la cohérence ENTRE les documents et identifie :
1. Incohérences critiques (causes directes de refus : dates, montants, identités, durées)
2. Points de vigilance (éléments à surveiller)
3. Points forts (ce qui rassure le consul)
4. Recommandations prioritaires (dans l'ordre)

Réponds avec ce JSON exact :
{{
  "score_coherence": 0,
  "niveau": "EXCELLENT|BON|MOYEN|FAIBLE|CRITIQUE",
  "incoherences_critiques": ["..."],
  "points_vigilance": ["..."],
  "points_forts": ["..."],
  "recommandations": ["..."]
}}"""

    try:
        data = _json_call(_SYSTEM, user)
    except (anthropic.APIError, json.JSONDecodeError, ValueError) as exc:
        raise RuntimeError(f"Analyse de cohérence impossible : {exc}") from exc

    try:
        score = max(0, min(100, int(data.get("score_coherence", 0))))
    except (TypeError, ValueError):
        score = 0
    niveau = str(data.get("niveau", "MOYEN")).upper()
    if niveau not in ("EXCELLENT", "BON", "MOYEN", "FAIBLE", "CRITIQUE"):
        niveau = "MOYEN"

    return {
        "score_coherence": score,
        "niveau": niveau,
        "incoherences_critiques": _as_str_list(data.get("incoherences_critiques")),
        "points_vigilance": _as_str_list(data.get("points_vigilance")),
        "points_forts": _as_str_list(data.get("points_forts")),
        "recommandations": _as_str_list(data.get("recommandations")),
    }
