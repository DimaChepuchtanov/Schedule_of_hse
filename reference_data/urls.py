from django.urls import path

from .views import reference_catalog

app_name = "reference_data"

urlpatterns = [
    path("api/reference/", reference_catalog, name="reference-catalog"),
]
