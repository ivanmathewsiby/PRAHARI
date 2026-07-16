from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "PRAHARI Backend"
    APP_VERSION: str = "1.0.0"

    DATABASE_URL: str = (
        "postgresql://postgres:postgres@postgres:5432/prahari"
    )


settings = Settings()