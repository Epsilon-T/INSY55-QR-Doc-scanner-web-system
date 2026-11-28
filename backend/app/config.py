from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    db_user: str = "root"
    db_password: str = ""
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "qr_scanner_system"

    qr_secret_key: str
    jwt_secret_key: str
    jwt_expire_minutes: int = 1
    app_timezone: str = "Asia/Manila"

    # Folder with the built website (npm run build). Empty means ../frontend/dist next to this backend folder.
    frontend_dist: str = ""


settings = Settings()
