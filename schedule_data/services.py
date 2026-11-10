from __future__ import annotations

from typing import Any

from openpyxl.utils.exceptions import InvalidFileException


DATA_TYPES = {
    'directions': 'Направления',
    'workload': 'Нагрузка',
}
SHEET_HEADERS = {
    'Группы': ('Направление', 'Курс', 'Код группы', 'Код подгруппы', 'Численность'),
    'Учебный план': (
        'Предмет', 'Направление', 'Курс', 'Вид занятия',
        'Для кого', 'Часы', 'Требования к аудитории',
    ),
    'Нагрузка': (
        'Предмет', 'Код преподавателя', 'Преподаватель',
        'Лекции, часы', 'Семинары, часы', 'Ограничения',
        'Направление', 'Курс',
    ),
}
FILE_SHEETS = {
    'directions': ('Группы', 'Учебный план'),
    'workload': ('Нагрузка',),
}
REQUIRED_FIELDS = {
    'Группы': ('Направление', 'Курс', 'Код группы', 'Численность'),
    'Учебный план': ('Предмет', 'Направление', 'Курс', 'Вид занятия', 'Для кого', 'Часы'),
    'Нагрузка': (
        'Предмет', 'Код преподавателя', 'Преподаватель',
        'Лекции, часы', 'Семинары, часы', 'Направление', 'Курс',
    ),
}
EXAMPLE_ROWS = {
    'directions': {
        'Группы': ('Направление', 'Курс', 'Код группы', 'Код подгруппы', 'Численность'),
        'Учебный план': (
            'Предмет', 'Направление', 'Курс', 'Вид занятия',
            'Для кого', 'Часы', 'Требования к аудитории',
        ),
    },
    'workload': {
        'Нагрузка': (
            'Предмет', 'Код преподавателя', 'Преподаватель',
            'Лекции, часы', 'Семинары, часы', 'Ограничения',
            'Направление', 'Курс',
        ),
    },
}


def _value(value: Any) -> str:
    return str(value).strip() if value is not None else ''


def _read_sheet(sheet: Any, title: str) -> tuple[list[dict[str, str]], list[str]]:
    rows = list(sheet.iter_rows(values_only=True))
    expected = SHEET_HEADERS[title]
    if not rows:
        return [], [f'Лист «{title}» пуст.']
    if tuple(_value(value) for value in rows[0]) != expected:
        return [], [f'Лист «{title}»: заголовки должны точно совпадать: {", ".join(expected)}.']
    if len(rows) == 1:
        return [], [f'Лист «{title}»: добавьте хотя бы одну запись после заголовков.']

    result: list[dict[str, str]] = []
    errors: list[str] = []
    for row_number, raw_row in enumerate(rows[1:], 2):
        values = tuple(_value(value) for value in raw_row)
        if not any(values):
            errors.append(f'Лист «{title}», строка {row_number}: пустые строки запрещены.')
            continue
        if len(values) != len(expected) or any(not values[expected.index(field)] for field in REQUIRED_FIELDS[title]):
            errors.append(f'Лист «{title}», строка {row_number}: заполните обязательные поля.')
            continue
        item = dict(zip(expected, values))
        if not item['Курс'].isdigit() or not 1 <= int(item['Курс']) <= 4:
            errors.append(f'Лист «{title}», строка {row_number}: курс должен быть числом от 1 до 4.')
            continue
        result.append(item)
    return result, errors


def parse_workbook(workbook: Any, data_type: str) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    empty = {'groups': [], 'study_plan': [], 'workload': []}
    expected_sheets = FILE_SHEETS.get(data_type)
    if expected_sheets is None:
        return empty, ['Неизвестный тип файла.']
    if tuple(workbook.sheetnames) != expected_sheets:
        return empty, [
            f'Файл «{DATA_TYPES[data_type]}» должен содержать листы: {", ".join(expected_sheets)}.'
        ]
    payload: dict[str, list[dict[str, str]]] = {**empty}
    keys = ('groups', 'study_plan') if data_type == 'directions' else ('workload',)
    errors: list[str] = []
    for key, title in zip(keys, expected_sheets):
        payload[key], sheet_errors = _read_sheet(workbook[title], title)
        errors.extend(sheet_errors)
    return payload, errors


def parse_manual(
    rows_by_type: dict[str, list[dict[str, Any]]],
    data_type: str,
) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    payload = {'groups': [], 'study_plan': [], 'workload': []}
    errors: list[str] = []
    sheet_by_key = {'groups': 'Группы', 'study_plan': 'Учебный план', 'workload': 'Нагрузка'}
    allowed_keys = {'groups', 'study_plan'} if data_type == 'directions' else {'workload'}
    if data_type not in FILE_SHEETS:
        return payload, ['Неизвестный тип файла.']
    for key, rows in rows_by_type.items():
        if key not in allowed_keys:
            continue
        if key not in sheet_by_key:
            errors.append('Неизвестный тип данных.')
            continue
        if not isinstance(rows, list):
            errors.append(f'{sheet_by_key[key]}: таблица имеет неверный формат.')
            continue
        fields = SHEET_HEADERS[sheet_by_key[key]]
        for row_number, row in enumerate(rows, 1):
            if not isinstance(row, dict):
                errors.append(f'{sheet_by_key[key]}, строка {row_number}: неверный формат.')
                continue
            values = tuple(_value(row.get(field)) for field in fields)
            if not any(values):
                continue
            if any(not values[fields.index(field)] for field in REQUIRED_FIELDS[sheet_by_key[key]]):
                errors.append(f'{sheet_by_key[key]}, строка {row_number}: заполните обязательные поля.')
                continue
            item = dict(zip(fields, values))
            if not item['Курс'].isdigit() or not 1 <= int(item['Курс']) <= 4:
                errors.append(f'{sheet_by_key[key]}, строка {row_number}: курс должен быть числом от 1 до 4.')
                continue
            payload[key].append(item)
    if not any(payload.values()) and not errors:
        errors.append('Добавьте хотя бы одну запись.')
    return payload, errors


def parse_uploaded_file(uploaded: Any, data_type: str) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    from openpyxl import load_workbook

    empty = {'groups': [], 'study_plan': [], 'workload': []}
    if not uploaded or not uploaded.name.lower().endswith('.xlsx'):
        return empty, ['Загрузите файл строго в формате .xlsx.']
    try:
        workbook = load_workbook(uploaded, read_only=True, data_only=True)
    except (OSError, ValueError, InvalidFileException):
        return empty, ['Файл нельзя прочитать как корректный .xlsx.']
    return parse_workbook(workbook, data_type)
