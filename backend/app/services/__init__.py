from flask import current_app


def _db_path() -> str:
    return current_app.config["SETTINGS"].db_path


def _auth_config():
    settings = current_app.config["SETTINGS"]
    return settings.supabase_url, settings.supabase_anon_key


def _admin_auth_config():
    settings = current_app.config["SETTINGS"]
    return settings.supabase_url, settings.supabase_service_role_key


def _is_valid_email(value: str) -> bool:
    if " " in value or "@" not in value:
        return False
    _, _, domain = value.partition("@")
    return "." in domain


def _clean_optional_text(value: object) -> str | None:
    text = str(value or "").strip()
    return text or None


def _normalize_document_type(value: object) -> str | None:
    raw = str(value or "").strip().upper()
    if raw in {"DNI", "CUIT"}:
        return raw
    return None
