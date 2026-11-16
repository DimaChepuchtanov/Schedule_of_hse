from __future__ import annotations

from typing import override

from django.db.models import BigAutoField, CharField, IntegerField, Model

from project_manage.settings.components.database import DataBaseSchems, get_database_table_name


class University(Model):
    id: BigAutoField[int, int] = BigAutoField(
        verbose_name="Уникальный номер", primary_key=True, auto_created=True
    )

    name: CharField[str, str] = CharField(verbose_name="Наименование вуза", max_length=255)

    timezone: CharField[str, str] = CharField(verbose_name="Тайм зона", max_length=300)

    pair_minutes: IntegerField[int, int] = IntegerField(verbose_name="Длина пары", default=80)

    academic_hour_minutes: IntegerField[int, int] = IntegerField(
        verbose_name="Академический час", default=40
    )

    transfer_minutes: IntegerField[int, int] = IntegerField(
        verbose_name="Время между корпусами", default=20
    )

    @override
    def __str__(self) -> str:
        return self.name

    class Meta:
        db_table = get_database_table_name(DataBaseSchems.REFERENCE, "university")
