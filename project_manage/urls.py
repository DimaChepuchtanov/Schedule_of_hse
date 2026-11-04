"""
URL configuration for schedule_hse project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path

from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from identity.urls import urlpatterns as identity_urls
from identity.views import ReactAuthPageView
from schedule_data.urls import urlpatterns as schedule_data_urls


default_urls = [
    path("admin/", ReactAuthPageView.as_view(), name="users-page"),
    path("admin", ReactAuthPageView.as_view(), name="users-page-no-slash"),
    re_path(
        r"^staff/users/?$",
            RedirectView.as_view(pattern_name="users-page", permanent=False),
            name="legacy-users-page",
        ),
]


pages_urls = [
    path("auth/", ReactAuthPageView.as_view(), name="auth-page"),
]

swagger_urls = [
    # Swagger UI endpoints
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# React selects pages by URL. Keep backend prefixes outside the SPA fallback.
frontend_urls = [
    re_path(
        r"^(?!(?:api|admin|static|media)(?:/|$)).*$",
        ReactAuthPageView.as_view(),
        name="frontend-page",
    ),
]

urlpatterns = default_urls + swagger_urls + pages_urls + identity_urls + schedule_data_urls + frontend_urls
