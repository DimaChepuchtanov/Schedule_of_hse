from django.db import migrations


ADD_MISSING_COLUMNS = """
ALTER TABLE "identity"."user"
    ADD COLUMN IF NOT EXISTS "display_name" varchar(250) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "identity"."user"
SET "display_name" = "login"
WHERE "display_name" = '';
"""

REMOVE_COLUMNS = """
ALTER TABLE "identity"."user"
    DROP COLUMN IF EXISTS "created_at",
    DROP COLUMN IF EXISTS "display_name";
"""


class Migration(migrations.Migration):

    dependencies = [
        ("identity", "0004_merge_0002_fix_last_login"),
    ]

    operations = [
        migrations.RunSQL(ADD_MISSING_COLUMNS, REMOVE_COLUMNS),
    ]
