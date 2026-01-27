import os
from dataclasses import dataclass
from dotenv import load_dotenv

@dataclass(frozen=True)
class Settings:
    db_path: str
    app_secret: str

    @staticmethod
    def load() -> "Settings":
        load_dotenv()
        return Settings(
            db_path=os.getenv("DB_PATH", "./data/sisterna.sqlite"),
            app_secret=os.getenv("APP_SECRET", "dev-secret"),
        )
