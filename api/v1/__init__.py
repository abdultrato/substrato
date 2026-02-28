from .paginacao import PaginacaoPadrao
from .permissoes import BasePermission
from .respostas import Response, sucesso, erro
from .clinico import serializers, viewsets
from .farmacia import filters, viewsets, serializers
from .base_viewset import BaseModelViewSet
from . import base_serializer
from .contabilidade import filters, viewsets, serializers
from .urls import  router, urlpatterns, registrar_rotas, DefaultRouter, path, include
from .faturamento import filters, viewsets, serializers
from .identidade import serializers, viewsets, filters
from .inquilinos import serializers, viewsets, filters
from .notificacoes import filters, viewsets, serializers
from .pagamentos import serializers, viewsets, filters
from .roteamento import registry, urls, rotas, router, roteador
from .seguradora import seguradora_viewset, viewsets, filters, serializers

__all__ = [
		"rotas", "registrar_rotas", "viewsets", "seguradora_viewset",
		"seguradora", "roteador", "filters","base_serializer", "serializers",
		"BasePermission",
		"path", "erro", "include", "registry", "sucesso", "DefaultRouter",
		"router", "urlpatterns", "urls", "Response", "BaseModelViewSet",
		"base_viewset", "roteamento","identidade", "inquilinos",
		"PaginacaoPadrao", "paginacao", "notificacoes", "faturamento",
		"contabilidade", "farmacia", "clinico", "pagamentos", "respostas",
		"permissoes",
		]
