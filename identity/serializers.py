from rest_framework.serializers import Serializer, EmailField, CharField
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from rest_framework.validators import UniqueValidator

from .models import UserModel, RoleModel


class UserSerializer(Serializer):
    login = EmailField(
        validators=[
            UniqueValidator(
                queryset=UserModel.objects.all(),
                message="Пользователь с таким логином уже существует.",
            )
        ]
    )

    password = CharField(
        write_only=True,
        trim_whitespace=False,
        min_length=8,
    )

    def validate_password(self, value):
        try:
            validate_password(value)
        except ValidationError as error:
            raise ValidationError(error.messages)

        return value

    def create(self, validated_data):
        role = RoleModel.objects.get(id=0)

        return UserModel.objects.create(
            login=validated_data["login"],
            password=make_password(validated_data["password"]),
            role=role
        )



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

