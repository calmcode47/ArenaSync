from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str
    DATABASE_MIGRATION_URL: str | None = None  # Used by Alembic only; falls back to DATABASE_URL if not set

    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str

    FIREBASE_CREDENTIALS_PATH: str
    FIREBASE_PROJECT_ID: str

    GOOGLE_MAPS_API_KEY: str
    GOOGLE_TRANSLATE_API_KEY: str

    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]
    DEMO_MODE: bool = True

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    DEMO_VENUE_ID: str | None = None

    ADMIN_EMAIL: str = "admin@arenaflow.com"
    ADMIN_PASSWORD: str = "admin"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    @property
    def alembic_url(self) -> str:
        """Returns sync-compatible URL for Alembic migrations."""
        if self.DATABASE_MIGRATION_URL:
            return self.DATABASE_MIGRATION_URL
        # Convert asyncpg URL to psycopg2 for Alembic sync compatibility
        return self.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://").split("?")[0]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

settings = Settings()
