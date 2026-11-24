from django.db import models

from project_manage.settings.components.database import (
    DataBaseSchems,
    get_database_table_name,
)


class AcademicModule(models.Model):
    id = models.BigAutoField(
        primary_key=True,
        verbose_name="Идентификатор модуля",
    )

    university = models.ForeignKey(
        "reference_data.University",
        on_delete=models.PROTECT,
        related_name="academic_modules",
        verbose_name="Вуз",
    )

    academic_year = models.PositiveSmallIntegerField(
        verbose_name="Год начала учебного года",
        help_text="2026 означает учебный год 2026/2027.",
    )

    number = models.PositiveSmallIntegerField(
        verbose_name="Номер модуля",
        choices=[
            (1, "Первый модуль"),
            (2, "Второй модуль"),
            (3, "Третий модуль"),
            (4, "Четвёртый модуль"),
        ],
    )

    starts_on = models.DateField(verbose_name="Дата начала")
    ends_on = models.DateField(verbose_name="Дата окончания")

    def __str__(self) -> str:
        return f"{self.number} модуль, {self.academic_year}/{self.academic_year + 1}"

    class Meta:
        db_table = get_database_table_name(
            DataBaseSchems.REFERENCE,
            "academic_module",
        )

        verbose_name = "Учебный модуль"
        verbose_name_plural = "Учебные модули"
        ordering = ["-academic_year", "number"]

        constraints = [
            models.UniqueConstraint(
                fields=["university", "academic_year", "number"],
                name="academic_module_unique_period",
            ),
            models.CheckConstraint(
                condition=models.Q(academic_year__gt=0),
                name="academic_module_positive_year",
            ),
            models.CheckConstraint(
                condition=models.Q(number__gte=1, number__lte=4),
                name="academic_module_number_range",
            ),
            models.CheckConstraint(
                condition=models.Q(ends_on__gte=models.F("starts_on")),
                name="academic_module_valid_dates",
            ),
        ]
