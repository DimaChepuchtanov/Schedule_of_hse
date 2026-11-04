from django.urls import path

from . import views

app_name = "user_management"

urlpatterns = [
    path("context/", views.context, name="context"),
    path("", views.collection, name="collection"),
    path("<uuid:user_id>/", views.detail, name="detail"),
    path("<uuid:user_id>/password/", views.password, name="password"),
]
