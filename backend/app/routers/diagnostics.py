"""Diagnostic gratuit : 7 questions -> score 0-100.

Le catalogue de questions est servi au frontend par `GET /api/diagnostics/questions`.
Le frontend renvoie les réponses à `POST /api/diagnostics`, qui calcule un score
pondéré, le persiste dans Supabase et le renvoie.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.core.supabase import get_supabase

router = APIRouter()


# ---------------------------------------------------------------------------
# Catalogue des 7 questions du diagnostic
# ---------------------------------------------------------------------------
# Chaque option porte un `score` (0-100) et la question un `weight` (poids
# relatif). Le score final est la moyenne pondérée des options choisies.

QUESTIONS: list[dict] = [
    {
        "id": "type_visa",
        "weight": 1.0,
        "label": "Quel type de visa visez-vous ?",
        "options": [
            {"value": "tourisme", "label": "Tourisme / visite", "score": 60},
            {"value": "etudes", "label": "Études", "score": 75},
            {"value": "travail", "label": "Travail", "score": 70},
            {"value": "famille", "label": "Regroupement familial", "score": 65},
            {"value": "affaires", "label": "Affaires", "score": 70},
        ],
    },
    {
        "id": "destination",
        "weight": 0.8,
        "label": "Quel est le pays de destination ?",
        "options": [
            {"value": "france", "label": "France", "score": 60},
            {"value": "canada", "label": "Canada", "score": 65},
            {"value": "belgique", "label": "Belgique", "score": 62},
            {"value": "schengen_autre", "label": "Autre pays Schengen", "score": 60},
            {"value": "autre", "label": "Autre", "score": 55},
        ],
    },
    {
        "id": "situation_pro",
        "weight": 1.2,
        "label": "Quelle est votre situation professionnelle ?",
        "options": [
            {"value": "cdi", "label": "Salarié en CDI", "score": 85},
            {"value": "cdd", "label": "Salarié en CDD", "score": 65},
            {"value": "independant", "label": "Indépendant / entrepreneur", "score": 70},
            {"value": "etudiant", "label": "Étudiant", "score": 60},
            {"value": "sans_emploi", "label": "Sans emploi", "score": 35},
        ],
    },
    {
        "id": "historique_voyage",
        "weight": 1.1,
        "label": "Avez-vous déjà voyagé hors de votre pays ?",
        "options": [
            {"value": "schengen_ok", "label": "Oui, dans l'espace Schengen", "score": 90},
            {"value": "autre_pays", "label": "Oui, dans d'autres pays", "score": 75},
            {"value": "refus_passe", "label": "Oui, mais j'ai déjà eu un refus", "score": 40},
            {"value": "jamais", "label": "Non, jamais", "score": 50},
        ],
    },
    {
        "id": "liens_origine",
        "weight": 1.3,
        "label": "Quels liens vous attachent à votre pays d'origine ?",
        "options": [
            {"value": "forts", "label": "Emploi stable + famille + biens", "score": 90},
            {"value": "moyens", "label": "Emploi OU famille proche", "score": 65},
            {"value": "faibles", "label": "Peu de liens", "score": 35},
        ],
    },
    {
        "id": "capacite_financiere",
        "weight": 1.3,
        "label": "Quelle est votre capacité financière (épargne, revenus) ?",
        "options": [
            {"value": "solide", "label": "Relevés solides et réguliers", "score": 90},
            {"value": "moyenne", "label": "Suffisante mais juste", "score": 60},
            {"value": "garant", "label": "Je dépends d'un garant / hébergeant", "score": 55},
            {"value": "faible", "label": "Faible ou irrégulière", "score": 30},
        ],
    },
    {
        "id": "dossier",
        "weight": 1.0,
        "label": "Où en êtes-vous de la préparation de votre dossier ?",
        "options": [
            {"value": "complet", "label": "Tous les documents sont prêts", "score": 85},
            {"value": "partiel", "label": "Une partie est prête", "score": 60},
            {"value": "rien", "label": "Je n'ai pas encore commencé", "score": 40},
        ],
    },
]

_QUESTION_INDEX = {q["id"]: q for q in QUESTIONS}


# ---------------------------------------------------------------------------
# Modèles Pydantic
# ---------------------------------------------------------------------------
class Answer(BaseModel):
    """Une réponse à une question du diagnostic."""

    question_id: str
    value: str


class DiagnosticRequest(BaseModel):
    """Payload envoyé par le frontend en fin de diagnostic."""

    email: EmailStr
    full_name: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=80)
    answers: list[Answer] = Field(..., min_length=1)


class DiagnosticResponse(BaseModel):
    """Résultat renvoyé au frontend."""

    id: str
    score: int
    level: Literal["faible", "moyen", "bon", "excellent"]
    summary: str


# ---------------------------------------------------------------------------
# Logique de scoring
# ---------------------------------------------------------------------------
def _level_for(score: int) -> Literal["faible", "moyen", "bon", "excellent"]:
    if score >= 80:
        return "excellent"
    if score >= 65:
        return "bon"
    if score >= 45:
        return "moyen"
    return "faible"


def _summary_for(level: str, score: int) -> str:
    messages = {
        "excellent": (
            f"Excellent profil ({score}/100). Votre dossier présente de solides "
            "garanties. Le rapport complet vous aidera à le finaliser sans faille."
        ),
        "bon": (
            f"Bon profil ({score}/100). Quelques points peuvent être renforcés pour "
            "maximiser vos chances. Le rapport complet vous indique lesquels."
        ),
        "moyen": (
            f"Profil moyen ({score}/100). Plusieurs points de vigilance sont à "
            "corriger. Le rapport complet vous donne un plan d'action priorisé."
        ),
        "faible": (
            f"Profil à risque ({score}/100). Votre dossier nécessite des améliorations "
            "importantes. Le rapport complet détaille les actions à mener en priorité."
        ),
    }
    return messages[level]


def compute_score(answers: list[Answer]) -> int:
    """Calcule le score 0-100 à partir des réponses (moyenne pondérée)."""
    total_weight = 0.0
    weighted_sum = 0.0

    for answer in answers:
        question = _QUESTION_INDEX.get(answer.question_id)
        if question is None:
            raise HTTPException(
                status_code=422, detail=f"Question inconnue : {answer.question_id}"
            )
        option = next(
            (o for o in question["options"] if o["value"] == answer.value), None
        )
        if option is None:
            raise HTTPException(
                status_code=422,
                detail=f"Réponse invalide « {answer.value} » pour {answer.question_id}",
            )
        weight = question["weight"]
        weighted_sum += option["score"] * weight
        total_weight += weight

    if total_weight == 0:
        raise HTTPException(status_code=422, detail="Aucune réponse valide.")

    return round(weighted_sum / total_weight)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/questions")
def list_questions() -> dict:
    """Renvoie le catalogue des 7 questions (sans les scores internes)."""
    public = [
        {
            "id": q["id"],
            "label": q["label"],
            "options": [
                {"value": o["value"], "label": o["label"]} for o in q["options"]
            ],
        }
        for q in QUESTIONS
    ]
    return {"questions": public}


@router.post("", response_model=DiagnosticResponse)
def create_diagnostic(
    payload: DiagnosticRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> DiagnosticResponse:
    """Calcule le score, persiste le diagnostic et renvoie le résultat.

    Si l'utilisateur est connecté, le frontend envoie l'en-tête `X-User-Id` :
    le diagnostic est alors rattaché à son compte (sinon `user_id` reste NULL).
    """
    score = compute_score(payload.answers)
    level = _level_for(score)
    summary = _summary_for(level, score)

    supabase = get_supabase()
    record = {
        "email": payload.email,
        "full_name": payload.full_name,
        "country": payload.country,
        "answers": [a.model_dump() for a in payload.answers],
        "score": score,
        "level": level,
        "user_id": x_user_id,
    }

    try:
        result = supabase.table("diagnostics").insert(record).execute()
    except Exception as exc:  # noqa: BLE001 — on renvoie une 500 lisible
        raise HTTPException(
            status_code=500, detail=f"Erreur d'enregistrement : {exc}"
        ) from exc

    if not result.data:
        raise HTTPException(status_code=500, detail="Le diagnostic n'a pas pu être créé.")

    return DiagnosticResponse(
        id=str(result.data[0]["id"]),
        score=score,
        level=level,
        summary=summary,
    )


@router.get("/mine")
def list_my_diagnostics(
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> list[dict]:
    """Liste les diagnostics de l'utilisateur connecté (via service_role).

    Lecture côté backend pour ne pas dépendre de la configuration RLS du projet.
    Renvoie [] si l'en-tête X-User-Id est absent (utilisateur non connecté).
    """
    if not x_user_id:
        return []
    supabase = get_supabase()
    result = (
        supabase.table("diagnostics")
        .select("id,score,level,answers,created_at")
        .eq("user_id", x_user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.get("/{diagnostic_id}", response_model=DiagnosticResponse)
def get_diagnostic(diagnostic_id: str) -> DiagnosticResponse:
    """Récupère un diagnostic existant par son identifiant."""
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

    row = result.data[0]
    level = row["level"]
    return DiagnosticResponse(
        id=str(row["id"]),
        score=row["score"],
        level=level,
        summary=_summary_for(level, row["score"]),
    )
