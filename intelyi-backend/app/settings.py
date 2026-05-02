from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    FRONTEND_URL: str | None = None
    CORS_ORIGINS: str | None = None
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_SUCCESS_URL: str = "http://localhost:3000/checkout/success"
    STRIPE_CANCEL_URL: str = "http://localhost:3000/checkout/cancel"
    INTERNAL_API_TOKEN: str = "intelyi-dev-internal-token"
    AUTO_BOOTSTRAP_SCHEMA: bool = True

    @property
    def allowed_cors_origins(self) -> list[str]:
        if self.CORS_ORIGINS:
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

        origin = self.FRONTEND_URL or self.FRONTEND_ORIGIN
        return [origin] if origin else []

settings = Settings()
