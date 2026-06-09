from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.ai_assistant.models import AiKnowledgeEntry
from apps.tenants.models.tenant import Tenant


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-ia-{s}", name="Tenant IA", domain=f"{s}.local", active=True)


def _entry(tenant, *, status=AiKnowledgeEntry.Status.DRAFT):
    s = uuid4().hex[:6]
    return AiKnowledgeEntry.objects.create(
        tenant=tenant, slug=f"kb-{s}", title="Regra interna", status=status,
    )


@pytest.mark.django_db
def test_activate_makes_entry_retrievable():
    tenant = _tenant()
    entry = _entry(tenant)  # DRAFT — fora do RAG
    assert entry.status == AiKnowledgeEntry.Status.DRAFT

    entry.activate()
    assert entry.status == AiKnowledgeEntry.Status.ACTIVE
    # Já activa não pode ser activada de novo.
    with pytest.raises(ValidationError):
        entry.activate()


@pytest.mark.django_db
def test_archive_removes_entry_from_rag():
    tenant = _tenant()
    entry = _entry(tenant, status=AiKnowledgeEntry.Status.ACTIVE)
    entry.archive()
    assert entry.status == AiKnowledgeEntry.Status.ARCHIVED
    # Já arquivada não pode ser arquivada de novo.
    with pytest.raises(ValidationError):
        entry.archive()
    # Pode ser reactivada.
    entry.activate()
    assert entry.status == AiKnowledgeEntry.Status.ACTIVE
