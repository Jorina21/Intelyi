from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = ""  # set in .env when you’re ready
    FRONTEND_ORIGIN: str = "http://localhost:3000"

settings = Settings()