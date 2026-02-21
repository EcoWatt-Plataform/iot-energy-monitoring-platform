import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values

@dataclass(frozen=True)
class Settings:
    db_path: str
    app_secret: str
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    admin_emails: tuple[str, ...]

    @staticmethod
    def load() -> "Settings":
        load_dotenv()
        repo_root = Path(__file__).resolve().parents[2]
        frontend_env = _read_env_file(repo_root / "frontend" / ".env.local")

        supabase_url = (
            os.getenv("SUPABASE_URL")
            or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            or frontend_env.get("NEXT_PUBLIC_SUPABASE_URL", "")
        )
        if not supabase_url:
            raise RuntimeError(
                "Supabase URL is not configured. Please set the SUPABASE_URL "
                "environment variable (or NEXT_PUBLIC_SUPABASE_URL)."
            )

        supabase_anon_key = (
            os.getenv("SUPABASE_ANON_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")
            or frontend_env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
            or frontend_env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "")
        )
        if not supabase_anon_key:
            raise RuntimeError(
                "Supabase anonymous key is not configured. Please set the "
                "SUPABASE_ANON_KEY environment variable (or "
                "NEXT_PUBLIC_SUPABASE_ANON_KEY / "
                "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)."
            )

        supabase_service_role_key = (
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            or frontend_env.get("SUPABASE_SERVICE_ROLE_KEY", "")
        )

        raw_admin_emails = os.getenv("ADMIN_EMAILS", "")
        admin_emails = tuple(
            email.strip().lower()
            for email in raw_admin_emails.split(",")
            if email.strip()
        )
        return Settings(
            db_path=os.getenv("DB_PATH", "./data/sisterna.sqlite"),
            app_secret=os.getenv("APP_SECRET", "dev-secret"),
            supabase_url=supabase_url,
            supabase_anon_key=supabase_anon_key,
            supabase_service_role_key=supabase_service_role_key,
            admin_emails=admin_emails,
        )
