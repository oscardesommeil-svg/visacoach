"""Rapports : génération (via Claude) et récupération.

Le rapport n'est généré que si une commande payée existe pour le diagnostic.
Une fois généré, il est persisté dans Supabase et envoyé par email (Resend).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.supabase import get_supabase
from app.services import claude, resend

router = APIRouter()


class GenerateReportRequest(BaseModel):
    """Demande de génération de rapport."""

    diagnostic_id: str


class ReportResponse(BaseModel):
    """Rapport renvoyé au frontend."""

    id: str
    diagnostic_id: str
    plan: str
    content: str
    email_sent: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_paid_order(diagnostic_id: str) -> dict:
    """Renvoie la commande payée la plus récente pour ce diagnostic, sinon 402."""
    supabase = get_supabase()
    result = (
        supabase.table("orders")
        .select("*")
        .eq("diagnostic_id", diagnostic_id)
        .eq("status", "paid")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(
            status_code=402,
            detail="Aucun paiement validé pour ce diagnostic.",
        )
    return result.data[0]


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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/generate", response_model=ReportResponse)
def generate(payload: GenerateReportRequest) -> ReportResponse:
    """Génère (ou renvoie) le rapport pour un diagnostic payé."""
    supabase = get_supabase()

    # 1. Si un rapport existe déjà, on le renvoie tel quel (idempotence).
    existing = (
        supabase.table("reports")
        .select("*")
        .eq("diagnostic_id", payload.diagnostic_id)
        .limit(1)
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        return ReportResponse(
            id=str(row["id"]),
            diagnostic_id=str(row["diagnostic_id"]),
            plan=row["plan"],
            content=row["content"],
            email_sent=bool(row.get("email_sent")),
        )

    # 2. Vérifie le paiement et récupère le diagnostic.
    order = _get_paid_order(payload.diagnostic_id)
    diagnostic = _get_diagnostic(payload.diagnostic_id)

    # 3. Génère le rapport via Claude.
    try:
        content = claude.generate_report(
            full_name=diagnostic.get("full_name"),
            country=diagnostic.get("country"),
            score=diagnostic["score"],
            level=diagnostic["level"],
            answers=diagnostic.get("answers", []),
            plan=order["plan"],
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail=f"Erreur de génération du rapport : {exc}"
        ) from exc

    # 4. Envoie le rapport par email (best-effort).
    email_sent = resend.send_report_email(
        to_email=diagnostic["email"],
        full_name=diagnostic.get("full_name"),
        report_markdown=content,
    )

    # 5. Persiste le rapport.
    record = {
        "diagnostic_id": payload.diagnostic_id,
        "order_id": order["id"],
        "plan": order["plan"],
        "content": content,
        "email_sent": email_sent,
    }
    result = supabase.table("reports").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Rapport non enregistré.")

    row = result.data[0]
    return ReportResponse(
        id=str(row["id"]),
        diagnostic_id=str(row["diagnostic_id"]),
        plan=row["plan"],
        content=content,
        email_sent=email_sent,
    )


@router.post("/test-generate", response_model=ReportResponse)
def test_generate(payload: GenerateReportRequest) -> ReportResponse:
    """Endpoint de TEST — génère un rapport SANS vérifier le paiement.

    Réservé au développement : désactivé en production pour ne jamais contourner
    le paiement. Utilise `upsert` pour pouvoir être relancé sur le même
    diagnostic (la table `reports` a un index unique sur `diagnostic_id`).
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=403, detail="Endpoint de test désactivé en production."
        )

    supabase = get_supabase()
    diagnostic = _get_diagnostic(payload.diagnostic_id)

    try:
        content = claude.generate_report(
            full_name=diagnostic.get("full_name"),
            country=diagnostic.get("country"),
            score=diagnostic["score"],
            level=diagnostic["level"],
            answers=diagnostic.get("answers", []),
            plan="rapport",
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail=f"Erreur de génération du rapport : {exc}"
        ) from exc

    record = {
        "diagnostic_id": payload.diagnostic_id,
        "plan": "rapport",
        "content": content,
        "email_sent": False,
    }
    result = (
        supabase.table("reports")
        .upsert(record, on_conflict="diagnostic_id")
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Rapport non enregistré.")

    row = result.data[0]
    return ReportResponse(
        id=str(row["id"]),
        diagnostic_id=str(row["diagnostic_id"]),
        plan=row["plan"],
        content=content,
        email_sent=False,
    )


@router.get("/{diagnostic_id}", response_model=ReportResponse)
def get_report(diagnostic_id: str) -> ReportResponse:
    """Récupère le rapport déjà généré pour un diagnostic."""
    supabase = get_supabase()
    result = (
        supabase.table("reports")
        .select("*")
        .eq("diagnostic_id", diagnostic_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Rapport introuvable.")

    row = result.data[0]
    return ReportResponse(
        id=str(row["id"]),
        diagnostic_id=str(row["diagnostic_id"]),
        plan=row["plan"],
        content=row["content"],
        email_sent=bool(row.get("email_sent")),
    )
