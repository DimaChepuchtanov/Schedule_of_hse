from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import uuid4

from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db.models import (
    PROTECT,
    BooleanField,
    CharField,
    DateField,
    DateTimeField,
    FileField,
    ForeignKey,
    Model,
    PositiveIntegerField,
    TextChoices,
    UUIDField,
)

from project_manage.settings.components.database import DataBaseSchems, get_database_table_name

if TYPE_CHECKING:
    from datetime import date, datetime
    from uuid import UUID


class KindChoice(TextChoices):
    BASE = "BASE", "Базовое расписание модуля"
    WEEKLY = "WEEKLY", "Недельное расписание"


def schedule_upload_to(instance, filename: str) -> str:
    return f"schedules/{instance.pk}/{uuid4().hex}.xlsx"


class Schedule(Model):
    uuid: UUIDField[UUID, UUID] = UUIDField(primary_key=True, default=uuid4, editable=False)

    module = ForeignKey(
        "reference_data.AcademicModule",
        on_delete=PROTECT,
        related_name="schedule_versions",
        verbose_name="Учебный модуль",
        null=True,
        blank=True,
    )

    kind: CharField[str, str] = CharField(
        verbose_name="Тип расписания",
        choices=KindChoice.choices,
        default=KindChoice.BASE,
        max_length=200,
    )

    week_start: DateField[date | None, date | None] = DateField(
        verbose_name="Дата начала недели", null=True, blank=True
    )

    revision: PositiveIntegerField[int, int] = PositiveIntegerField(
        verbose_name="Номер версии",
        validators=[
            MinValueValidator(1),
        ],
    )

    xlsx_file = FileField(
        verbose_name="Файл расписания",
        upload_to=schedule_upload_to,
        max_length=500,
        validators=[FileExtensionValidator(["xlsx"])],
    )

    created_at: DateTimeField[datetime, datetime] = DateTimeField(
        verbose_name="Дата и время создания", auto_now_add=True
    )

    is_published: BooleanField[bool, bool] = BooleanField(
        verbose_name="Опубликована ли версия", default=False
    )

    published_at: DateTimeField[datetime | None, datetime | None] = DateTimeField(
        verbose_name="Дата публикации", null=True, blank=True
    )

    checksum: CharField[str, str] = CharField(
        verbose_name="SHA-256 файл для проверки целостности", max_length=64
    )

    class Meta:
        db_table = get_database_table_name(DataBaseSchems.SCHEDULE, "schedule_version")
