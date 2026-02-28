from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.v1.roteamento.rotas import registrar_rotas

router = DefaultRouter()
registrar_rotas(router)

urlpatterns = [
		path("", include(router.urls)),
		]
