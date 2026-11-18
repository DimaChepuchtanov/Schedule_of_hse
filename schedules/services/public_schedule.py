from datetime import date

from django.core.cache import cache

from schedules.models import Schedule



READER_VERSION = 1

def get_public_schedule(
    *,
    module_id: int,
    kind: str,
    week_start: date | None = None
) -> dict:
    if kind not in {"BASE", "WEEKLY"}:
        raise ValueError("Неизвестный тип расписания")

    if kind == "WEEKLY" and (
        week_start is None or week_start.weekday() != 0
    ):
        raise ValueError("Для недельного расписания укажи дату понедельника.")

    if kind == "BASE" and week_start is not None:
        raise ValueError("Для базового расписания не задается week_start")


    version = Schedule.objects.get(
        module_id=module_id,
        kind=kind,
        week_start=week_start,
        is_published=True
    )

    cache_key = (
        f"schedule:reader-{READER_VERSION}:"
        f"{version.pk}:{version.checksum}"
    )

    data = cache.get(cache_key)

    if data is not None:
        return data

    