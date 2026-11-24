from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, SimpleTestCase

from reference_data.views import reference_catalog


class ReferenceCatalogAccessTests(SimpleTestCase):
    def test_anonymous_user_is_rejected(self):
        request = RequestFactory().get("/api/reference/")
        request.user = AnonymousUser()

        response = reference_catalog(request)

        self.assertEqual(response.status_code, 401)
