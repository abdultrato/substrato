"""Rotas dedicadas à geração de PDF institucional."""

from django.urls import path

from .views import result_pdf

urlpatterns = [
    path(
        "result/<str:custom_id>/",
        result_pdf,
        name="result_pdf",
    ),
]
