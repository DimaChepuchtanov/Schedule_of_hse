from __future__ import annotations

import logging
from datetime import date
from re import fullmatch

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET
from redis.exceptions import RedisError

from .models import Schedule
from .services.public_schedule import get_public_schedule
from .services.xlsx_reader import ScheduleFormatError

logger = logging.getLogger(__name__)


def json_response(data: dict, *, status: int = 200) -> JsonResponse:
    return JsonResponse(
        data,
        status=status,
        json_dumps_params={"ensure_ascii": False},
        # Актуальность данных контролируем на сервере через БД и Redis.
        headers={"Cache-Control": "no-store"},
    )


def parse_period(
    request: HttpRequest,
) -> tuple[int, str, date | None]:
    try:
        module_id = int(request.GET.get("module_id", ""))
    except (TypeError, ValueError) as error:
        raise ValueError("Укажи корректный module_id.") from error

    if module_id <= 0:
        raise ValueError("module_id должен быть больше нуля.")

    kind = request.GET.get("kind", "").strip().upper()

    if kind not in {"BASE", "WEEKLY"}:
        raise ValueError("kind должен быть BASE или WEEKLY.")

    raw_week = request.GET.get("week_start", "").strip()

    if kind == "BASE":
        if raw_week:
            raise ValueError("Для базового расписания week_start не задаётся.")

        return module_id, kind, None

    if not fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", raw_week):
        raise ValueError("Для недельного расписания укажи week_start: YYYY-MM-DD.")

    try:
        week_start = date.fromisoformat(raw_week)
    except ValueError as error:
        raise ValueError("Указана некорректная дата.") from error

    if week_start.weekday() != 0:
        raise ValueError("week_start должен быть понедельником.")

    return module_id, kind, week_start


@require_GET
def published_versions(request: HttpRequest) -> JsonResponse:
    versions = (
        Schedule.objects.filter(is_published=True)
        .order_by("module_id", "kind", "-week_start", "-revision")
        .values(
            "uuid",
            "module_id",
            "kind",
            "week_start",
            "revision",
            "created_at",
            "published_at",
        )
    )

    return json_response({"results": list(versions)})


@require_GET
def published_schedule(request: HttpRequest) -> JsonResponse:
    try:
        module_id, kind, week_start = parse_period(request)
    except ValueError as error:
        return json_response({"detail": str(error)}, status=400)

    try:
        data = get_public_schedule(
            module_id=module_id,
            kind=kind,
            week_start=week_start,
        )

    except Schedule.DoesNotExist:
        return json_response(
            {"detail": "Расписание выбранного периода ещё не опубликовано."},
            status=404,
        )

    except Schedule.MultipleObjectsReturned:
        logger.exception("Для одного периода найдено несколько опубликованных расписаний.")
        return json_response(
            {"detail": "Не удалось однозначно выбрать расписание."},
            status=503,
        )

    except (ScheduleFormatError, OSError):
        logger.exception("Не удалось прочитать опубликованный XLSX.")
        return json_response(
            {"detail": "Файл расписания временно недоступен."},
            status=503,
        )

    except RedisError:
        logger.exception("Redis недоступен.")
        return json_response(
            {"detail": "Сервис расписания временно недоступен."},
            status=503,
        )

    return json_response(data)
