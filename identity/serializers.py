from rest_framework.serializers import Serializer, EmailField, CharField
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError


class LoginSerializer(Serializer):
    login = EmailField()
    password = CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["login"],
            password=attrs["password"],
        )

        if user is None:
            raise ValidationError(
                "Неверный логин или пароль."
            )

        attrs["user"] = user
        return attrs

