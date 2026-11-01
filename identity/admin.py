from django.contrib import admin

from .models import RoleModel, UserModel


@admin.register(UserModel)
class UserModelAdmin(admin.ModelAdmin):
    list_display = ("login", "role", "is_staff", "is_active", "is_superuser")
    list_filter = ("is_staff", "is_active", "is_superuser", "role")
    search_fields = ("login",)


admin.site.register(RoleModel)
