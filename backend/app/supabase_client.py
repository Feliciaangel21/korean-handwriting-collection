from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def upload_png(path: str, data: bytes) -> None:
    settings = get_settings()
    client = get_supabase_client()
    client.storage.from_(settings.storage_bucket).upload(
        path,
        data,
        file_options={"content-type": "image/png", "upsert": "true"},
    )


def create_signed_url(path: str) -> str:
    settings = get_settings()
    client = get_supabase_client()
    result = client.storage.from_(settings.storage_bucket).create_signed_url(
        path, settings.signed_url_ttl_seconds
    )
    return result["signedURL"] if "signedURL" in result else result["signedUrl"]


def remove_pngs(paths: list[str]) -> None:
    if not paths:
        return
    settings = get_settings()
    client = get_supabase_client()
    client.storage.from_(settings.storage_bucket).remove(paths)
