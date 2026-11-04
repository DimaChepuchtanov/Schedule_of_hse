from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("identity", "0001_initial")]

    operations = [
        migrations.AlterField(
            model_name="usermodel",
            name="last_login",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="Дата последнего входа пользователя",
            ),
        ),
    ]
