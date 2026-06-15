"""Envoi d'emails transactionnels via Resend.

Sert principalement à livrer le rapport au candidat une fois le paiement validé.
Si la clé Resend n'est pas configurée, les fonctions ne lèvent pas d'erreur
bloquante : elles renvoient simplement False (utile en développement).
"""

from __future__ import annotations

import resend

from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY


def _markdown_to_basic_html(markdown: str) -> str:
    """Conversion minimale Markdown -> HTML pour le corps de l'email.

    Volontairement simple (titres, listes, paragraphes). Pour un rendu riche,
    on peut brancher une vraie lib Markdown plus tard.
    """
    html_lines = []
    for raw in markdown.splitlines():
        line = raw.rstrip()
        if not line:
            html_lines.append("<br/>")
        elif line.startswith("## "):
            html_lines.append(f"<h2>{line[3:]}</h2>")
        elif line.startswith("# "):
            html_lines.append(f"<h1>{line[2:]}</h1>")
        elif line.startswith("- "):
            html_lines.append(f"<li>{line[2:]}</li>")
        else:
            html_lines.append(f"<p>{line}</p>")
    return "\n".join(html_lines)


def send_report_email(*, to_email: str, full_name: str | None, report_markdown: str) -> bool:
    """Envoie le rapport par email. Renvoie True si l'envoi a réussi."""
    if not settings.RESEND_API_KEY:
        # Pas de clé configurée : on n'échoue pas, on signale juste l'absence.
        return False

    prenom = (full_name or "").split(" ")[0] or "bonjour"
    body_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: auto;">
      <h1 style="color:#1d4ed8;">Votre rapport VisaCoach</h1>
      <p>Bonjour {prenom},</p>
      <p>Merci pour votre confiance. Voici votre rapport personnalisé :</p>
      <hr/>
      {_markdown_to_basic_html(report_markdown)}
      <hr/>
      <p style="color:#64748b;font-size:12px;">
        VisaCoach — Ce rapport est un accompagnement méthodologique et ne garantit
        pas l'obtention du visa.
      </p>
    </div>
    """

    try:
        resend.Emails.send(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": "Votre rapport VisaCoach personnalisé",
                "html": body_html,
            }
        )
        return True
    except Exception:  # noqa: BLE001 — l'échec d'email ne doit pas casser le flux
        return False
