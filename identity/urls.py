from django.urls import path

from .views import AuthViewSet, CurrentUserView, LogoutView, csrf_token

app_name = "accounts_api"

urlpatterns = [
    path("api/csrf/", csrf_token, name="csrf"),
    path("api/me/", CurrentUserView.as_view(), name="me"),
    path("api/reg/", AuthViewSet.as_view({"post": "reg"}), name="register"),
    path("api/auth/", AuthViewSet.as_view({"post": "auth"}), name="login"),
    path("api/logout/", LogoutView.as_view(), name="logout"),
]
