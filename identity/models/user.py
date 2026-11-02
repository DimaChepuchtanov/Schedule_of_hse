from __future__ import annotations

from uuid import uuid4
from typing import TYPE_CHECKING, override
from datetime import datetime

from django.db.models import DateTimeField, UUIDField, EmailField, CharField, BooleanField
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin

from project_manage.settings.components.database import DataBaseSchems, get_database_table_name


if TYPE_CHECKING:
    from uuid import UUID


class UserManager(BaseUserManager):
    def create_user(self, login: str, password: str | None = None, **extra_fields):
        if not login:
            raise ValueError("A login is required.")
        display_name = extra_fields.get("display_name", "")
        if not isinstance(display_name, str) or not display_name.strip():
            raise ValueError("A display name is required.")
        extra_fields["display_name"] = display_name.strip()

        user = self.model(
            login=self.normalize_email(login),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, login: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(login, password, **extra_fields)


class UserModel(AbstractBaseUser, PermissionsMixin):
    objects = UserManager()

    uuid: UUIDField[UUID, UUID] = UUIDField(
        verbose_name="Уникальный номер пользователя",
        primary_key=True,
        default=uuid4,
        editable=False
    )

    display_name: CharField[str, str] = CharField(
        verbose_name="Отображаемое имя пользователя",
        max_length=250,
    )

    login: EmailField[str, str] = EmailField(
        verbose_name="Логин пользователя",
        null=False,
        max_length=250,
        unique=True
    )

    created_at: DateTimeField[datetime, datetime] = DateTimeField(
        verbose_name="Дата создания пользователя",
        auto_now_add=True
    )

    last_login: DateTimeField[datetime, datetime] = DateTimeField(
        verbose_name="Дата последнего входа пользователя",
        blank=True,
        null=True,
    )

    is_staff = BooleanField(default=False)
    is_superuser = BooleanField(default=False)
    is_active = BooleanField(default=True)


    USERNAME_FIELD = "login"
    REQUIRED_FIELDS = ["display_name"]


    @override
    def __str__(self):
        return f"Пользователь: {self.login}"


    class Meta:
        db_table = get_database_table_name(
            DataBaseSchems.IDENTITY,
            "user"
        )
    
    
