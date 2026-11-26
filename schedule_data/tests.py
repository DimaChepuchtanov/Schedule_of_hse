from django.test import SimpleTestCase
from openpyxl import Workbook

from schedule_data.services import build_example_workbook, parse_manual, parse_workbook


def _directions_book(group_row, plan_row):
    book = Workbook()
    groups = book.active
    groups.title = "Группы"
    groups.append(("Направление", "Курс", "Код группы", "Код подгруппы", "Численность"))
    groups.append(group_row)
    plan = book.create_sheet("Учебный план")
    plan.append(
        (
            "Предмет",
            "Направление",
            "Курс",
            "Вид занятия",
            "Для кого",
            "Часы",
            "Требования к аудитории",
        )
    )
    plan.append(plan_row)
    return book


class ImportValidationTests(SimpleTestCase):
    def test_example_files_pass_validation(self):
        for data_type, key in (("directions", "groups"), ("workload", "workload")):
            book = build_example_workbook(data_type)
            payload, errors = parse_workbook(book, data_type)
            self.assertEqual(errors, [])
            self.assertTrue(payload[key])

    def test_course_five_is_accepted_and_six_is_rejected(self):
        accepted, errors = parse_workbook(
            _directions_book(
                ("МБИ", 5, "МБИ-01", None, 20),
                ("Программирование", "МБИ", 5, "Лекция", "Каждая группа", 2, None),
            ),
            "directions",
        )
        self.assertEqual(errors, [])
        self.assertEqual(accepted["groups"][0]["Курс"], "5")
        self.assertEqual(accepted["groups"][0]["Численность"], "20")

        _payload, rejected = parse_workbook(
            _directions_book(
                ("МБИ", 6, "МБИ-01", None, 20),
                ("Программирование", "МБИ", 1, "Лекция", "Каждая группа", 2, None),
            ),
            "directions",
        )
        self.assertIn("от 1 до 5", rejected[0])

    def test_letters_in_numbers_name_the_column(self):
        _payload, errors = parse_manual(
            {
                "groups": [
                    {
                        "Направление": "МБИ",
                        "Курс": "1",
                        "Код группы": "МБИ-01",
                        "Код подгруппы": "",
                        "Численность": "н/д",
                    }
                ],
                "study_plan": [
                    {
                        "Предмет": "Программирование",
                        "Направление": "МБИ",
                        "Курс": "1",
                        "Вид занятия": "Лекция",
                        "Для кого": "Каждая группа",
                        "Часы": "два",
                        "Требования к аудитории": "",
                    }
                ],
            },
            "directions",
        )
        self.assertTrue(any("«Численность»" in error for error in errors))
        self.assertTrue(any("«Часы»" in error for error in errors))

    def test_missing_required_field_is_named(self):
        _payload, errors = parse_manual(
            {
                "workload": [
                    {
                        "Предмет": "Программирование",
                        "Код преподавателя": "",
                        "Преподаватель": "Иванов Иван Иванович",
                        "Лекции, часы": "2",
                        "Семинары, часы": "0",
                        "Ограничения": "",
                        "Направление": "МБИ",
                        "Курс": "1",
                    }
                ],
            },
            "workload",
        )
        self.assertEqual(len(errors), 1)
        self.assertIn("Код преподавателя", errors[0])
        self.assertNotIn("Ограничения", errors[0].split(":", maxsplit=1)[-1])

    def test_teacher_name_must_not_contain_digits(self):
        book = Workbook()
        sheet = book.active
        sheet.title = "Нагрузка"
        sheet.append(
            (
                "Предмет",
                "Код преподавателя",
                "Преподаватель",
                "Лекции, часы",
                "Семинары, часы",
                "Ограничения",
                "Направление",
                "Курс",
            )
        )
        sheet.append(("Программирование", "teacher-001", "015", 2, 2, "", "МБИ", 1))

        _payload, errors = parse_workbook(book, "workload")

        self.assertEqual(
            errors,
            [
                "Лист «Нагрузка», строка 2: "
                "значение поля «Преподаватель» не должно содержать цифры."
            ],
        )

    def test_header_error_separates_columns_with_semicolon(self):
        book = Workbook()
        sheet = book.active
        sheet.title = "Нагрузка"
        sheet.append(("Предмет",))
        _payload, errors = parse_workbook(book, "workload")
        self.assertIn("Лекции, часы; Семинары, часы", errors[0])
