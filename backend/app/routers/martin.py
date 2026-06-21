"""Martin — le conseiller visa personnel de VisaCoach.

Endpoint :
  POST /api/martin/chat   -> réponse conversationnelle de Martin (Claude)

Martin est le personnage central du produit : chaleureux, expert consulaire,
adapté à l'Afrique francophone. Il ne garantit jamais l'obtention d'un visa.
"""

from __future__ import annotations

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()

_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

MARTIN_SYSTEM = """Tu es Martin, le conseiller visa personnel de VisaCoach.

PERSONNALITÉ :
- Chaleureux, bienveillant et expert consulaire
- Tu parles en français impeccable, adapté à l'Afrique francophone
- Tu dis "je" et tu parles en ton nom propre, jamais comme un robot
- Tu encourages et rassures sans promettre l'impossible
- Tu es direct et concret — pas de blabla
- Réponses courtes (3-5 phrases) sauf si une explication longue est nécessaire

EXPERTISE :
- Visa Schengen (France, Belgique, Allemagne, Espagne…), visa Canada, visa USA
- Procédures Campus France, TLScontact, VFS Global
- Documents requis, délais, entretiens consulaires
- Analyse de profil et identification des points faibles

RÈGLES ABSOLUES :
- Ne JAMAIS garantir l'obtention d'un visa
- Toujours rappeler, quand c'est pertinent, que le consul reste souverain
- Si une question dépasse ton expertise → le dire honnêtement et orienter vers
  les ressources officielles (ambassade, france-visas.gouv.fr)
- Jamais de conseil assimilable à du conseil juridique formel
- Présente-toi brièvement au tout premier message d'une conversation."""


class ChatMessage(BaseModel):
    role: str
    content: str


class MartinChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: str = "general"
    diagnostic_data: dict | None = None
    dossier_id: str | None = None


@router.post("/chat")
def martin_chat(body: MartinChatRequest) -> dict:
    """Renvoie la réponse de Martin pour le fil de discussion fourni."""
    if not body.messages:
        raise HTTPException(status_code=400, detail="Aucun message fourni.")

    # Enrichit le system prompt avec le contexte du dossier si disponible.
    system = MARTIN_SYSTEM
    data = body.diagnostic_data
    if data:
        system += (
            "\n\nCONTEXTE DU DOSSIER ACTUEL :"
            f"\n- Type de visa : {data.get('type_visa', 'Non spécifié')}"
            f"\n- Destination : {data.get('pays_destination', 'Non spécifié')}"
            f"\n- Origine : {data.get('pays_origine', 'Non spécifié')}"
            f"\n- Score dossier : {data.get('score', 'Non calculé')}/100"
            f"\n- Plan : {data.get('plan', 'diagnostic')}"
            "\n\nUtilise ce contexte pour personnaliser tes réponses."
        )

    # On ne garde que les rôles valides côté API (user / assistant).
    msgs = [
        {"role": m.role, "content": m.content}
        for m in body.messages
        if m.role in ("user", "assistant") and m.content.strip()
    ]
    if not msgs or msgs[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="Le dernier message doit venir de l'utilisateur.")

    try:
        response = _client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=600,
            system=system,
            messages=msgs,
        )
    except anthropic.APIError as exc:
        raise HTTPException(status_code=502, detail=f"Martin est momentanément indisponible : {exc}") from exc

    text = "".join(block.text for block in response.content if block.type == "text").strip()
    return {"response": text or "Désolé, je n'ai pas pu formuler de réponse. Pouvez-vous reformuler ?"}
