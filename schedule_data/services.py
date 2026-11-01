from __future__ import annotations

from typing import Any

from openpyxl.utils.exceptions import InvalidFileException


SHEET_HEADERS = {
    'Группы': ('Группа',),
    'Преподаватели': ('Фамилия', 'Имя', 'Отчество', 'Должность'),
    'Доступность': ('Фамилия', 'Имя', 'Отчество', 'Дни недели'),
}
WEEKDAYS = {
    'понедельник', 'вторник', 'среда', 'четверг',
    'пятница', 'суббота', 'воскресенье',
}
EXAMPLE_ROWS = {
    'groups': ('Группы', ('Группа',), ('ИУ-1',)),
    'teachers': (
        'Преподаватели',
        ('Фамилия', 'Имя', 'Отчество', 'Должность'),
        ('Иванов', 'Иван', 'Иванович', 'Доцент'),
    ),
    'availability': (
        'Доступность',
        ('Фамилия', 'Имя', 'Отчество', 'Дни недели'),
        ('Иванов', 'Иван', 'Иванович', 'Понедельник, Среда, Пятница'),
    ),
}
DATA_TYPES = {
    'groups': 'Группы',
    'teachers': 'Преподаватели',
    'availability': 'Доступность',
}
REQUIRED_FIELDS = {
    'Группы': ('Группа',),
    'Преподаватели': ('Фамилия', 'Имя', 'Должность'),
    'Доступность': ('Фамилия', 'Имя', 'Дни недели'),
}


def _value(value: Any) -> str:
    return str(value).strip() if value is not None else ''


def _read_sheet(sheet: Any, title: str) -> tuple[list[dict[str, str]], list[str]]:
    errors: list[str] = []
    rows = list(sheet.iter_rows(values_only=True))
    expected_headers = SHEET_HEADERS[title]
    if not rows:
        return [], [f'Лист «{title}» пуст.']
    headers = tuple(_value(value) for value in rows[0])
    if headers != expected_headers:
        return [], [f'Лист «{title}»: заголовки должны точно совпадать: {", ".join(expected_headers)}.']
    if len(rows) == 1:
        return [], [f'Лист «{title}»: добавьте хотя бы одну запись после заголовков.']

    result: list[dict[str, str]] = []
    for row_number, raw_row in enumerate(rows[1:], 2):
        values = tuple(_value(value) for value in raw_row)
        if not any(values):
            errors.append(f'Лист «{title}», строка {row_number}: пустые строки запрещены.')
            continue
        required_fields = REQUIRED_FIELDS[title]
        if len(values) != len(expected_headers) or any(
            not values[expected_headers.index(field)] for field in required_fields
        ):
            errors.append(f'Лист «{title}», строка {row_number}: все столбцы обязательны, лишние столбцы запрещены.')
            continue
        item = dict(zip(expected_headers, values))
        if title == 'Доступность':
            days = [day.strip().lower() for day in item['Дни недели'].split(',')]
            if any(day not in WEEKDAYS for day in days):
                errors.append(f'Лист «{title}», строка {row_number}: неизвестный день недели.')
                continue
        result.append(item)
    return result, errors


def parse_workbook(workbook: Any, data_type: str) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    empty = {'groups': [], 'teachers': [], 'availability': []}
    title = DATA_TYPES.get(data_type)
    if title is None:
        return empty, ['Неизвестный тип данных.']
    if tuple(workbook.sheetnames) != (title,):
        return empty, [f'Файл должен содержать ровно один лист «{title}» без дополнительных листов.']
    rows, errors = _read_sheet(workbook[title], title)
    return {**empty, data_type: rows}, errors


def parse_manual(rows_by_type: dict[str, list[dict[str, Any]]]) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    payload = {'groups': [], 'teachers': [], 'availability': []}
    errors: list[str] = []
    for key, rows in rows_by_type.items():
        if key not in DATA_TYPES:
            errors.append('Неизвестный тип данных.')
            continue
        if not isinstance(rows, list):
            errors.append(f'{DATA_TYPES[key]}: таблица имеет неверный формат.')
            continue
        fields = SHEET_HEADERS[DATA_TYPES[key]]
        for row_number, raw_row in enumerate(rows, 1):
            if not isinstance(raw_row, dict):
                errors.append(f'{DATA_TYPES[key]}, строка {row_number}: неверный формат строки.')
                continue
            values = tuple(
                ', '.join(raw_row.get(field))
                if key == 'availability'
                and field == 'Дни недели'
                and isinstance(raw_row.get(field), list)
                else _value(raw_row.get(field))
                for field in fields
            )
            if not any(values):
                continue
            required_fields = REQUIRED_FIELDS[DATA_TYPES[key]]
            if any(not values[fields.index(field)] for field in required_fields):
                errors.append(f'{DATA_TYPES[key]}, строка {row_number}: заполните все поля.')
                continue
            item = dict(zip(fields, values))
            if key == 'availability':
                days = [day.strip().lower() for day in item['Дни недели'].split(',')]
                if any(day not in WEEKDAYS for day in days):
                    errors.append(f'{DATA_TYPES[key]}, строка {row_number}: неизвестный день недели.')
                    continue
            payload[key].append(item)
    if not any(payload.values()) and not errors:
        errors.append('Добавьте хотя бы одну запись.')
    return payload, errors


def parse_uploaded_file(uploaded: Any, data_type: str) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    from openpyxl import load_workbook

    empty = {'groups': [], 'teachers': [], 'availability': []}
    if not uploaded or not uploaded.name.lower().endswith('.xlsx'):
        return empty, ['Загрузите файл строго в формате .xlsx.']
    try:
        workbook = load_workbook(uploaded, read_only=True, data_only=True)
    except (OSError, ValueError, InvalidFileException):
        return empty, ['Файл нельзя прочитать как корректный .xlsx.']
    return parse_workbook(workbook, data_type)
