from django.urls import path

from .views import result_pdf

urlpatterns = [
    path(
        "resultado/<str:id_custom>/",
        result_pdf,
        name="resultado_pdf",
    ),
]
