"""Собрать файлы импорта «Направления» и «Нагрузка» из базового расписания бакалавриата.

Часы — недельные академические часы (одна пара = 2 часа). Если дисциплина
встречается в нескольких модулях, берётся максимум по модулям: сетка модуля
повторяется каждую его неделю, а в модели импорта нет отдельного поля модуля.
Занятия без явной пометки «лекция» / «семинар» / «практ.» записываются как семинар.
Численность в исходных файлах не указана.
"""

from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import xlrd
from openpyxl import Workbook, load_workbook

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from schedule_data.services import parse_workbook  # noqa: E402

# Указать путь к исходным файлам расписания
SOURCES = [
    Path(r"c:\Users\ASUS\Downloads\Расписание занятий 1 модуль БАЗОВОЕ с изм. 08.09.25.xls"),
    Path(r"c:\Users\ASUS\Downloads\Расписание занятий 2 модуль БАЗОВОЕ с изм. 31.10.25.xlsx"),
    Path(r"c:\Users\ASUS\Downloads\Расписание занятий 3 модуль БАЗОВОЕ от 19.01.2025.xls"),
    Path(r"c:\Users\ASUS\Downloads\Расписание занятий БАЗОВОЕ 4 модуль.xls"),
]
OUTPUT_DIR = ROOT / "import_data"
PAIR_HOURS = 2

GROUP_RE = re.compile(r"^([A-ZА-ЯЁ]+)-(\d{2})-(\d+)$")
TEACHER_RE = re.compile(
    r"([А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?)\s+"
    r"([А-ЯЁ])\.(?:\s*([А-ЯЁ])\.)?"
)
ROOM_RE = re.compile(r"\(([^)]*)\)")
PAIR_RE = re.compile(r"(\d+)")
COURSE_RE = re.compile(r"(\d+)")
LECTURE_RE = re.compile(
    r"\(лекци\w*\)|\(\s*л\s*\)|(?<![а-яё])лекци|(?<![а-яё])лек\b",
    re.IGNORECASE,
)
SEMINAR_MARK_RE = re.compile(r"\(семинар\w*\)|(?<![а-яё])практ\.", re.IGNORECASE)
ROOM_PREFIX_RE = re.compile(r"^(?:\s*\([^)]*\))*\s*")
PRACT_COURSE_RE = re.compile(r"практ\.\s*курс|практ\.курс", re.IGNORECASE)
SKIP_RE = re.compile(r"отдельн\w*\s+расписан|физическ\w*\s+воспитан", re.IGNORECASE)

GROUP_HEADERS = ("Направление", "Курс", "Код группы", "Код подгруппы", "Численность")
PLAN_HEADERS = (
    "Предмет",
    "Направление",
    "Курс",
    "Вид занятия",
    "Для кого",
    "Часы",
    "Требования к аудитории",
)
LOAD_HEADERS = (
    "Предмет",
    "Код преподавателя",
    "Преподаватель",
    "Лекции, часы",
    "Семинары, часы",
    "Ограничения",
    "Направление",
    "Курс",
)


def _clean_space(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\xa0", " ")).strip()


def _read_sheets(path: Path) -> list[tuple[str, list[list[str]]]]:
    if path.suffix.lower() == ".xls":
        book = xlrd.open_workbook(str(path))
        return [
            (
                name,
                [
                    [
                        _clean_space(str(book.sheet_by_name(name).cell_value(row, col)))
                        for col in range(book.sheet_by_name(name).ncols)
                    ]
                    for row in range(book.sheet_by_name(name).nrows)
                ],
            )
            for name in book.sheet_names()
        ]
    book = load_workbook(path, data_only=True)
    return [
        (
            name,
            [
                [_clean_space("" if cell.value is None else str(cell.value)) for cell in row]
                for row in book[name].iter_rows()
            ],
        )
        for name in book.sheetnames
    ]


def _module_index(path: Path) -> int:
    match = re.search(r"(\d+)\s*модул", path.name, re.IGNORECASE)
    if not match:
        raise ValueError(f"Не удалось определить модуль: {path.name}")
    return int(match.group(1))


def _course_number(sheet_name: str) -> int | None:
    match = COURSE_RE.search(sheet_name)
    return int(match.group(1)) if match else None


def _lesson_type(raw_subject: str) -> str:
    if LECTURE_RE.search(raw_subject):
        return "Лекция"
    return "Семинар"


def _explicit_seminar(raw_subject: str) -> bool:
    return bool(SEMINAR_MARK_RE.search(raw_subject) and not PRACT_COURSE_RE.search(raw_subject))


def _subject_name(raw_subject: str) -> str:
    text = ROOM_PREFIX_RE.sub("", raw_subject)
    text = re.sub(r"^\(ДОЦ\)\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(
        r"\((?:\s*(?:лекци\w*|лек\.?|сем(?:инар\w*)?\.?|практ(?:\.?\s*зан\.?|\.)?|мкд|мдк|л|с|зан\.?)\s*)+\)",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+(?:семинар|лекция|лек|практ)\.?\s*$", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"см\.?\s+отдельн\w*\s+расписан\w*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\bс\s+\d+\s+недел\w*\b", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"^\d+\s*курс\.?\s*", "", text, flags=re.IGNORECASE)
    text = _clean_space(text).strip(" .-;")
    text = re.sub(r"\s+П$", "", text)
    text = re.sub(r"\s*\(\s*\)", "", text)
    return _clean_space(text)


def _subject_key(name: str) -> str:
    text = _clean_space(name).replace("ё", "е").replace("Ё", "Е").casefold()
    text = re.sub(r"практ\.\s*курс", "практ.курс", text)
    text = re.sub(r"(?<=\.)\s+", "", text)
    return _clean_space(text)


def _teacher_name(match: re.Match[str]) -> str:
    patronymic = f"{match.group(3)}." if match.group(3) else ""
    return _clean_space(f"{match.group(1)} {match.group(2)}.{patronymic}")


def _lesson(
    subject: str, lesson_type: str, explicit: bool, teacher: str, room: str, subgroup: str
) -> dict[str, str]:
    return {
        "subject": subject,
        "type": lesson_type,
        "explicit": explicit,
        "teacher": teacher,
        "room": room,
        "subgroup": subgroup,
        "online": "онлайн" in room.casefold(),
    }


def _parse_lessons(cell: str) -> list[dict[str, str]]:
    if not cell:
        return []
    matches = list(TEACHER_RE.finditer(cell))
    lessons: list[dict[str, str]] = []
    previous_subject = ""
    previous_type = "Семинар"
    previous_explicit = False
    for index, match in enumerate(matches):
        start = 0 if index == 0 else matches[index - 1].end()
        raw_subject = ROOM_PREFIX_RE.sub("", cell[start : match.start()])
        tail_end = matches[index + 1].start() if index + 1 < len(matches) else len(cell)
        room_match = ROOM_RE.search(cell[match.end() : tail_end])
        room = room_match.group(1) if room_match else ""
        subgroup_match = re.search(r",\s*(\d+)\s*$", room)
        subject = _subject_name(raw_subject)
        if len(subject) < 2:
            if not previous_subject:
                continue
            subject = previous_subject
            lesson_type = previous_type
            explicit = previous_explicit
        else:
            lesson_type = _lesson_type(raw_subject)
            explicit = bool(LECTURE_RE.search(raw_subject) or _explicit_seminar(raw_subject))
            previous_subject = subject
            previous_type = lesson_type
            previous_explicit = explicit
        lessons.append(
            _lesson(
                subject,
                lesson_type,
                explicit,
                _teacher_name(match),
                _clean_space(room),
                subgroup_match.group(1) if subgroup_match else "",
            )
        )
    if lessons:
        return lessons
    subject = _subject_name(cell)
    if len(subject) < 2 or SKIP_RE.search(subject):
        return []
    return [_lesson(subject, "Семинар", False, "", "", "")]


def _header_row(rows: list[list[str]]) -> int | None:
    for index, row in enumerate(rows[:8]):
        if row and row[0].casefold().startswith("дни"):
            return index
    return None


def collect() -> dict:
    groups: dict[str, dict[str, str]] = {}
    buckets: dict[tuple, dict] = {}
    # Один слот потока считается один раз на направление.
    workload: set[tuple] = set()
    titles: Counter[str] = Counter()
    explicit_types: Counter[str] = Counter()
    skipped_groups = 0
    missed_cells = 0
    missed_samples: list[str] = []
    parsed_cells = 0

    for path in SOURCES:
        module = _module_index(path)
        for sheet_name, rows in _read_sheets(path):
            course = _course_number(sheet_name)
            header = _header_row(rows)
            if course is None or header is None:
                continue
            group_columns = [
                (col, value)
                for col, value in enumerate(rows[header])
                if col >= 2 and GROUP_RE.match(value)
            ]
            if course > 4:
                skipped_groups += len(group_columns)
                continue
            for _, code in group_columns:
                groups[code] = {
                    "Направление": GROUP_RE.match(code).group(1),
                    "Курс": str(course),
                    "Код группы": code,
                    "Код подгруппы": "",
                    "Численность": "н/д",
                }
            day = ""
            for row in rows[header + 1 :]:
                if not row:
                    continue
                if SKIP_RE.search(row[0]):
                    break
                if row[0]:
                    day = row[0]
                pair_match = PAIR_RE.search(row[1]) if len(row) > 1 else None
                if not pair_match:
                    continue
                pair = pair_match.group(1)
                for col, code in group_columns:
                    if col >= len(row) or not row[col]:
                        continue
                    lessons = _parse_lessons(row[col])
                    if not lessons:
                        if not SKIP_RE.search(row[col]):
                            missed_cells += 1
                            if len(missed_samples) < 40:
                                missed_samples.append(row[col][:180])
                        continue
                    parsed_cells += 1
                    grouped: dict[tuple[str, str], list[dict[str, str]]] = defaultdict(list)
                    for lesson in lessons:
                        key = (_subject_key(lesson["subject"]), lesson["type"])
                        titles[lesson["subject"]] += 1
                        if lesson["explicit"]:
                            explicit_types[lesson["type"]] += 1
                        else:
                            explicit_types["без пометки"] += 1
                        grouped[key].append(lesson)
                        if lesson["teacher"]:
                            workload.add(
                                (
                                    module,
                                    course,
                                    day,
                                    pair,
                                    lesson["teacher"],
                                    key[0],
                                    lesson["type"],
                                    groups[code]["Направление"],
                                )
                            )
                    for (subject_key, lesson_type), items in grouped.items():
                        bucket = buckets.setdefault(
                            (module, course, code, subject_key, lesson_type),
                            {"whole": 0, "subs": Counter(), "online": 0, "total": 0},
                        )
                        subgroups = {item["subgroup"] for item in items if item["subgroup"]}
                        if any(not item["subgroup"] for item in items) or not subgroups:
                            bucket["whole"] += 1
                        else:
                            for subgroup in subgroups:
                                bucket["subs"][subgroup] += 1
                        bucket["total"] += 1
                        if all(item["online"] for item in items):
                            bucket["online"] += 1

    return {
        "groups": groups,
        "buckets": buckets,
        "workload": workload,
        "titles": titles,
        "explicit_types": explicit_types,
        "skipped_groups": skipped_groups,
        "missed_cells": missed_cells,
        "missed_samples": missed_samples,
        "parsed_cells": parsed_cells,
    }


def _display_titles(titles: Counter[str]) -> dict[str, str]:
    best: dict[str, tuple[int, str]] = {}
    for title, count in titles.items():
        key = _subject_key(title)
        current = best.get(key)
        if (
            current is None
            or count > current[0]
            or (count == current[0] and len(title) > len(current[1]))
        ):
            best[key] = (count, title)
    return {key: title for key, (_, title) in best.items()}


def build_tables(
    data: dict,
) -> tuple[list[dict[str, str]], list[dict[str, str]], list[dict[str, str]]]:
    titles = _display_titles(data["titles"])
    groups: dict[str, dict[str, str]] = data["groups"]
    by_direction: dict[tuple[str, str], list[str]] = defaultdict(list)
    for code, group in groups.items():
        by_direction[(group["Направление"], group["Курс"])].append(code)

    per_group: dict[tuple, dict] = {}
    for (module, course, code, subject_key, lesson_type), bucket in data["buckets"].items():
        pairs = bucket["whole"] + (max(bucket["subs"].values()) if bucket["subs"] else 0)
        item = per_group.setdefault(
            (str(course), code, subject_key, lesson_type),
            {"by_module": {}, "online": 0, "total": 0},
        )
        item["by_module"][module] = pairs * PAIR_HOURS
        item["online"] += bucket["online"]
        item["total"] += bucket["total"]

    clustered: dict[tuple, list[tuple[str, bool]]] = defaultdict(list)
    for (course, code, subject_key, lesson_type), item in per_group.items():
        hours = max(item["by_module"].values())
        online = item["total"] > 0 and item["online"] == item["total"]
        direction = groups[code]["Направление"]
        clustered[(direction, course, subject_key, lesson_type, hours)].append((code, online))

    study_plan: list[dict[str, str]] = []
    for (direction, course, subject_key, lesson_type, hours), entries in clustered.items():
        codes = sorted({code for code, _ in entries})
        everyone = sorted(by_direction[(direction, course)])
        study_plan.append(
            {
                "Предмет": titles[subject_key],
                "Направление": direction,
                "Курс": course,
                "Вид занятия": lesson_type,
                "Для кого": "Каждая группа" if codes == everyone else ", ".join(codes),
                "Часы": str(hours),
                "Требования к аудитории": "Онлайн" if all(flag for _, flag in entries) else "",
            }
        )
    study_plan.sort(
        key=lambda row: (
            int(row["Курс"]),
            row["Направление"],
            row["Предмет"],
            row["Вид занятия"],
            row["Для кого"],
        )
    )

    teachers = sorted({slot[4] for slot in data["workload"]})
    teacher_codes = {name: f"teacher-{index:03d}" for index, name in enumerate(teachers, 1)}
    module_hours: dict[tuple, dict[int, list[int]]] = defaultdict(
        lambda: defaultdict(lambda: [0, 0])
    )
    seen: set[tuple] = set()
    for module, course, day, pair, teacher, subject_key, lesson_type, direction in data["workload"]:
        slot = (module, course, day, pair, teacher, subject_key, lesson_type, direction)
        if slot in seen:
            continue
        seen.add(slot)
        key = (str(course), direction, subject_key, teacher)
        kind = 0 if lesson_type == "Лекция" else 1
        module_hours[key][module][kind] += PAIR_HOURS

    workload_rows: list[dict[str, str]] = []
    for (course, direction, subject_key, teacher), by_module in module_hours.items():
        lectures = max(hours[0] for hours in by_module.values())
        seminars = max(hours[1] for hours in by_module.values())
        workload_rows.append(
            {
                "Предмет": titles[subject_key],
                "Код преподавателя": teacher_codes[teacher],
                "Преподаватель": teacher,
                "Лекции, часы": str(lectures),
                "Семинары, часы": str(seminars),
                "Ограничения": "",
                "Направление": direction,
                "Курс": course,
            }
        )
    workload_rows.sort(
        key=lambda row: (
            int(row["Курс"]),
            row["Направление"],
            row["Предмет"],
            row["Преподаватель"],
        )
    )
    group_rows = sorted(
        groups.values(), key=lambda row: (int(row["Курс"]), row["Направление"], row["Код группы"])
    )
    return group_rows, study_plan, workload_rows


def _write(path: Path, sheets: list[tuple[str, tuple[str, ...], list[dict[str, str]]]]) -> None:
    book = Workbook()
    for index, (title, headers, rows) in enumerate(sheets):
        sheet = book.active if index == 0 else book.create_sheet()
        sheet.title = title
        sheet.append(list(headers))
        for row in rows:
            sheet.append([row[header] for header in headers])
    path.parent.mkdir(parents=True, exist_ok=True)
    book.save(path)


def _validate(path: Path, data_type: str) -> None:
    book = load_workbook(path, data_only=True)
    _payload, errors = parse_workbook(book, data_type)
    if errors:
        raise SystemExit(f"{path.name}: {errors[:8]}")


def main() -> None:
    data = collect()
    groups, study_plan, workload = build_tables(data)
    directions_path = OUTPUT_DIR / "Направления.xlsx"
    workload_path = OUTPUT_DIR / "Нагрузка.xlsx"
    _write(
        directions_path,
        [
            ("Группы", GROUP_HEADERS, groups),
            ("Учебный план", PLAN_HEADERS, study_plan),
        ],
    )
    _write(workload_path, [("Нагрузка", LOAD_HEADERS, workload)])
    _validate(directions_path, "directions")
    _validate(workload_path, "workload")
    lectures = sum(1 for row in study_plan if row["Вид занятия"] == "Лекция")
    print(
        f"groups={len(groups)} plan={len(study_plan)} lectures={lectures} workload={len(workload)}"
    )
    print(
        f"parsed_cells={data['parsed_cells']} missed_cells={data['missed_cells']} skipped_course5_columns={data['skipped_groups']}"
    )
    print(f"types={dict(data['explicit_types'])}")
    print("--- missed ---")
    for sample in data["missed_samples"]:
        print(sample.replace("\n", " | "))
    print(directions_path)
    print(workload_path)


if __name__ == "__main__":
    main()
