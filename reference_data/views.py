from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from .models import AcademicModule, Building, Room, TimeSlot, University

ROOM_TYPE_LABELS = {
    "computer": "Компьютерный класс",
    "lector": "Лекционная",
    "other": "Обычная",
}


def _json(data: dict, status: int = 200) -> JsonResponse:
    return JsonResponse(
        data,
        status=status,
        json_dumps_params={"ensure_ascii": False},
        headers={"Cache-Control": "no-store"},
    )


@require_GET
def reference_catalog(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return _json({"errors": ["Для просмотра справочников необходимо авторизоваться."]}, 401)

    universities = [
        {
            "id": item.id,
            "name": item.name,
            "timezone": item.timezone,
            "pair_minutes": item.pair_minutes,
            "academic_hour_minutes": item.academic_hour_minutes,
            "transfer_minutes": item.transfer_minutes,
        }
        for item in University.objects.order_by("name")
    ]
    buildings = [
        {
            "id": item.id,
            "university": item.university.name,
            "name": item.name,
            "address": item.build,
        }
        for item in Building.objects.select_related("university").order_by("name")
    ]
    rooms = [
        {
            "id": item.id,
            "building": item.building.name,
            "number": item.number,
            "capacity": item.capacity,
            "room_type": ROOM_TYPE_LABELS.get(item.room_type, item.room_type),
            "is_active": item.is_active,
        }
        for item in Room.objects.select_related("building").order_by("building__name", "number")
    ]
    time_slots = [
        {
            "id": item.id,
            "university": item.university.name,
            "number": item.number,
            "starts_at": item.starts_at.strftime("%H:%M"),
            "ends_at": item.ends_at.strftime("%H:%M"),
        }
        for item in TimeSlot.objects.select_related("university").order_by("number")
    ]
    modules = [
        {
            "id": item.id,
            "university": item.university.name,
            "academic_year": item.academic_year,
            "number": item.number,
            "starts_on": item.starts_on.isoformat(),
            "ends_on": item.ends_on.isoformat(),
        }
        for item in AcademicModule.objects.select_related("university").order_by(
            "-academic_year", "number"
        )
    ]
    return _json(
        {
            "universities": universities,
            "buildings": buildings,
            "rooms": rooms,
            "time_slots": time_slots,
            "modules": modules,
        }
    )
