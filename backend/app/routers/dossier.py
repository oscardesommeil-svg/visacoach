"""Module « Dossier » : upload, stockage et vérification IA des documents.

Endpoints :
  POST   /api/dossier/{diagnostic_id}/documents          -> upload d'un document
  GET    /api/dossier/{diagnostic_id}/documents          -> liste des documents
  DELETE /api/dossier/{diagnostic_id}/documents/{doc_id} -> suppression
  POST   /api/dossier/{diagnostic_id}/verify/{doc_id}    -> vérification IA
  GET    /api/dossier/{diagnostic_id}/progress           -> score de progression

Les fichiers sont stockés dans le bucket privé Supabase Storage
`dossier-documents`, accessible uniquement via la clé service_role.
"""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.supabase import get_supabase
from app.services import document_analyzer
from app.services.document_analyzer import DOCUMENT_TYPES

router = APIRouter()

BUCKET = "dossier-documents"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 Mo
_ALLOWED_CONTENT_TYPES = {"application/pdf", "image/jpeg", "image/jpg", "image/png"}
_EXTENSION_CONTENT_TYPE = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}

# Libellés lisibles pour enrichir le contexte envoyé à l'IA.
_DESTINATION_LABELS = {
    "france": "France",
    "canada": "Canada",
    "belgique": "Belgique",
    "schengen_autre": "Espace Schengen",
    "autre": "non précisée",
}
_VISA_LABELS = {
    "tourisme": "Tourisme",
    "etudes": "Études",
    "travail": "Travail",
    "famille": "Regroupement familial",
    "affaires": "Affaires",
}

# --- Correspondance réponses du diagnostic -> taxonomie « documents requis » ---
# Le diagnostic capture : type_visa, destination, situation_pro. On les traduit
# vers (visa_type, visa_reason, employment_status) attendus par get_documents_requis.
_VISA_REASON_MAP = {
    "tourisme": "TOURISME",
    "famille": "FAMILLE",
    "affaires": "AFFAIRES",
    "etudes": "ETUDES",
    "travail": "TRAVAIL",
}
_VISA_TYPE_MAP = {
    "canada": "CANADA",
    "france": "SCHENGEN",
    "belgique": "SCHENGEN",
    "schengen_autre": "SCHENGEN",
    "autre": "SCHENGEN",
}
_EMPLOYMENT_MAP = {
    "cdi": "SALARIE",
    "cdd": "SALARIE",
    "independant": "INDEPENDANT",
    "etudiant": "ETUDIANT",
    "sans_emploi": "SANS_EMPLOI",
}


def get_documents_requis(
    visa_type: str, visa_reason: str, employment_status: str
) -> list[str]:
    """Liste personnalisée des documents requis selon le profil.

    Args:
        visa_type: SCHENGEN | USA | CANADA (réservé pour des règles futures).
        visa_reason: TOURISME | FAMILLE | AFFAIRES | ETUDES | TRAVAIL.
        employment_status: SALARIE | INDEPENDANT | ETUDIANT | SANS_EMPLOI | RETRAITE.
    """
    # Socle commun — toujours requis.
    socle = [
        "PASSEPORT",
        "PHOTO_IDENTITE",
        "RELEVE_BANCAIRE",
        "ASSURANCE_VOYAGE",
        "JUSTIFICATIF_DOMICILE",
    ]

    # Selon le motif du voyage.
    if visa_reason == "TOURISME":
        socle += ["LETTRE_MOTIVATION", "RESERVATION_VOL", "RESERVATION_HOTEL"]
    elif visa_reason == "FAMILLE":
        socle += ["INVITATION_FAMILLE", "ACTE_NAISSANCE", "CERTIFICAT_MARIAGE"]
    elif visa_reason == "AFFAIRES":
        socle += ["INVITATION_ENTREPRISE", "ATTESTATION_TRAVAIL", "LETTRE_MOTIVATION"]
    elif visa_reason == "ETUDES":
        socle += ["ATTESTATION_SCOLARITE", "DIPLOME", "LETTRE_MOTIVATION"]

    # Selon le statut professionnel.
    if employment_status == "SALARIE":
        socle += ["ATTESTATION_TRAVAIL", "DECLARATION_FISCALE"]
    elif employment_status == "INDEPENDANT":
        socle += ["JUSTIFICATIF_PRO", "DECLARATION_FISCALE", "ACTE_PROPRIETE"]
    elif employment_status == "ETUDIANT":
        socle += ["ATTESTATION_SCOLARITE", "DIPLOME"]

    return list(dict.fromkeys(socle))  # déduplique en gardant l'ordre


# ---------------------------------------------------------------------------
# Modèles
# ---------------------------------------------------------------------------
class DocumentOut(BaseModel):
    id: str
    diagnostic_id: str
    type: str
    filename: str
    status: str
    note: int | None = None
    feedback: str | None = None
    suggestions: list[str] | None = None


class ProgressOut(BaseModel):
    diagnostic_id: str
    score_global: int
    documents_requis: list[str]
    documents_valides: int
    documents_total: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _answers_dict(diagnostic: dict) -> dict[str, str]:
    """Transforme la liste de réponses en dict {question_id: value}."""
    return {a["question_id"]: a["value"] for a in diagnostic.get("answers", [])}


def _required_documents(diagnostic: dict) -> list[str]:
    """Traduit les réponses du diagnostic puis calcule les documents requis."""
    answers = _answers_dict(diagnostic)
    visa_reason = _VISA_REASON_MAP.get(answers.get("type_visa", ""), "TOURISME")
    visa_type = _VISA_TYPE_MAP.get(answers.get("destination", ""), "SCHENGEN")
    employment_status = _EMPLOYMENT_MAP.get(
        answers.get("situation_pro", ""), "SANS_EMPLOI"
    )
    return get_documents_requis(visa_type, visa_reason, employment_status)


def _analysis_context(diagnostic: dict) -> dict:
    answers = _answers_dict(diagnostic)
    return {
        "country": diagnostic.get("country") or "non précisé",
        "destination": _DESTINATION_LABELS.get(
            answers.get("destination", ""), "non précisée"
        ),
        "visa_type": _VISA_LABELS.get(answers.get("type_visa", ""), "non précisé"),
    }


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


def _get_document(diagnostic_id: str, doc_id: str) -> dict:
    supabase = get_supabase()
    result = (
        supabase.table("dossier_documents")
        .select("*")
        .eq("id", doc_id)
        .eq("diagnostic_id", diagnostic_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document introuvable.")
    return result.data[0]


def _serialize(row: dict) -> DocumentOut:
    suggestions = row.get("suggestions")
    if suggestions is not None and not isinstance(suggestions, list):
        suggestions = [str(suggestions)]
    return DocumentOut(
        id=str(row["id"]),
        diagnostic_id=str(row["diagnostic_id"]),
        type=row["type"],
        filename=row["filename"],
        status=row["status"],
        note=row.get("note"),
        feedback=row.get("feedback"),
        suggestions=suggestions,
    )


def _content_type_from_name(filename: str) -> str:
    ext = os.path.splitext(filename)[1].lower()
    return _EXTENSION_CONTENT_TYPE.get(ext, "application/octet-stream")


def _recompute_progress(diagnostic_id: str, diagnostic: dict) -> ProgressOut:
    """Recalcule et persiste le score de progression du dossier."""
    supabase = get_supabase()
    required = _required_documents(diagnostic)

    docs = (
        supabase.table("dossier_documents")
        .select("type,status")
        .eq("diagnostic_id", diagnostic_id)
        .execute()
    )
    valid_types = {
        d["type"] for d in (docs.data or []) if d["status"] == "VALIDE"
    }
    documents_valides = len([t for t in required if t in valid_types])
    documents_total = len(required)
    score_global = (
        round(documents_valides / documents_total * 100) if documents_total else 0
    )

    supabase.table("dossier_progress").upsert(
        {
            "diagnostic_id": diagnostic_id,
            "score_global": score_global,
            "documents_requis": required,
            "documents_valides": documents_valides,
            "documents_total": documents_total,
        },
        on_conflict="diagnostic_id",
    ).execute()

    return ProgressOut(
        diagnostic_id=diagnostic_id,
        score_global=score_global,
        documents_requis=required,
        documents_valides=documents_valides,
        documents_total=documents_total,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/{diagnostic_id}/documents", response_model=DocumentOut)
async def upload_document(
    diagnostic_id: str,
    type: str = Form(...),
    file: UploadFile = File(...),
) -> DocumentOut:
    """Uploade un document dans le bucket privé et crée son enregistrement."""
    _get_diagnostic(diagnostic_id)  # valide l'existence

    doc_type = type.upper()
    if doc_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=422, detail=f"Type inconnu : {type}")

    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail="Format non supporté. Utilisez un PDF, un JPG ou un PNG.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 5 Mo).")
    if not content:
        raise HTTPException(status_code=422, detail="Fichier vide.")

    supabase = get_supabase()
    doc_id = str(uuid.uuid4())
    safe_name = os.path.basename(file.filename or "document")
    storage_path = f"{diagnostic_id}/{doc_id}_{safe_name}"

    try:
        supabase.storage.from_(BUCKET).upload(
            storage_path,
            content,
            {"content-type": content_type, "upsert": "true"},
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail=f"Échec de l'upload du fichier : {exc}"
        ) from exc

    record = {
        "id": doc_id,
        "diagnostic_id": diagnostic_id,
        "type": doc_type,
        "filename": safe_name,
        "storage_path": storage_path,
        "status": "EN_ATTENTE",
    }
    result = supabase.table("dossier_documents").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Document non enregistré.")

    return _serialize(result.data[0])


@router.get("/{diagnostic_id}/documents", response_model=list[DocumentOut])
def list_documents(diagnostic_id: str) -> list[DocumentOut]:
    """Liste les documents uploadés pour ce dossier."""
    supabase = get_supabase()
    result = (
        supabase.table("dossier_documents")
        .select("*")
        .eq("diagnostic_id", diagnostic_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [_serialize(row) for row in (result.data or [])]


@router.delete("/{diagnostic_id}/documents/{doc_id}")
def delete_document(diagnostic_id: str, doc_id: str) -> dict:
    """Supprime un document (fichier dans le Storage + enregistrement)."""
    supabase = get_supabase()
    doc = _get_document(diagnostic_id, doc_id)

    try:
        supabase.storage.from_(BUCKET).remove([doc["storage_path"]])
    except Exception:  # noqa: BLE001 — on supprime quand même l'enregistrement
        pass

    supabase.table("dossier_documents").delete().eq("id", doc_id).execute()

    diagnostic = _get_diagnostic(diagnostic_id)
    progress = _recompute_progress(diagnostic_id, diagnostic)
    return {"deleted": True, "progress": progress.model_dump()}


@router.post("/{diagnostic_id}/verify/{doc_id}", response_model=DocumentOut)
def verify_document(diagnostic_id: str, doc_id: str) -> DocumentOut:
    """Télécharge le document et lance l'analyse IA, puis met à jour son statut."""
    supabase = get_supabase()
    doc = _get_document(diagnostic_id, doc_id)
    diagnostic = _get_diagnostic(diagnostic_id)

    try:
        file_bytes = supabase.storage.from_(BUCKET).download(doc["storage_path"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=502, detail=f"Impossible de récupérer le fichier : {exc}"
        ) from exc

    verdict = document_analyzer.analyze_document(
        doc_type=doc["type"],
        file_bytes=file_bytes,
        content_type=_content_type_from_name(doc["filename"]),
        context=_analysis_context(diagnostic),
    )

    updated = (
        supabase.table("dossier_documents")
        .update(
            {
                "status": verdict["status"],
                "note": verdict["note"],
                "feedback": verdict["feedback"],
                "suggestions": verdict["suggestions"],
                "updated_at": "now()",
            }
        )
        .eq("id", doc_id)
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=500, detail="Mise à jour du document échouée.")

    _recompute_progress(diagnostic_id, diagnostic)
    return _serialize(updated.data[0])


@router.get("/{diagnostic_id}/progress", response_model=ProgressOut)
def get_progress(diagnostic_id: str) -> ProgressOut:
    """Renvoie (et met à jour) le score de progression du dossier."""
    diagnostic = _get_diagnostic(diagnostic_id)
    return _recompute_progress(diagnostic_id, diagnostic)
