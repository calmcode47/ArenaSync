from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    DATABASE_URL: str
    
    UPSTASH_REDIS_REST_URL: str
    UPSTASH_REDIS_REST_TOKEN: str
    
    FIREBASE_CREDENTIALS_PATH: str
    FIREBASE_PROJECT_ID: str
    
    GOOGLE_MAPS_API_KEY: str
    GOOGLE_TRANSLATE_API_KEY: str
    
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]
    
    ADMIN_EMAIL: str = "admin@arenaflow.com"
    ADMIN_PASSWORD: str = "admin"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

settings = Settings()
