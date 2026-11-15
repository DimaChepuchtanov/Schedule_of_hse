from __future__ import annotations

from typing import override

from django.db.models import Model, AutoField, CharField

from project_manage.settings.components.database import DataBaseSchems, get_database_table_name


class RoleModel(Model):
    id: AutoField[int, int] = AutoField(
        verbose_name="Индивидуальный номер роли",
        primary_key=True,
        auto_created=True
    )

    name: CharField[str, str] = CharField(
        verbose_name="Наименование роли",
        max_length=200
    )

    @override
    def __str__(self):
        return f"Роль: {self.name}"

    class Meta:
        db_table = get_database_table_name(
            DataBaseSchems.IDENTITY,
            "role"
        )