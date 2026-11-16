from __future__ import annotations

from enum import Enum
from typing import override

from django.db.models import (
    PROTECT,
    BigAutoField,
    BooleanField,
    CharField,
    ForeignKey,
    IntegerField,
    Model,
)

from project_manage.settings.components.database import DataBaseSchems, get_database_table_name

from .building import Building


class RoomType(Enum):
    COMPUTER: str = "computer"
    LECTOR: str = "lector"
    OTHER: str = "other"


class Room(Model):
    id: BigAutoField[int, int] = BigAutoField(
        verbose_name="Уникальный номер", auto_created=True, primary_key=True
    )

    building: ForeignKey[Building, Building] = ForeignKey(
        to=Building, on_delete=PROTECT, related_name="room"
    )

    number: CharField[str, str] = CharField(verbose_name="Номер аудитории", max_length=100)

    capacity: IntegerField[int, int] = IntegerField(verbose_name="Вместимость аудитории")

    room_type: CharField[str, str] = CharField(verbose_name="Тип аудитории", default=RoomType.OTHER)

    is_active: BooleanField[bool, bool] = BooleanField(verbose_name="Активна ли", default=True)

    @override
    def __str__(self) -> str:
        return f"{self.building.name} -> {self.number}"

    class Meta:
        db_table = get_database_table_name(DataBaseSchems.REFERENCE, "room")
