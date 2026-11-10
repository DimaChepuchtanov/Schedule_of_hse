CREATE SCHEMA IF NOT EXISTS identity;


BEGIN;

WITH seed (login, display_name, password_hash, is_superuser, is_staff) AS (
    VALUES
        ('admin1@example.com', 'Администратор 1', 'pbkdf2_sha256$1500000$7qouAaeb0hPKj5QNrrsjmC$8c6y87CJpxW1MrRflgsdOOaLXZxi/GCl55/JHhNyER0=', TRUE, TRUE),
        ('admin2@example.com', 'Администратор 2', 'pbkdf2_sha256$1500000$MOfrFGh5me0pkZP9YWSh7Z$r1KZqPzE0mepYX+zvQE51nxF90eSJ2osTO5jPfOnL7c=', TRUE, TRUE),
        ('admin3@example.com', 'Администратор 3', 'pbkdf2_sha256$1500000$EvOzpnairrvLELSaSvKeKR$QWnZ6NM5B3sl5h8QuALd7SevboenymItKCevAuXy4qc=', TRUE, TRUE),
        ('user1@example.com', 'Пользователь 1', 'pbkdf2_sha256$1500000$kvPkovDqTkOrEMrEUdor1d$iAsd06WE4BAm0MENLktKhLAQaKF9YeAVxf2dCQDauVk=', FALSE, FALSE),
        ('user2@example.com', 'Пользователь 2', 'pbkdf2_sha256$1500000$DpeKfxUfEZKktfRNaoJh2D$BB+MDG60xSK9fPs+baQxYXWh/IcibvW3+zwb7PePSE8=', FALSE, FALSE),
        ('user3@example.com', 'Пользователь 3', 'pbkdf2_sha256$1500000$FhtiB9sZZ2owD9O1jGzOG0$AOyeJEwFjPb2GGEm5x3nVyzdmmofcr+bm0hTzKaItGc=', FALSE, FALSE)
)
INSERT INTO "identity"."user" (
    "uuid", "login", "display_name", "password",
    "is_superuser", "is_staff", "is_active", "created_at", "last_login"
)
SELECT
    gen_random_uuid(), login, display_name, password_hash,
    is_superuser, is_staff, TRUE, CURRENT_TIMESTAMP, NULL
FROM seed
ON CONFLICT ("login") DO NOTHING
RETURNING "login", "display_name", "is_superuser", "is_staff", "is_active";

COMMIT;