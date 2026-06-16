"""Parcours « Visa Étudiant » : diagnostic dédié + outils IA.

Endpoints :
  POST /api/etudiant/diagnostic           -> crée un diagnostic étudiant (score)
  GET  /api/etudiant/diagnostic/{id}      -> récupère un diagnostic
  POST /api/etudiant/universites          -> recommandations d'universités (IA)
  POST /api/etudiant/lettre-motivation    -> lettre de motivation académique (IA)
  POST /api/etudiant/campus-france        -> guide Campus France personnalisé (IA)
  GET  /api/etudiant/bourses/{pays}       -> bourses disponibles (statique)
  POST /api/etudiant/simulation-entretien -> simulation d'entretien (IA)
  POST /api/etudiant/checklist-visa       -> checklist visa étudiant (IA)
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.core.supabase import get_supabase
from app.services import etudiant_ai

router = APIRouter()

Level = Literal["faible", "moyen", "bon", "excellent"]


# ---------------------------------------------------------------------------
# Modèles
# ---------------------------------------------------------------------------
class EtudiantDiagnosticRequest(BaseModel):
    pays_destination: str
    niveau_etudes: str
    domaine: str
    niveau_francais: str
    test_langue: str | None = None
    etablissement: str  # oui | recherche | non
    campus_france_status: str  # oui | en_cours | non | na
    budget_mensuel: str  # lt300 | 300_600 | gt600
    garant: bool = False
    situation_academique: str  # bac | bac2 | bac3 | bac5


class EtudiantDiagnosticOut(BaseModel):
    id: str
    score: int
    level: Level
    summary: str
    pays_destination: str
    niveau_etudes: str
    domaine: str


class DiagnosticRef(BaseModel):
    diagnostic_id: str


class GeneratedText(BaseModel):
    content: str


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------
def _compute_score(p: EtudiantDiagnosticRequest) -> int:
    score = 0

    # Établissement confirmé (25)
    score += {"oui": 25, "recherche": 12, "non": 0}.get(p.etablissement, 0)

    # Campus France (20) — "na" (Canada/USA) ne pénalise pas.
    score += {"oui": 20, "en_cours": 10, "na": 20, "non": 0}.get(
        p.campus_france_status, 0
    )

    # Langue (20) : test validé prime, sinon niveau déclaré.
    if p.test_langue and p.test_langue.lower() not in ("non", "", "none"):
        score += 20
    else:
        score += {"courant": 14, "intermediaire": 10, "debutant": 4}.get(
            p.niveau_francais, 0
        )

    # Finances (20) : budget + garant (plafonné à 20).
    finances = {"gt600": 15, "300_600": 9, "lt300": 3}.get(p.budget_mensuel, 0)
    if p.garant:
        finances += 5
    score += min(finances, 20)

    # Niveau académique (15)
    score += {"bac": 6, "bac2": 9, "bac3": 12, "bac5": 15}.get(
        p.situation_academique, 0
    )

    return max(0, min(100, score))


def _level_for(score: int) -> Level:
    if score >= 80:
        return "excellent"
    if score >= 65:
        return "bon"
    if score >= 45:
        return "moyen"
    return "faible"


def _summary_for(level: Level, score: int) -> str:
    msg = {
        "excellent": "Excellent dossier étudiant. Vos chances d'admission et de visa sont solides.",
        "bon": "Bon dossier étudiant. Quelques étapes restent à sécuriser (voir vos modules).",
        "moyen": "Dossier étudiant à renforcer : langue, finances ou établissement à consolider.",
        "faible": "Dossier étudiant à risque : plusieurs étapes clés sont à construire en priorité.",
    }
    return f"{msg[level]} (score {score}/100)"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_diagnostic(diagnostic_id: str) -> dict:
    supabase = get_supabase()
    result = (
        supabase.table("etudiant_diagnostics")
        .select("*")
        .eq("id", diagnostic_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Diagnostic étudiant introuvable.")
    return result.data[0]


def _ai(fn, *args):
    """Exécute une fonction IA en convertissant les erreurs en 502."""
    try:
        return fn(*args)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 — JSON invalide, etc.
        raise HTTPException(
            status_code=502, detail=f"Erreur de génération IA : {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# Diagnostic
# ---------------------------------------------------------------------------
@router.post("/diagnostic", response_model=EtudiantDiagnosticOut)
def create_diagnostic(
    payload: EtudiantDiagnosticRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> EtudiantDiagnosticOut:
    score = _compute_score(payload)
    level = _level_for(score)

    record = {
        "pays_destination": payload.pays_destination,
        "niveau_etudes": payload.niveau_etudes,
        "domaine": payload.domaine,
        "niveau_francais": payload.niveau_francais,
        "test_langue": payload.test_langue,
        "etablissement_confirme": payload.etablissement == "oui",
        "campus_france_status": payload.campus_france_status,
        "budget_mensuel": payload.budget_mensuel,
        "garant": payload.garant,
        "situation_academique": payload.situation_academique,
        "score": score,
        "user_id": x_user_id,
    }

    supabase = get_supabase()
    try:
        result = supabase.table("etudiant_diagnostics").insert(record).execute()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Erreur d'enregistrement : {exc}"
        ) from exc
    if not result.data:
        raise HTTPException(status_code=500, detail="Diagnostic non créé.")

    row = result.data[0]
    return EtudiantDiagnosticOut(
        id=str(row["id"]),
        score=score,
        level=level,
        summary=_summary_for(level, score),
        pays_destination=payload.pays_destination,
        niveau_etudes=payload.niveau_etudes,
        domaine=payload.domaine,
    )


@router.get("/diagnostic/{diagnostic_id}", response_model=EtudiantDiagnosticOut)
def get_diagnostic(diagnostic_id: str) -> EtudiantDiagnosticOut:
    row = _get_diagnostic(diagnostic_id)
    score = int(row.get("score") or 0)
    level = _level_for(score)
    return EtudiantDiagnosticOut(
        id=str(row["id"]),
        score=score,
        level=level,
        summary=_summary_for(level, score),
        pays_destination=row["pays_destination"],
        niveau_etudes=row["niveau_etudes"],
        domaine=row["domaine"],
    )


# ---------------------------------------------------------------------------
# Outils IA
# ---------------------------------------------------------------------------
@router.post("/universites")
def universites(payload: DiagnosticRef) -> dict:
    d = _get_diagnostic(payload.diagnostic_id)
    return {"universites": _ai(etudiant_ai.generate_universites, d)}


@router.post("/lettre-motivation", response_model=GeneratedText)
def lettre_motivation(payload: DiagnosticRef) -> GeneratedText:
    d = _get_diagnostic(payload.diagnostic_id)
    return GeneratedText(
        content=_ai(etudiant_ai.generate_lettre_motivation_academique, d)
    )


@router.post("/campus-france")
def campus_france(payload: DiagnosticRef) -> dict:
    d = _get_diagnostic(payload.diagnostic_id)
    return _ai(etudiant_ai.generate_campus_france_guide, d)


@router.post("/simulation-entretien")
def simulation_entretien(payload: DiagnosticRef) -> dict:
    d = _get_diagnostic(payload.diagnostic_id)
    return _ai(etudiant_ai.generate_simulation_entretien, d)


@router.post("/checklist-visa")
def checklist_visa(payload: DiagnosticRef) -> dict:
    d = _get_diagnostic(payload.diagnostic_id)
    return _ai(etudiant_ai.generate_checklist_visa, d)


@router.get("/bourses/{pays}")
def bourses(pays: str, niveau: str | None = None, domaine: str | None = None) -> dict:
    return {"bourses": etudiant_ai.get_bourses(pays, niveau, domaine)}
