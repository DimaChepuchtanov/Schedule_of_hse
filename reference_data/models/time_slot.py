from __future__ import annotations

from typing import TYPE_CHECKING, override

from django.db.models import PROTECT, BigAutoField, CharField, ForeignKey, Model, TimeField

from project_manage.settings.components.database import DataBaseSchems, get_database_table_name

from .university import University

if TYPE_CHECKING:
    from datetime import time


class TimeSlot(Model):
    id: BigAutoField[int, int] = BigAutoField(
        verbose_name="Уникальный номер", primary_key=True, auto_created=True
    )

    university: ForeignKey[University, University] = ForeignKey(
        to=University, on_delete=PROTECT, related_name="time_slot"
    )

    number: CharField[str, str] = CharField(verbose_name="Номер пары", max_length=15)

    starts_at: TimeField[time, time] = TimeField(verbose_name="Время начала пары")

    ends_at: TimeField[time, time] = TimeField(verbose_name="Время конца пары")

    @override
    def __str__(self) -> str:
        return f"{self.number} : {self.starts_at.isoformat()} - {self.ends_at.isoformat()}"

    class Meta:
        db_table = get_database_table_name(DataBaseSchems.REFERENCE, "time_slot")
