from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST
import json

from .services import EXAMPLE_ROWS, parse_manual, parse_uploaded_file


@require_POST
@csrf_protect
def data_import(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return JsonResponse(
            {'errors': ['Для импорта данных необходимо авторизоваться.']},
            status=401,
        )
    source = request.POST.get('source')
    if source == 'xlsx':
        payload, errors = parse_uploaded_file(
            request.FILES.get('file'), request.POST.get('data_type', ''),
        )
    elif source == 'manual':
        try:
            rows_by_type = json.loads(request.POST.get('rows', '{}'))
        except json.JSONDecodeError:
            return JsonResponse({'errors': ['Таблица ручного ввода имеет неверный формат.']}, status=400)
        payload, errors = parse_manual(rows_by_type, request.POST.get('data_type', ''))
    else:
        return JsonResponse({'errors': ['Неизвестный источник данных.']}, status=400)

    return JsonResponse({
        'valid': not errors,
        'errors': errors,
        'payload': payload,
        'message': 'Данные успешно проверены.' if not errors
        else 'Исправьте ошибки и повторите проверку.',
    }, status=200 if not errors else 400)


def example_file(request: HttpRequest, example_type: str) -> HttpResponse:
    if not request.user.is_authenticated:
        return JsonResponse(
            {'error': 'Для скачивания примера необходимо авторизоваться.'},
            status=401,
        )
    from openpyxl import Workbook

    if example_type not in EXAMPLE_ROWS:
        return JsonResponse({'error': 'Пример не найден.'}, status=404)

    workbook = Workbook()
    examples = EXAMPLE_ROWS[example_type]
    for index, (title, headers) in enumerate(examples.items()):
        sheet = workbook.active if index == 0 else workbook.create_sheet()
        sheet.title = title
        sheet.append(headers)
        sheet.append(tuple(
            ('МБИ' if header == 'Направление' else
             '1' if header == 'Курс' else
             'МБИ-01' if header == 'Код группы' else
             '1' if header == 'Численность' else
             'Программирование' if header == 'Предмет' else
             'Лекция' if header == 'Вид занятия' else
             'Каждая группа' if header == 'Для кого' else
             '2' if header in {'Часы', 'Лекции, часы', 'Семинары, часы'} else
             'teacher-001' if header == 'Код преподавателя' else
             'Иванов Иван Иванович' if header == 'Преподаватель' else
             'Понедельник' if header == 'Ограничения' else
             'Компьютерный класс' if header == 'Требования к аудитории' else '')
            for header in headers
        ))

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{example_type}.xlsx"'
    workbook.save(response)
    return response
