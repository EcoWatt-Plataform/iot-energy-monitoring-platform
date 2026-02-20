import os
from dataclasses import dataclass
from dotenv import load_dotenv

@dataclass(frozen=True)
class Settings:
    db_path: str
    app_secret: str
    supabase_url: str
    supabase_anon_key: str

    @staticmethod
    def load() -> "Settings":
        load_dotenv()

        supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        if not supabase_url:
            raise RuntimeError(
                "Supabase URL is not configured. Please set the SUPABASE_URL "
                "environment variable (or NEXT_PUBLIC_SUPABASE_URL)."
            )

        supabase_anon_key = (
            os.getenv("SUPABASE_ANON_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")
        )
        if not supabase_anon_key:
            raise RuntimeError(
                "Supabase anonymous key is not configured. Please set the "
                "SUPABASE_ANON_KEY environment variable (or "
                "NEXT_PUBLIC_SUPABASE_ANON_KEY / "
                "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)."
            )

        return Settings(
            db_path=os.getenv("DB_PATH", "./data/sisterna.sqlite"),
            app_secret=os.getenv("APP_SECRET", "dev-secret"),
            supabase_url=supabase_url,
            supabase_anon_key=supabase_anon_key,
        )
