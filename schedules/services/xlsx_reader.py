import re
from datetime import date, datetime, timedelta
from functools import partial
from pathlib import Path
from zipfile import BadZipFile

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter
from openpyxl.utils.exceptions import InvalidFileException

DATE_RE = re.compile(r"(?<!\d)(\d{2}\.\d{2}\.\d{4})(?!\d)")
PERIOD_RE = re.compile(r"\s*(\d+)\s+(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\s*")
WEEK_RE = re.compile(r"на\s+(\d+)\s+недел", re.IGNORECASE)
INTERVAL_RE = re.compile(
    r"[сc]\s*(\d{2}\.\d{2}\.\d{4})\s+по\s+(\d{2}\.\d{2}\.\d{4})",
    re.IGNORECASE,
)
REVISION_RE = re.compile(r"(?:изм\.?|ред\.?)\s*(\d{2}\.\d{2}\.(?:\d{4}|\d{2}))(?!\d)", re.I)
DAY_NAMES = (
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
    "Воскресенье",
)


class ScheduleFormatError(ValueError):
    """The file cannot be represented as one weekly timetable."""


def _text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.strftime("%d.%m.%Y")
    return str(value).replace("\r\n", "\n").replace("\xa0", " ").strip()


def _date(value: str, location: str) -> date:
    try:
        return datetime.strptime(value, "%d.%m.%Y").date()
    except ValueError as error:
        raise ScheduleFormatError(f"{location}: некорректная дата «{value}».") from error


def _anchors(sheet) -> dict[tuple[int, int], tuple[int, int]]:
    anchors = {}
    for merged in sheet.merged_cells.ranges:
        anchor = (merged.min_row, merged.min_col)
        for row in range(merged.min_row, merged.max_row + 1):
            for column in range(merged.min_col, merged.max_col + 1):
                anchors[row, column] = anchor
    return anchors


def _cell_text(sheet, anchors, row, column) -> str:
    top, left = anchors.get((row, column), (row, column))
    return _text(sheet.cell(top, left).value)


def _period(match: re.Match, location: str) -> dict:
    number = int(match[1])
    try:
        start = datetime.strptime(match[2], "%H:%M")
        end = datetime.strptime(match[3], "%H:%M")
    except ValueError as error:
        raise ScheduleFormatError(f"{location}: некорректное время пары.") from error
    if number < 1 or end <= start:
        raise ScheduleFormatError(f"{location}: проверьте номер и время пары.")
    return {
        "period": number,
        "start": f"{start.hour}:{start.minute:02d}",
        "end": f"{end.hour}:{end.minute:02d}",
    }


def _revision(filename: str) -> str:
    match = REVISION_RE.search(filename)
    if not match:
        return ""
    pattern = "%d.%m.%Y" if len(match[1]) == 10 else "%d.%m.%y"
    try:
        return datetime.strptime(match[1], pattern).strftime("%d.%m.%Y")
    except ValueError:
        return ""


def parse_excel(source, *, filename: str) -> dict:
    """Разобрать открытый XLSX старого вузовского шаблона."""

    if Path(filename).suffix.lower() != ".xlsx":
        raise ScheduleFormatError("Расписание должно быть в формате .xlsx.")

    try:
        workbook = load_workbook(
            source,
            read_only=False,
            data_only=True,
            keep_links=False,
        )
    except (
        BadZipFile,
        InvalidFileException,
        KeyError,
        SyntaxError,
        EOFError,
    ) as error:
        raise ScheduleFormatError("Не удалось открыть книгу XLSX.") from error

    courses, entries, notes = [], [], []
    times, days = {}, {}
    week_numbers, intervals = set(), set()
    try:
        for sheet in workbook.worksheets:
            if sheet.sheet_state != "visible":
                continue
            if sheet.max_row == sheet.max_column == 1 and sheet.cell(1, 1).value is None:
                continue
            anchors = _anchors(sheet)

            value = partial(_cell_text, sheet, anchors)

            day_header = re.sub(r"\s+", "", value(3, 1)).casefold()
            if day_header not in {"дни", "день", "деньнедели", "днинедели"} or not value(
                3, 2
            ).casefold().startswith(("пар", "врем")):
                raise ScheduleFormatError(
                    f"Лист «{sheet.title}»: ожидаются заголовки «дни», «пары» в A3 и B3."
                )
            # A group header may span spare columns: count its anchor once.
            groups = {
                column: _text(sheet.cell(3, column).value)
                for column in range(3, sheet.max_column + 1)
                if _text(sheet.cell(3, column).value)
            }
            if not groups or len(groups) != len(set(groups.values())):
                raise ScheduleFormatError(f"Лист «{sheet.title}»: нет групп или есть дубликаты.")
            courses.append({"name": sheet.title, "groups": list(groups.values())})
            header = " ".join(
                value(row, column) for row in (1, 2) for column in range(1, sheet.max_column + 1)
            )
            if number := WEEK_RE.search(header):
                week_numbers.add(int(number[1]))
            if interval := INTERVAL_RE.search(header):
                intervals.add((_date(interval[1], sheet.title), _date(interval[2], sheet.title)))

            current_date = None
            for row in range(4, sheet.max_row + 1):
                match = PERIOD_RE.fullmatch(value(row, 2))
                if not match:
                    for column in range(1, sheet.max_column + 1):
                        note = value(row, column)
                        if "по отдельному расписанию" in " ".join(note.casefold().split()):
                            if note not in notes:
                                notes.append(note)
                    continue
                location = f"Лист «{sheet.title}», строка {row}"
                if day_match := DATE_RE.search(value(row, 1)):
                    current_date = _date(day_match[1], location)
                if current_date is None:
                    raise ScheduleFormatError(f"{location}: для пары не найдена дата в столбце A.")
                slot = _period(match, location)
                number = slot["period"]
                if number in times and times[number] != slot:
                    raise ScheduleFormatError(
                        f"{location}: у пары № {number} разное время в книге."
                    )
                times[number] = slot
                day = current_date.isoformat()
                days[day] = {"date": day, "name": DAY_NAMES[current_date.weekday()]}

                # One merged lesson spanning group columns is one entry.
                row_entries = {}
                for column, group in groups.items():
                    raw = value(row, column)
                    if not raw:
                        continue
                    anchor = anchors.get((row, column), (row, column))
                    if anchor not in row_entries:
                        row_entries[anchor] = {
                            "id": f"{sheet.title}:{row}:{anchor[1]}",
                            "course": sheet.title,
                            "date": day,
                            "period": number,
                            "raw": raw,
                            "groups": [],
                            "source_cell": f"{get_column_letter(anchor[1])}{anchor[0]}",
                        }
                    row_entries[anchor]["groups"].append(group)
                entries.extend(row_entries.values())
    finally:
        workbook.close()

    if not courses or not days or not entries:
        raise ScheduleFormatError("В книге не найдены курсы, даты или занятия.")
    if len(week_numbers) > 1 or len(intervals) > 1:
        raise ScheduleFormatError("На листах указаны разные учебные недели.")
    first_day = date.fromisoformat(min(days))
    start = first_day - timedelta(days=first_day.weekday())
    end = start + timedelta(days=6)
    if intervals:
        start, end = next(iter(intervals))
    if (
        end < start
        or (end - start).days > 6
        or not all(start.isoformat() <= day <= end.isoformat() for day in days)
    ):
        raise ScheduleFormatError("Даты занятий должны относиться к одной учебной неделе.")
    return {
        "week": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "number": next(iter(week_numbers), None),
            "revision": _revision(filename),
        },
        "courses": courses,
        "days": [days[day] for day in sorted(days)],
        "times": [times[number] for number in sorted(times)],
        "entries": entries,
        "note": "\n".join(notes),
        "source": filename,
    }


def read_schedule_xlsx(xlsx_file) -> dict:
    if not xlsx_file:
        raise ScheduleFormatError("У версии расписания не указан XLSX-файл.")

    with xlsx_file.open("rb") as source:
        return parse_excel(
            source,
            filename=Path(xlsx_file.name).name,
        )
