from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = ""  # set in .env when you’re ready
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    STRIPE_SECRET_KEY: str = "STRIPE_SECRET_KEY_FROM_ENV"
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_SUCCESS_URL: str = "http://localhost:3000/checkout/success"
    STRIPE_CANCEL_URL: str = "http://localhost:3000/checkout/cancel"
    INTERNAL_API_TOKEN: str = "intelyi-dev-internal-token"
    AUTO_BOOTSTRAP_SCHEMA: bool = True

settings = Settings()
