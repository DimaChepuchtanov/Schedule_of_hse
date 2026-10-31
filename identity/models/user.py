from __future__ import annotations

from uuid import uuid4
from typing import TYPE_CHECKING, override

from django.db.models import UUIDField, EmailField, CharField, ForeignKey, PROTECT
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser

from .role import RoleModel
from project_manage.settings.components.database import DataBaseSchems, get_database_table_name


if TYPE_CHECKING:
    from uuid import UUID


class UserManager(BaseUserManager):
    def create_user(self, login: str, password: str | None = None, **extra_fields):
        if not login:
            raise ValueError("A login is required.")

        user = self.model(
            login=self.normalize_email(login),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user


class UserModel(AbstractBaseUser):
    objects = UserManager()

    uuid: UUIDField[UUID, UUID] = UUIDField(
        verbose_name="Уникальный номер пользователя",
        primary_key=True,
        default=uuid4,
        editable=False
    )

    login: EmailField[str, str] = EmailField(
        verbose_name="Логин пользователя",
        null=False,
        max_length=250,
        unique=True
    )

    password: CharField[str, str] = CharField(
        max_length=300
    )

    role = ForeignKey(
        to=RoleModel,
        on_delete=PROTECT,
        related_name="users"
    )

    
    USERNAME_FIELD = "login"          # по какому полю логиниться
    REQUIRED_FIELDS = []

    @property
    def is_anonymous(self) -> bool:
        return False

    @property
    def is_authenticated(self) -> bool:
        return True

    @override
    def __str__(self):
        return f"Пользователь: {self.login}"


    class Meta:
        db_table = get_database_table_name(
            DataBaseSchems.IDENTITY,
            "user"
        )
    
    
