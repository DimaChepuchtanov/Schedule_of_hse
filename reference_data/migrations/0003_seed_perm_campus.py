from datetime import date, time

from django.db import migrations

UNIVERSITY_NAME = "НИУ ВШЭ — Пермь"
ROOM_CAPACITY = 50
COMPUTER_ROOMS = {("Корпус 1", "202"), ("Корпус 1", "301"), ("Корпус 2", "210")}

BUILDINGS = (
    ("Корпус 1", "ул. Студенческая, 38"),
    ("Корпус 2", "бульвар Гагарина, 37"),
    ("Корпус 3", "бульвар Гагарина, 37а"),
    ("Корпус 4", "ул. Лебедева, 27"),
    ("Корпус 5", "ул. Студенческая, 23"),
)

ROOMS = {
    "Корпус 1": (
        "201",
        "202",
        "301",
        "306",
        "307",
        "315",
        "317",
        "401",
        "402",
        "403",
        "405",
        "406",
        "407",
    ),
    "Корпус 2": (
        "101",
        "115",
        "122",
        "124",
        "210",
        "211",
        "220",
        "305",
        "306",
        "307",
        "308",
        "309",
        "311",
        "312",
        "315",
        "316",
        "318",
        "320",
    ),
    "Корпус 3": (
        "102",
        "110",
        "111",
        "206",
        "305",
        "311",
        "316",
        "501",
        "503",
        "504",
        "509",
        "510",
        "511",
    ),
    "Корпус 5": ("106", "203", "302", "303"),
}

TIME_SLOTS = (
    ("1", time(8, 10), time(9, 30)),
    ("2", time(9, 40), time(11, 0)),
    ("3", time(11, 30), time(12, 50)),
    ("4", time(13, 10), time(14, 30)),
    ("5", time(15, 0), time(16, 20)),
    ("6", time(16, 40), time(18, 0)),
    ("7", time(18, 20), time(19, 40)),
    ("8", time(20, 10), time(21, 30)),
)

MODULES = (
    (1, date(2025, 9, 1), date(2025, 10, 24)),
    (2, date(2025, 11, 1), date(2025, 12, 19)),
    (3, date(2026, 1, 9), date(2026, 3, 24)),
    (4, date(2026, 4, 1), date(2026, 6, 19)),
)


def seed_perm_campus(apps, schema_editor):
    university_model = apps.get_model("reference_data", "University")
    building_model = apps.get_model("reference_data", "Building")
    room_model = apps.get_model("reference_data", "Room")
    slot_model = apps.get_model("reference_data", "TimeSlot")
    module_model = apps.get_model("reference_data", "AcademicModule")

    university, _created = university_model.objects.get_or_create(
        name=UNIVERSITY_NAME,
        defaults={
            "timezone": "Asia/Yekaterinburg",
            "pair_minutes": 80,
            "academic_hour_minutes": 40,
            "transfer_minutes": 20,
        },
    )
    buildings = {}
    for name, address in BUILDINGS:
        building, _created = building_model.objects.get_or_create(
            university=university,
            name=name,
            defaults={"build": address},
        )
        buildings[name] = building

    for building_name, numbers in ROOMS.items():
        building = buildings[building_name]
        for number in numbers:
            room_type = "computer" if (building_name, number) in COMPUTER_ROOMS else "other"
            room_model.objects.get_or_create(
                building=building,
                number=number,
                defaults={
                    "capacity": ROOM_CAPACITY,
                    "room_type": room_type,
                    "is_active": True,
                },
            )

    for number, starts_at, ends_at in TIME_SLOTS:
        slot_model.objects.get_or_create(
            university=university,
            number=number,
            defaults={"starts_at": starts_at, "ends_at": ends_at},
        )

    for number, starts_on, ends_on in MODULES:
        module_model.objects.get_or_create(
            university=university,
            academic_year=2025,
            number=number,
            defaults={"starts_on": starts_on, "ends_on": ends_on},
        )


def remove_perm_campus(apps, schema_editor):
    university_model = apps.get_model("reference_data", "University")
    building_model = apps.get_model("reference_data", "Building")
    room_model = apps.get_model("reference_data", "Room")
    slot_model = apps.get_model("reference_data", "TimeSlot")
    module_model = apps.get_model("reference_data", "AcademicModule")

    university = university_model.objects.filter(name=UNIVERSITY_NAME).first()
    if university is None:
        return
    room_model.objects.filter(building__university=university).delete()
    building_model.objects.filter(university=university).delete()
    slot_model.objects.filter(university=university).delete()
    module_model.objects.filter(university=university).delete()
    university.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("reference_data", "0002_academicmodule"),
    ]

    operations = [
        migrations.RunPython(seed_perm_campus, remove_perm_campus),
    ]
