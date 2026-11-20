from django.urls import path

from .views import data_import, example_file

urlpatterns = [
    path('api/data-import/', data_import, name='data-import'),
    path('api/data-import/examples/<str:example_type>/', example_file, name='data-import-example'),
]
