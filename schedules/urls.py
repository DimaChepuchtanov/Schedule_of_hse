from django.urls import path

from .views import published_schedule, published_versions

app_name = "schedules"

urlpatterns = [
    path(
        "",
        published_versions,
        name="published-versions",
    ),
    path(
        "published/",
        published_schedule,
        name="published-schedule",
    ),
]
