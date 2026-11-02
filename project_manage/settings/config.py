import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    PG_USER = os.getenv("PG_USER", None)
    PG_PASSWORD = os.getenv("PG_PASSWORD", None)
    PG_HOST = os.getenv("PG_HOST", 'localhost')
    PG_PORT = os.getenv("PG_PORT", 5432)
    PG_DATABASE = os.getenv("PG_DATABASE", None)

    SECRET_KEY = os.getenv("SECRET_KEY", None)
    DJANGO_ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", None)
    DJANGO_CSRF_TRUSTED_ORIGINS = os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", None)
    DJANGO_COOKIE_SECURE = os.getenv("DJANGO_COOKIE_SECURE", "0").strip().lower() in {"1", "true", "yes", "on"}
    
    @classmethod
    def validate(cls) -> None:
        required_variables = {
            "PG_USER": cls.PG_USER,
            "PG_PASSWORD": cls.PG_PASSWORD,
            "PG_DATABASE": cls.PG_DATABASE
        }

        missing_variables = [
            name 
            for name, value in required_variables.items()
            if not value
        ]

        if missing_variables:
            raise RuntimeError(
                "Не заданы обязательные переменные окружения: "
                + ", ".join(missing_variables)
            )


Config.validate()

