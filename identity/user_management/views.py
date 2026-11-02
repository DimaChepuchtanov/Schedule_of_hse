"""Session-authenticated API for the existing identity.UserModel.

The only administrator is provisioned separately with createsuperuser.
This API creates helpers only. GEN-14 uses display_name and the standard
Django flags; it has no role foreign key.
"""

import json
from functools import wraps

from django.contrib.auth import get_user_model, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import FieldDoesNotExist, ValidationError
from django.core.paginator import Paginator
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.db.models.deletion import ProtectedError, RestrictedError
from django.http import HttpResponse, JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect


class ApiFailure(Exception):
    def __init__(self, message, status=400, **fields):
        self.message = message
        self.status = status
        self.fields = fields


def admin_endpoint(*methods):
    def decorate(view):
        @never_cache
        @csrf_protect
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            if request.method not in methods:
                response = JsonResponse({"detail": "Метод не поддерживается."}, status=405)
                response["Allow"] = ", ".join(methods)
                return response
            actor = request.user
            if not actor.is_authenticated:
                return JsonResponse({"detail": "Сессия завершена. Войдите в аккаунт."}, status=401)
            if not actor.is_active or not getattr(actor, "is_superuser", False):
                return JsonResponse({"detail": "Управлять пользователями может только администратор."}, status=403)
            try:
                return view(request, *args, **kwargs)
            except ApiFailure as error:
                return JsonResponse({"detail": error.message, **error.fields}, status=error.status)
            except (ProtectedError, RestrictedError):
                return JsonResponse({"detail": "Пользователь связан с другими данными. Отключите доступ вместо удаления."}, status=409)
            except IntegrityError:
                return JsonResponse({"detail": "Данные изменились или такая почта уже занята. Обновите список."}, status=409)
        return wrapped
    return decorate


def user_model():
    model = get_user_model()
    for name in ("login", "display_name", "created_at", "last_login", "is_active", "is_staff", "is_superuser"):
        try:
            model._meta.get_field(name)
        except FieldDoesNotExist:
            raise ApiFailure("Модель пользователя не настроена для управления доступом.", status=503)
    return model


def payload(user, actor):
    protected = bool(user.is_superuser)
    return {
        "id": str(user.pk),
        "login": user.login,
        "display_name": user.display_name,
        "created_at": user.created_at.isoformat(),
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "role": "admin" if protected else "helper",
        "role_label": "Администратор" if protected else "Помощник",
        "is_active": user.is_active,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "protected": protected,
        "is_current_user": user.pk == actor.pk,
    }


def read_body(request, allowed):
    if request.content_type != "application/json":
        raise ApiFailure("Отправьте данные в формате JSON.", status=415)
    try:
        value = json.loads(request.body)
    except (ValueError, UnicodeError):
        raise ApiFailure("Не удалось прочитать JSON.")
    if not isinstance(value, dict):
        raise ApiFailure("Ожидается объект JSON.")
    if set(value) - set(allowed):
        raise ApiFailure("Запрос содержит недопустимые поля. Роль и административные права здесь не изменяются.")
    return value


def clean_login(value, *, exclude=None):
    model = user_model()
    if not isinstance(value, str):
        raise ApiFailure("Проверьте почту.", login=["Введите электронную почту."])
    login = value.strip().lower()
    maximum = min(model._meta.get_field("login").max_length or 250, 250)
    if len(login) > maximum:
        raise ApiFailure("Проверьте почту.", login=[f"Не более {maximum} символов."])
    try:
        validate_email(login)
    except ValidationError:
        raise ApiFailure("Проверьте почту.", login=["Введите корректную электронную почту."])
    queryset = model.objects.filter(login__iexact=login)
    if exclude is not None:
        queryset = queryset.exclude(pk=exclude)
    if queryset.exists():
        raise ApiFailure("Почта уже используется.", login=["Пользователь с такой почтой уже существует."])
    return login


def clean_password(value, user):
    if not isinstance(value, str) or not 8 <= len(value) <= 128:
        raise ApiFailure("Проверьте пароль.", password=["Используйте от 8 до 128 символов."])
    try:
        validate_password(value, user=user)
    except ValidationError as error:
        raise ApiFailure("Проверьте пароль.", password=error.messages)
    return value


def clean_name(value):
    if not isinstance(value, str) or not value.strip():
        raise ApiFailure("Проверьте имя.", display_name=["Введите отображаемое имя."])
    name = value.strip()
    if len(name) > 250:
        raise ApiFailure("Проверьте имя.", display_name=["Не более 250 символов."])
    return name


def clean_active(value):
    if type(value) is not bool:
        raise ApiFailure("Проверьте статус.", is_active=["Передайте true или false."])
    return value


def target(user_id):
    try:
        return user_model().objects.select_for_update().get(pk=user_id)
    except user_model().DoesNotExist:
        raise ApiFailure("Пользователь уже удалён или не существует.", status=404)


def positive_int(value, default):
    try:
        return max(1, int(value)) if len(str(value)) < 10 else default
    except (TypeError, ValueError):
        return default


@admin_endpoint("GET")
def context(request):
    user_model()
    return JsonResponse({"user": payload(request.user, request.user)})


@admin_endpoint("GET", "POST")
def collection(request):
    model = user_model()
    if request.method == "POST":
        data = read_body(request, {"display_name", "login", "password", "is_active"})
        display_name = clean_name(data.get("display_name"))
        login = clean_login(data.get("login"))
        active = clean_active(data.get("is_active", True))
        user = model(display_name=display_name, login=login, is_active=active, is_staff=False, is_superuser=False)
        password_value = clean_password(data.get("password"), user)
        user.set_password(password_value)
        with transaction.atomic():
            user.save(force_insert=True)
        return JsonResponse(payload(user, request.user), status=201)

    all_users = model.objects.all()
    summary = {"total": all_users.count(), "active": all_users.filter(is_active=True).count(), "inactive": all_users.filter(is_active=False).count()}
    queryset = all_users
    query = request.GET.get("q", "").strip()[:250]
    if query:
        queryset = queryset.filter(Q(login__icontains=query) | Q(display_name__icontains=query))
    status = request.GET.get("status", "all")
    role = request.GET.get("role", "all")
    if status not in {"all", "active", "inactive"} or role not in {"all", "admin", "helper"}:
        raise ApiFailure("Неизвестное значение фильтра.")
    if status != "all":
        queryset = queryset.filter(is_active=status == "active")
    if role != "all":
        queryset = queryset.filter(is_superuser=role == "admin")
    page_size = min(positive_int(request.GET.get("page_size", 6), 6), 100)
    paginator = Paginator(queryset.order_by("-is_superuser", "login", "pk"), page_size)
    page = paginator.get_page(positive_int(request.GET.get("page", 1), 1))
    return JsonResponse({"results": [payload(user, request.user) for user in page], "count": paginator.count, "page": page.number, "page_size": page_size, "pages": paginator.num_pages, "summary": summary})


@admin_endpoint("PATCH", "DELETE")
def detail(request, user_id):
    data = read_body(request, {"display_name", "login", "is_active"}) if request.method == "PATCH" else None
    with transaction.atomic():
        user = target(user_id)
        if request.method == "DELETE":
            if user.is_superuser or user.pk == request.user.pk:
                raise ApiFailure("Главную учётную запись нельзя удалить.", status=409)
            user.delete()
            return HttpResponse(status=204)
        if not data:
            raise ApiFailure("Укажите изменения.")
        fields = []
        if "display_name" in data:
            user.display_name = clean_name(data["display_name"])
            fields.append("display_name")
        if "login" in data:
            user.login = clean_login(data["login"], exclude=user.pk)
            fields.append("login")
        if "is_active" in data:
            active = clean_active(data["is_active"])
            if not active and (user.is_superuser or user.pk == request.user.pk):
                raise ApiFailure("Главную учётную запись нельзя отключить.", status=409)
            user.is_active = active
            fields.append("is_active")
        user.save(update_fields=fields)
        return JsonResponse(payload(user, request.user))


@admin_endpoint("POST")
def password(request, user_id):
    data = read_body(request, {"password"})
    with transaction.atomic():
        user = target(user_id)
        user.set_password(clean_password(data.get("password"), user))
        user.save(update_fields=["password"])
    if user.pk == request.user.pk:
        update_session_auth_hash(request, user)
    return JsonResponse(payload(user, request.user))
