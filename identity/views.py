from django.contrib.auth import login as django_login
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import (
    csrf_protect,
    ensure_csrf_cookie,
)

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from .serializers import UserSerializer, LoginSerializer


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AuthPageView(View):
    def get(self, request):
        return render(request, "auth.html")


@method_decorator(csrf_protect, name="dispatch")
class AuthViewSet(ViewSet):
    permission_classes = [AllowAny]
    authentication_classes = []

    def reg(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(
            {
                "message": "Пользователь создан.",
                "login": user.login,
            },
            status=status.HTTP_201_CREATED,
        )

    def auth(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        django_login(request, user)

        return Response(
            {
                "message": "Вход выполнен.",
                "login": user.login,
            },
            status=status.HTTP_200_OK,
        )