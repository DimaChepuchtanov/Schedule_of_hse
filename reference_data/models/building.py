from __future__ import annotations

from typing import override

from django.db.models import PROTECT, BigAutoField, CharField, ForeignKey, Model

from project_manage.settings.components.database import DataBaseSchems, get_database_table_name

from .university import University


class Building(Model):
    id: BigAutoField[int, int] = BigAutoField(
        verbose_name="Уникальный номер", primary_key=True, auto_created=True
    )

    university: ForeignKey[University, University] = ForeignKey(
        to=University, on_delete=PROTECT, related_name="building"
    )

    build: CharField[str, str] = CharField(verbose_name="Адрес корпуса", max_length=500)

    name: CharField[str, str] = CharField(verbose_name="Наименование здания", max_length=30)

    @override
    def __str__(self) -> str:
        return self.build

    class Meta:
        db_table = get_database_table_name(DataBaseSchems.REFERENCE, "building")
