"""Isolamento de PHI (prontuário) entre tenants — núcleo de confiança (Passo 4).

A propriedade mais crítica de um SaaS de saúde multi-tenant: o prontuário
(dados clínicos do paciente) de um tenant nunca pode ser visível a outro.
"""

from types import SimpleNamespace

from rest_framework import serializers
from rest_framework.viewsets import ModelViewSet
import pytest

from api.v1.viewset_mixins import TenantScopedQuerysetMixin
from apps.clinical.models.patient import Patient
from apps.medical_records.models.medical_record_entry import MedicalRecordEntry
from apps.tenants.models.tenant import Tenant


class _EntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicalRecordEntry
        fields = ["id"]


class _EntryViewSet(TenantScopedQuerysetMixin, ModelViewSet):
    queryset = MedicalRecordEntry.all_objects.all()
    serializer_class = _EntrySerializer


def _tenant(slug):
    return Tenant.objects.create(identifier=slug, name=slug.upper())


def _patient(tenant, name):
    return Patient.objects.create(tenant=tenant, name=name)


def _entry(tenant, patient):
    return MedicalRecordEntry.objects.create(tenant=tenant, patient=patient)


@pytest.mark.django_db
def test_prontuario_isolado_por_tenant():
    a, b = _tenant("clinica-a"), _tenant("clinica-b")
    entry_a = _entry(a, _patient(a, "Ana"))
    entry_b = _entry(b, _patient(b, "Bia"))

    view = _EntryViewSet()
    view.request = SimpleNamespace(tenant=a, user=None)
    view.kwargs = {}

    ids = set(view.get_queryset().values_list("id", flat=True))
    assert entry_a.id in ids
    assert entry_b.id not in ids  # PHI do tenant B nunca aparece para o tenant A


@pytest.mark.django_db
def test_prontuario_recebe_tenant_e_identificador():
    a = _tenant("clinica-a")
    entry = _entry(a, _patient(a, "Ana"))
    assert entry.tenant_id == a.id
    assert (entry.custom_id or "").startswith("PRT")
    assert entry.status == MedicalRecordEntry.Status.DRAFT
