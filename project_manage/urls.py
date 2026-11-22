from django.urls import include, path, re_path
from django.views.generic import RedirectView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from identity.urls import urlpatterns as identity_urls
from identity.views import ReactAuthPageView
from reference_data.urls import urlpatterns as reference_data_urls
from schedule_data.urls import urlpatterns as schedule_data_urls

default_urls = [
    path(
        "admin/",
        ReactAuthPageView.as_view(),
        name="users-page",
    ),
    path(
        "admin",
        ReactAuthPageView.as_view(),
        name="users-page-no-slash",
    ),
    re_path(
        r"^staff/users/?$",
        RedirectView.as_view(
            pattern_name="users-page",
            permanent=False,
        ),
        name="legacy-users-page",
    ),
]

pages_urls = [
    path(
        "auth/",
        ReactAuthPageView.as_view(),
        name="auth-page",
    ),
]

swagger_urls = [
    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

schedule_urls = [
    path(
        "api/schedules/",
        include("schedules.urls"),
    ),
]

frontend_urls = [
    re_path(
        r"^(?!(?:api|admin|static|media)(?:/|$)).*$",
        ReactAuthPageView.as_view(),
        name="frontend-page",
    ),
]

urlpatterns = (
    default_urls
    + swagger_urls
    + pages_urls
    + identity_urls
    + schedule_data_urls
    + reference_data_urls
    + schedule_urls
    + frontend_urls
)
