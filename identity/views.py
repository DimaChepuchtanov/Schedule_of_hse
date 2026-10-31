from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET
from django.views.generic import TemplateView

from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSet

from .serializers import LoginSerializer, UserSerializer


def user_payload(user):
    return {"id": str(user.pk), "login": user.get_username()}


@require_GET
@never_cache
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@method_decorator(never_cache, name="dispatch")
@method_decorator(ensure_csrf_cookie, name="dispatch")
class ReactAuthPageView(TemplateView):
    template_name = "dist/index.html"


@method_decorator(never_cache, name="dispatch")
class CurrentUserView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        authenticated = request.user.is_authenticated
        return Response({
            "authenticated": authenticated,
            "user": user_payload(request.user) if authenticated else None,
        })


@method_decorator(never_cache, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class AuthViewSet(ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def reg(self, request):
        serializer = UserSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"user": user_payload(user)}, status=status.HTTP_201_CREATED)

    def auth(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        django_login(request, user)
        return Response({"user": user_payload(user)})


@method_decorator(never_cache, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        django_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
