from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import UserModel


class CustomUserAdmin(UserAdmin):
    model = UserModel
    list_display = ('login', 'display_name', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('login', 'password')}),
        ('Personal Info', {'fields': ('display_name',)}),
        ('Permissions', {'fields': ('is_staff', 'is_active')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('login', 'display_name', 'password1', 'password2', 'is_staff', 'is_active')}
         ),
    )
    search_fields = ('login',)
    ordering = ('login',)




admin.site.register(UserModel, CustomUserAdmin)
