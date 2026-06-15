"""Intégration CinetPay (FCFA / mobile money : Wave, Orange Money, MTN MoMo, carte).

Documentation : https://docs.cinetpay.com/api/1.0-fr/

Flux :
  1. `initiate_payment` -> on crée une transaction, CinetPay renvoie une URL de
     paiement (`payment_url`) vers laquelle on redirige l'utilisateur.
  2. CinetPay appelle ensuite notre `notify_url` (serveur -> serveur).
  3. On vérifie le statut réel avec `check_payment` avant de livrer le rapport.
"""

from __future__ import annotations

import httpx

from app.core.config import settings


class CinetPayError(RuntimeError):
    """Erreur renvoyée par l'API CinetPay ou en cas de configuration manquante."""


def _require_config() -> None:
    if not settings.CINETPAY_API_KEY or not settings.CINETPAY_SITE_ID:
        raise CinetPayError(
            "CINETPAY_API_KEY et CINETPAY_SITE_ID doivent être définis dans .env"
        )


def initiate_payment(
    *,
    transaction_id: str,
    amount: int,
    description: str,
    customer_email: str,
    customer_name: str | None = None,
    metadata: str | None = None,
) -> dict:
    """Initialise une transaction CinetPay et renvoie l'URL de paiement.

    Args:
        transaction_id: identifiant unique de la transaction (côté VisaCoach).
        amount: montant en FCFA (doit être un multiple de 5 pour XOF).
        description: libellé affiché au client.
        customer_email: email du client.
        customer_name: nom du client (optionnel).
        metadata: données libres renvoyées dans la notification (optionnel).

    Returns:
        dict avec au moins `payment_url` et `payment_token`.

    Raises:
        CinetPayError: si la configuration ou la réponse de CinetPay est invalide.
    """
    _require_config()

    payload = {
        "apikey": settings.CINETPAY_API_KEY,
        "site_id": settings.CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
        "amount": amount,
        "currency": "XOF",
        "description": description,
        "notify_url": settings.CINETPAY_NOTIFY_URL,
        "return_url": settings.CINETPAY_RETURN_URL,
        "channels": "ALL",
        "lang": "fr",
        "customer_email": customer_email,
        "customer_name": customer_name or "Client",
        "metadata": metadata or transaction_id,
    }

    try:
        response = httpx.post(
            f"{settings.CINETPAY_BASE_URL}/payment",
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise CinetPayError(f"Erreur réseau CinetPay : {exc}") from exc

    if data.get("code") != "201":
        raise CinetPayError(
            f"CinetPay a refusé la transaction : {data.get('message', data)}"
        )

    return {
        "payment_url": data["data"]["payment_url"],
        "payment_token": data["data"]["payment_token"],
        "transaction_id": transaction_id,
    }


def check_payment(transaction_id: str) -> dict:
    """Vérifie le statut réel d'une transaction auprès de CinetPay.

    Returns:
        dict avec `status` ("ACCEPTED", "REFUSED", "PENDING"...) et les détails.
    """
    _require_config()

    payload = {
        "apikey": settings.CINETPAY_API_KEY,
        "site_id": settings.CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
    }

    try:
        response = httpx.post(
            f"{settings.CINETPAY_BASE_URL}/payment/check",
            json=payload,
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPError as exc:
        raise CinetPayError(f"Erreur réseau CinetPay (check) : {exc}") from exc

    status = data.get("data", {}).get("status", "UNKNOWN")
    return {"status": status, "raw": data}
