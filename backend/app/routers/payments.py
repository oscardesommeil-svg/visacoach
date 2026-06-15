"""Paiements : CinetPay (FCFA, Afrique) et Stripe (EUR, diaspora).

Deux offres :
  - "rapport" : Rapport complet     (6 500 FCFA / 9,90 €)
  - "suivi"   : Suivi Expert        (19 600 FCFA / 29,90 €)

Chaque paiement est rattaché à un diagnostic existant. À la validation du
paiement, on marque la commande comme payée puis on peut générer le rapport.
"""

from __future__ import annotations

import uuid
from typing import Literal

import stripe
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.supabase import get_supabase
from app.services import cinetpay

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY

Plan = Literal["rapport", "suivi"]
Provider = Literal["cinetpay", "stripe"]


# ---------------------------------------------------------------------------
# Tarifs centralisés
# ---------------------------------------------------------------------------
def _price_fcfa(plan: Plan) -> int:
    return settings.PRICE_RAPPORT_FCFA if plan == "rapport" else settings.PRICE_SUIVI_FCFA


def _price_eur_cents(plan: Plan) -> int:
    return (
        settings.PRICE_RAPPORT_EUR_CENTS
        if plan == "rapport"
        else settings.PRICE_SUIVI_EUR_CENTS
    )


def _plan_label(plan: Plan) -> str:
    return "Rapport complet" if plan == "rapport" else "Suivi Expert"


# ---------------------------------------------------------------------------
# Modèles
# ---------------------------------------------------------------------------
class CheckoutRequest(BaseModel):
    """Demande de création d'un paiement."""

    diagnostic_id: str
    email: EmailStr
    plan: Plan = "rapport"
    full_name: str | None = None


class CheckoutResponse(BaseModel):
    """Réponse contenant l'URL de paiement à ouvrir côté client."""

    order_id: str
    provider: Provider
    payment_url: str


# ---------------------------------------------------------------------------
# Helpers de persistance
# ---------------------------------------------------------------------------
def _create_order(
    *, diagnostic_id: str, email: str, plan: Plan, provider: Provider, amount: int,
    currency: str, transaction_id: str,
) -> dict:
    supabase = get_supabase()
    record = {
        "diagnostic_id": diagnostic_id,
        "email": email,
        "plan": plan,
        "provider": provider,
        "amount": amount,
        "currency": currency,
        "transaction_id": transaction_id,
        "status": "pending",
    }
    result = supabase.table("orders").insert(record).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Commande non créée.")
    return result.data[0]


def _mark_order_paid(transaction_id: str) -> dict | None:
    supabase = get_supabase()
    result = (
        supabase.table("orders")
        .update({"status": "paid"})
        .eq("transaction_id", transaction_id)
        .execute()
    )
    return result.data[0] if result.data else None


# ---------------------------------------------------------------------------
# CinetPay (FCFA)
# ---------------------------------------------------------------------------
@router.post("/cinetpay/checkout", response_model=CheckoutResponse)
def cinetpay_checkout(payload: CheckoutRequest) -> CheckoutResponse:
    """Crée une transaction CinetPay et renvoie l'URL de paiement mobile money."""
    amount = _price_fcfa(payload.plan)
    transaction_id = f"vc_{uuid.uuid4().hex[:20]}"

    order = _create_order(
        diagnostic_id=payload.diagnostic_id,
        email=payload.email,
        plan=payload.plan,
        provider="cinetpay",
        amount=amount,
        currency="XOF",
        transaction_id=transaction_id,
    )

    try:
        result = cinetpay.initiate_payment(
            transaction_id=transaction_id,
            amount=amount,
            description=f"VisaCoach — {_plan_label(payload.plan)}",
            customer_email=payload.email,
            customer_name=payload.full_name,
            metadata=payload.diagnostic_id,
        )
    except cinetpay.CinetPayError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return CheckoutResponse(
        order_id=str(order["id"]),
        provider="cinetpay",
        payment_url=result["payment_url"],
    )


@router.post("/cinetpay/notify")
async def cinetpay_notify(request: Request) -> dict:
    """Notification serveur->serveur de CinetPay.

    CinetPay envoie le `cpm_trans_id`. On vérifie le statut réel avant de marquer
    la commande comme payée (ne jamais faire confiance au seul callback).
    """
    form = await request.form()
    transaction_id = form.get("cpm_trans_id") or form.get("transaction_id")
    if not transaction_id:
        raise HTTPException(status_code=400, detail="transaction_id manquant.")

    try:
        check = cinetpay.check_payment(str(transaction_id))
    except cinetpay.CinetPayError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    if check["status"] == "ACCEPTED":
        _mark_order_paid(str(transaction_id))
        return {"status": "ok"}

    return {"status": "ignored", "cinetpay_status": check["status"]}


@router.get("/cinetpay/verify/{transaction_id}")
def cinetpay_verify(transaction_id: str) -> dict:
    """Vérifie manuellement une transaction (appelé depuis la page Succès)."""
    try:
        check = cinetpay.check_payment(transaction_id)
    except cinetpay.CinetPayError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    paid = check["status"] == "ACCEPTED"
    if paid:
        _mark_order_paid(transaction_id)
    return {"paid": paid, "status": check["status"]}


# ---------------------------------------------------------------------------
# Stripe (EUR)
# ---------------------------------------------------------------------------
@router.post("/stripe/checkout", response_model=CheckoutResponse)
def stripe_checkout(payload: CheckoutRequest) -> CheckoutResponse:
    """Crée une session Stripe Checkout et renvoie l'URL hébergée."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe n'est pas configuré.")

    amount = _price_eur_cents(payload.plan)
    transaction_id = f"vc_{uuid.uuid4().hex[:20]}"

    order = _create_order(
        diagnostic_id=payload.diagnostic_id,
        email=payload.email,
        plan=payload.plan,
        provider="stripe",
        amount=amount,
        currency="EUR",
        transaction_id=transaction_id,
    )

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            customer_email=payload.email,
            line_items=[
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {
                            "name": f"VisaCoach — {_plan_label(payload.plan)}",
                        },
                        "unit_amount": amount,
                    },
                    "quantity": 1,
                }
            ],
            success_url=settings.STRIPE_SUCCESS_URL,
            cancel_url=settings.STRIPE_CANCEL_URL,
            client_reference_id=transaction_id,
            metadata={
                "transaction_id": transaction_id,
                "diagnostic_id": payload.diagnostic_id,
                "plan": payload.plan,
            },
        )
    except stripe.StripeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return CheckoutResponse(
        order_id=str(order["id"]),
        provider="stripe",
        payment_url=session.url,
    )


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request) -> dict:
    """Webhook Stripe : marque la commande payée sur `checkout.session.completed`."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail=f"Webhook invalide : {exc}") from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        transaction_id = session.get("client_reference_id") or session.get(
            "metadata", {}
        ).get("transaction_id")
        if transaction_id:
            _mark_order_paid(transaction_id)

    return {"received": True}
