from __future__ import annotations

from typing import Any

from openpyxl.utils.exceptions import InvalidFileException

DATA_TYPES = {
    "directions": "Направления",
    "workload": "Нагрузка",
}
SHEET_HEADERS = {
    "Группы": ("Направление", "Курс", "Код группы", "Код подгруппы", "Численность"),
    "Учебный план": (
        "Предмет",
        "Направление",
        "Курс",
        "Вид занятия",
        "Для кого",
        "Часы",
        "Требования к аудитории",
    ),
    "Нагрузка": (
        "Предмет",
        "Код преподавателя",
        "Преподаватель",
        "Лекции, часы",
        "Семинары, часы",
        "Ограничения",
        "Направление",
        "Курс",
    ),
}
FILE_SHEETS = {
    "directions": ("Группы", "Учебный план"),
    "workload": ("Нагрузка",),
}
REQUIRED_FIELDS = {
    "Группы": ("Направление", "Курс", "Код группы", "Численность"),
    "Учебный план": ("Предмет", "Направление", "Курс", "Вид занятия", "Для кого", "Часы"),
    "Нагрузка": (
        "Предмет",
        "Код преподавателя",
        "Преподаватель",
        "Лекции, часы",
        "Семинары, часы",
        "Направление",
        "Курс",
    ),
}
COURSE_MIN = 1
COURSE_MAX = 5
# Нижняя граница целого числа. Ноль допустим там, где часов этого вида может не быть.
NUMERIC_MINIMUM = {
    "Численность": 1,
    "Часы": 0,
    "Лекции, часы": 0,
    "Семинары, часы": 0,
}
HEADER_HINTS = {
    "Направление": "Код направления, например МБИ.",
    "Курс": "Целое число от 1 до 5.",
    "Код группы": "Код учебной группы, например МБИ-01.",
    "Код подгруппы": "Код подгруппы, если занятие идёт по подгруппам.",
    "Численность": "Целое число больше нуля, без букв.",
    "Предмет": "Название дисциплины.",
    "Вид занятия": "Например: Лекция или Семинар.",
    "Для кого": "Кто посещает занятие: «Каждая группа» или коды групп.",
    "Часы": "Целое число академических часов, без букв. Ноль допустим.",
    "Требования к аудитории": "Например: Компьютерный класс или Онлайн.",
    "Код преподавателя": "Устойчивый код преподавателя, например teacher-001.",
    "Преподаватель": "Фамилия, имя и отчество, без цифр.",
    "Лекции, часы": "Целое число часов лекций, без букв. Ноль допустим.",
    "Семинары, часы": "Целое число часов семинаров, без букв. Ноль допустим.",
    "Ограничения": "Ограничение преподавателя, например день недели.",
}
EXAMPLE_VALUES = {
    "Направление": "МБИ",
    "Курс": "1",
    "Код группы": "МБИ-01",
    "Код подгруппы": "",
    "Численность": "1",
    "Предмет": "Программирование",
    "Вид занятия": "Лекция",
    "Для кого": "Каждая группа",
    "Часы": "2",
    "Требования к аудитории": "Компьютерный класс",
    "Код преподавателя": "teacher-001",
    "Преподаватель": "Иванов Иван Иванович",
    "Лекции, часы": "2",
    "Семинары, часы": "2",
    "Ограничения": "Понедельник",
}
EXAMPLE_ROWS = {
    "directions": {
        "Группы": ("Направление", "Курс", "Код группы", "Код подгруппы", "Численность"),
        "Учебный план": (
            "Предмет",
            "Направление",
            "Курс",
            "Вид занятия",
            "Для кого",
            "Часы",
            "Требования к аудитории",
        ),
    },
    "workload": {
        "Нагрузка": (
            "Предмет",
            "Код преподавателя",
            "Преподаватель",
            "Лекции, часы",
            "Семинары, часы",
            "Ограничения",
            "Направление",
            "Курс",
        ),
    },
}


def _value(value: Any) -> str:
    if isinstance(value, bool) or value is None:
        return "" if value is None else str(value).strip()
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).replace("\xa0", " ").strip()
    if text.endswith(".0") and text[:-2].isdigit():
        return text[:-2]
    return text


def _columns(names: tuple[str, ...] | list[str]) -> str:
    return "; ".join(f"«{name}»" for name in names)


def _align_row(raw_row: tuple[Any, ...], width: int) -> tuple[str, ...] | None:
    values = tuple(_value(value) for value in raw_row)
    if len(values) < width:
        values += ("",) * (width - len(values))
    if any(values[width:]):
        return None
    return values[:width]


def _row_errors(item: dict[str, str], title: str, where: str) -> list[str]:
    errors: list[str] = []
    missing = [field for field in REQUIRED_FIELDS[title] if field in item and not item[field]]
    if missing:
        errors.append(f"{where}: заполните обязательные поля: {_columns(missing)}.")
        return errors
    if "Курс" in item:
        course = item["Курс"]
        if not course.isdigit() or not COURSE_MIN <= int(course) <= COURSE_MAX:
            errors.append(
                f"{where}: курс должен быть целым числом от {COURSE_MIN} до {COURSE_MAX}."
            )
    for field, minimum in NUMERIC_MINIMUM.items():
        if field not in item or not item[field]:
            continue
        value = item[field]
        if value.isdigit() and int(value) >= minimum:
            continue
        bound = "больше нуля" if minimum else "от 0"
        errors.append(f"{where}: «{field}» должно быть целым числом {bound}, без букв.")
    teacher = item.get("Преподаватель", "")
    if teacher and any(character.isdigit() for character in teacher):
        errors.append(f"{where}: значение поля «Преподаватель» не должно содержать цифры.")
    return errors


def _read_sheet(sheet: Any, title: str) -> tuple[list[dict[str, str]], list[str]]:
    rows = list(sheet.iter_rows(values_only=True))
    expected = SHEET_HEADERS[title]
    if not rows:
        return [], [f"Лист «{title}» пуст."]

    actual = tuple(_value(value) for value in rows[0])
    headers_match = actual == expected
    header_error = f"Лист «{title}»: заголовки должны точно совпадать: {_columns(expected)}."
    if not headers_match and len(rows) == 1:
        return [], [header_error]
    if len(rows) == 1:
        return [], [f"Лист «{title}»: добавьте хотя бы одну запись после заголовков."]

    index_by_name: dict[str, int] = {}
    for index, name in enumerate(actual):
        index_by_name.setdefault(name, index)

    result: list[dict[str, str]] = []
    errors: list[str] = []
    for row_number, raw_row in enumerate(rows[1:], 2):
        where = f"Лист «{title}», строка {row_number}"
        if headers_match:
            values = _align_row(raw_row, len(expected))
            if values is None:
                errors.append(f"{where}: в строке больше столбцов, чем в заголовке.")
                continue
            if not any(values):
                errors.append(f"{where}: пустые строки запрещены.")
                continue
            item = dict(zip(expected, values, strict=True))
        else:
            raw_values = tuple(_value(value) for value in raw_row)
            if not any(raw_values):
                errors.append(f"{where}: пустые строки запрещены.")
                continue
            item = {}
            for field in expected:
                index = index_by_name.get(field)
                if index is None:
                    continue
                item[field] = raw_values[index] if index < len(raw_values) else ""
        row_errors = _row_errors(item, title, where)
        if row_errors:
            errors.extend(row_errors)
            continue
        if headers_match:
            result.append(item)
    if not headers_match:
        errors.append(header_error)
        return [], errors
    return result, errors


def parse_workbook(
    workbook: Any, data_type: str
) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    empty = {"groups": [], "study_plan": [], "workload": []}
    expected_sheets = FILE_SHEETS.get(data_type)
    if expected_sheets is None:
        return empty, ["Неизвестный тип файла."]
    if tuple(workbook.sheetnames) != expected_sheets:
        return empty, [
            f"Файл «{DATA_TYPES[data_type]}» должен содержать листы: {_columns(expected_sheets)}."
        ]
    payload: dict[str, list[dict[str, str]]] = {**empty}
    keys = ("groups", "study_plan") if data_type == "directions" else ("workload",)
    errors: list[str] = []
    for key, title in zip(keys, expected_sheets, strict=True):
        payload[key], sheet_errors = _read_sheet(workbook[title], title)
        errors.extend(sheet_errors)
    return payload, errors


def parse_manual(
    rows_by_type: dict[str, list[dict[str, Any]]],
    data_type: str,
) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    payload = {"groups": [], "study_plan": [], "workload": []}
    errors: list[str] = []
    sheet_by_key = {"groups": "Группы", "study_plan": "Учебный план", "workload": "Нагрузка"}
    allowed_keys = {"groups", "study_plan"} if data_type == "directions" else {"workload"}
    if data_type not in FILE_SHEETS:
        return payload, ["Неизвестный тип файла."]
    for key, rows in rows_by_type.items():
        if key not in allowed_keys:
            continue
        if key not in sheet_by_key:
            errors.append("Неизвестный тип данных.")
            continue
        title = sheet_by_key[key]
        if not isinstance(rows, list):
            errors.append(f"Лист «{title}»: таблица имеет неверный формат.")
            continue
        fields = SHEET_HEADERS[title]
        for row_number, row in enumerate(rows, 1):
            if not isinstance(row, dict):
                errors.append(f"Лист «{title}», строка {row_number}: неверный формат.")
                continue
            values = tuple(_value(row.get(field)) for field in fields)
            if not any(values):
                continue
            item = dict(zip(fields, values, strict=True))
            row_errors = _row_errors(item, title, f"Лист «{title}», строка {row_number}")
            if row_errors:
                errors.extend(row_errors)
                continue
            payload[key].append(item)
    if not any(payload.values()) and not errors:
        errors.append("Добавьте хотя бы одну запись.")
    return payload, errors


def parse_uploaded_file(
    uploaded: Any, data_type: str
) -> tuple[dict[str, list[dict[str, str]]], list[str]]:
    from openpyxl import load_workbook

    empty = {"groups": [], "study_plan": [], "workload": []}
    if not uploaded or not uploaded.name.lower().endswith(".xlsx"):
        return empty, ["Загрузите файл строго в формате .xlsx."]
    try:
        workbook = load_workbook(uploaded, read_only=True, data_only=True)
    except (OSError, ValueError, InvalidFileException):
        return empty, ["Файл нельзя прочитать как корректный .xlsx."]
    return parse_workbook(workbook, data_type)


def build_example_workbook(example_type: str) -> Any | None:
    from openpyxl import Workbook
    from openpyxl.comments import Comment
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    sheets = EXAMPLE_ROWS.get(example_type)
    if sheets is None:
        return None
    required_fill = PatternFill("solid", fgColor="D9EAD3")
    optional_fill = PatternFill("solid", fgColor="FFF2CC")
    header_alignment = Alignment(wrap_text=True, vertical="center")
    workbook = Workbook()
    for index, (title, headers) in enumerate(sheets.items()):
        sheet = workbook.active if index == 0 else workbook.create_sheet()
        sheet.title = title
        required = set(REQUIRED_FIELDS[title])
        for column, header in enumerate(headers, 1):
            cell = sheet.cell(1, column, header)
            is_required = header in required
            cell.fill = required_fill if is_required else optional_fill
            cell.font = Font(bold=is_required)
            cell.alignment = header_alignment
            status = "Обязательное поле." if is_required else "Необязательное поле."
            comment = Comment(f"{status} {HEADER_HINTS[header]}", "Импорт")
            comment.width = 280
            comment.height = 70
            cell.comment = comment
            sheet.column_dimensions[get_column_letter(column)].width = max(len(header) + 4, 18)
        sheet.append(tuple(EXAMPLE_VALUES[header] for header in headers))
        sheet.row_dimensions[1].height = 30
        sheet.auto_filter.ref = sheet.dimensions
        sheet.freeze_panes = "A2"
    return workbook
