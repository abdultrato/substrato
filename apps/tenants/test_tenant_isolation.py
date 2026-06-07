"""Testes de isolamento multi-tenant (núcleo de confiança — Passo 4).

Exercitam diretamente o `TenantScopedQuerysetMixin`, que é o ponto onde o
isolamento é imposto: filtragem de queryset, bloqueio de injeção de tenant no
payload (CREATE) e bloqueio de acesso/alteração cross-tenant (UPDATE).

Testar o mixin diretamente é determinístico; o middleware, em DEBUG, resolve
sempre o primeiro tenant ativo e não serviria para distinguir A de B.
"""

from types import SimpleNamespace

from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.viewsets import ModelViewSet
import pytest

from api.v1.viewset_mixins import TenantScopedQuerysetMixin
from apps.tenants.models.feature_flags import TenantFeatureFlag
from apps.tenants.models.tenant import Tenant


class _FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantFeatureFlag
        fields = ["id", "key", "tenant"]


class _FeatureFlagViewSet(TenantScopedQuerysetMixin, ModelViewSet):
    queryset = TenantFeatureFlag.all_objects.all()
    serializer_class = _FeatureFlagSerializer


def _view(tenant, user=None):
    view = _FeatureFlagViewSet()
    view.request = SimpleNamespace(tenant=tenant, user=user)
    view.kwargs = {}
    return view


def _tenants():
    a = Tenant.objects.create(identifier="tenant-a", name="Tenant A")
    b = Tenant.objects.create(identifier="tenant-b", name="Tenant B")
    return a, b


@pytest.mark.django_db
def test_queryset_isola_dados_por_tenant():
    a, b = _tenants()
    fa = TenantFeatureFlag.objects.create(tenant=a, key="beta")
    fb = TenantFeatureFlag.objects.create(tenant=b, key="beta")

    ids = set(_view(a).get_queryset().values_list("id", flat=True))
    assert fa.id in ids
    assert fb.id not in ids


@pytest.mark.django_db
def test_perform_create_ignora_tenant_do_payload():
    a, b = _tenants()
    # Cliente do tenant A tenta injetar tenant=B no corpo.
    serializer = _FeatureFlagSerializer(data={"key": "x", "tenant": b.id})
    serializer.is_valid(raise_exception=True)

    _view(a).perform_create(serializer)

    assert serializer.instance.tenant_id == a.id  # forçado para o tenant do request


@pytest.mark.django_db
def test_perform_update_bloqueia_registro_de_outro_tenant():
    a, b = _tenants()
    flag = TenantFeatureFlag.objects.create(tenant=a, key="z")

    serializer = _FeatureFlagSerializer(instance=flag, data={"key": "z2"}, partial=True)
    serializer.is_valid(raise_exception=True)

    # Request do tenant B a tentar alterar registro do tenant A.
    with pytest.raises(PermissionDenied):
        _view(b).perform_update(serializer)


@pytest.mark.django_db
def test_perform_update_bloqueia_troca_de_tenant_via_payload():
    a, b = _tenants()
    flag = TenantFeatureFlag.objects.create(tenant=a, key="w")

    serializer = _FeatureFlagSerializer(instance=flag, data={"key": "w", "tenant": b.id}, partial=True)
    serializer.is_valid(raise_exception=True)

    with pytest.raises(PermissionDenied):
        _view(a).perform_update(serializer)


@pytest.mark.django_db
def test_superuser_ignora_scoping_de_tenant():
    a, b = _tenants()
    flag = TenantFeatureFlag.objects.create(tenant=a, key="su")
    serializer = _FeatureFlagSerializer(instance=flag, data={"key": "su2"}, partial=True)
    serializer.is_valid(raise_exception=True)

    superuser = SimpleNamespace(is_superuser=True)
    view = _view(b, user=superuser)
    # Superuser não é bloqueado pelo scoping (admin de plataforma).
    view.perform_update(serializer)
    flag.refresh_from_db()
    assert flag.key == "su2"
