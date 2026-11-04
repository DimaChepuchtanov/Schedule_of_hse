from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("identity", "0002_fix_last_login"),
        ("identity", "0003_usermodel_is_active_usermodel_is_staff_and_more"),
    ]

    operations = []
