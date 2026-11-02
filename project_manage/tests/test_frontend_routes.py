from django.test import SimpleTestCase, override_settings
from django.urls import resolve

from identity.views import CurrentUserView


@override_settings(
    ALLOWED_HOSTS=["testserver"],
    TEMPLATES=[{
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": False,
        "OPTIONS": {
            "loaders": [(
                "django.template.loaders.locmem.Loader",
                {"dist/index.html": '<div data-app="react"></div>'},
            )],
        },
    }],
)
class FrontendRouteTests(SimpleTestCase):
    """SPA navigation must work without using a database or a frontend build."""

    def test_new_nested_page_can_be_opened_directly(self):
        response = self.client.get("/profile/settings/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, '<div data-app="react"></div>')
        self.assertEqual(resolve("/profile/settings/").url_name, "frontend-page")

    def test_root_serves_the_react_entry(self):
        self.assertContains(self.client.get("/"), '<div data-app="react"></div>')

    def test_existing_auth_page_name_is_preserved(self):
        self.assertEqual(resolve("/auth/").url_name, "auth-page")
        self.assertContains(self.client.get("/auth/"), '<div data-app="react"></div>')

    def test_unknown_backend_urls_stay_404(self):
        for url in ["/api/missing/", "/static/missing.css", "/media/missing.png"]:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 404)
                self.assertNotContains(response, 'data-app="react"', status_code=404)

    def test_similar_prefixes_are_available_to_frontend_pages(self):
        for url in ["/api-help/", "/administrator/", "/static-site/"]:
            with self.subTest(url=url):
                self.assertContains(self.client.get(url), '<div data-app="react"></div>')

    def test_existing_api_routes_are_preserved(self):
        self.assertIs(resolve("/api/me/").func.view_class, CurrentUserView)
        self.assertEqual(resolve("/api/csrf/").url_name, "csrf")

    def test_admin_keeps_its_own_router(self):
        self.assertEqual(resolve("/admin/").namespace, "admin")
