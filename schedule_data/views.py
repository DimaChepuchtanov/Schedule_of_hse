import json
from urllib.parse import quote

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from .services import DATA_TYPES, build_example_workbook, parse_manual, parse_uploaded_file


@require_POST
@csrf_protect
def data_import(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse(
            {"errors": ["Для импорта данных необходимо авторизоваться."]},
            status=401,
        )
    source = request.POST.get("source")
    if source == "xlsx":
        payload, errors = parse_uploaded_file(
            request.FILES.get("file"),
            request.POST.get("data_type", ""),
        )
    elif source == "manual":
        try:
            rows_by_type = json.loads(request.POST.get("rows", "{}"))
        except json.JSONDecodeError:
            return JsonResponse(
                {"errors": ["Таблица ручного ввода имеет неверный формат."]}, status=400
            )
        payload, errors = parse_manual(rows_by_type, request.POST.get("data_type", ""))
    else:
        return JsonResponse({"errors": ["Неизвестный источник данных."]}, status=400)

    return JsonResponse(
        {
            "valid": not errors,
            "errors": errors,
            "payload": payload,
            "message": "Данные успешно проверены."
            if not errors
            else "Исправьте ошибки и повторите проверку.",
        },
        status=200 if not errors else 400,
    )


def example_file(request: HttpRequest, example_type: str) -> HttpResponse:
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": "Для скачивания примера необходимо авторизоваться."},
            status=401,
        )
    workbook = build_example_workbook(example_type)
    if workbook is None:
        return JsonResponse({"error": "Пример не найден."}, status=404)

    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    filename = f"{DATA_TYPES[example_type]}.xlsx"
    fallback = {"directions": "napravleniya.xlsx", "workload": "nagruzka.xlsx"}[example_type]
    response["Content-Disposition"] = (
        f"attachment; filename=\"{fallback}\"; filename*=UTF-8''{quote(filename)}"
    )
    workbook.save(response)
    return response
