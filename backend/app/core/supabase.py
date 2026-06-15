"""Client Supabase partagé (PostgreSQL + Auth + Storage).

On instancie un client avec la clé `service_role` : il a tous les droits et
contourne les Row Level Security policies. À n'utiliser que côté serveur.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache
def get_supabase() -> Client:
    """Retourne un client Supabase unique (mis en cache).

    Raises:
        RuntimeError: si les variables Supabase ne sont pas configurées.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
        raise RuntimeError(
            "SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis dans .env"
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
