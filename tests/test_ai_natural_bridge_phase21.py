from __future__ import annotations

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
import pytest

from apps.ai_assistant.services.natural_bridge import build_natural_bridge, polish_natural_answer
from apps.clinical.models import Patient
from apps.tenants.models.tenant import Tenant
from security.permissions.rbac import GROUPS


def _tenant(identifier: str = "tn-ai-natural", domain: str = "tn-ai-natural.local") -> Tenant:
    return Tenant.objects.create(identifier=identifier, name=f"Tenant {identifier}", domain=domain, active=True)


def _user(tenant: Tenant, username: str, group_name: str):
    user = get_user_model().objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name=group_name)
    user.groups.add(group)
    return user


def _authenticate(api_client, tenant: Tenant, user) -> None:
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)


def test_natural_bridge_turns_database_tool_payload_into_conversation_context():
    tool_results = [
        {
            "tool_name": "explore_database",
            "result": {
                "summary": {
                    "resource_results": [
                        {
                            "basename": "clinical-patient",
                            "label_pt": "Pacientes",
                            "label_en": "Patients",
                            "module": "clinical",
                            "module_label_pt": "Clínico",
                            "module_label_en": "Clinical",
                            "model": "clinical.Patient",
                            "href": "/api/v1/clinical/patient/",
                            "filtered_count": 2,
                            "total_count": 2,
                            "sample_count": 2,
                        }
                    ]
                }
            },
        }
    ]

    bridge = build_natural_bridge(
        question="mostre pacientes",
        language="pt",
        active_module="clinical",
        tool_results=tool_results,
    )

    assert bridge["status"] == "connected"
    assert bridge["database_scope"] == "tenant_rbac_safe_samples"
    assert bridge["privacy_mode"] == "summary_only"
    assert bridge["modules"][0]["module"] == "clinical"
    assert bridge["resources"][0]["basename"] == "clinical-patient"
    assert "href" not in bridge["resources"][0]
    assert "model" not in bridge["resources"][0]
    assert "Pacientes" in bridge["lead"]
    assert "sem expor tabelas" in bridge["lead"]
    assert bridge["narrative_items"]
    assert "Mostre apenas pacientes recentes." in bridge["suggested_questions"]

    polished = polish_natural_answer(
        answer="Consultei apenas os recursos da base de dados permitidos pelo seu perfil RBAC.\n\n- Pacientes: 2 registo(s).",
        bridge=bridge,
        language="pt",
    )
    assert polished.startswith("Liguei a sua pergunta")
    assert "Consultei apenas" not in polished.split("\n\n")[0]


@pytest.mark.django_db
def test_ai_chat_exposes_natural_bridge_for_database_questions(api_client):
    tenant = _tenant()
    user = _user(tenant, "recepcao_ai_natural", GROUPS["RECEPCAO"])
    Patient.objects.create(tenant=tenant, name="Paciente Natural A")
    Patient.objects.create(tenant=tenant, name="Paciente Natural B")
    _authenticate(api_client, tenant, user)

    response = api_client.post(
        "/api/v1/ai/assistant/chat/",
        {
            "message": "mostre pacientes",
            "language": "pt",
            "active_module": "ai",
        },
        format="json",
    )

    assert response.status_code == 200, response.data
    data = response.data
    bridge = data["schema"]["natural_bridge"]

    assert bridge["status"] == "connected"
    assert bridge["database_scope"] in {"tenant_rbac_safe_samples", "tenant_rbac_parameterized_sql"}
    assert bridge["privacy_mode"] == "summary_only"
    assert any(resource["basename"] == "clinical-patient" for resource in bridge["resources"])
    assert all("href" not in resource and "model" not in resource for resource in bridge["resources"])
    assert data["schema"]["analytics"] is None or data["schema"]["analytics"]["sample_rows"] == []
    assert all(not source.get("href") for source in data["sources"] if source.get("type") in {"model", "sql_template"})
    assert any(call["tool_name"] == "explore_database" and call["status"] == "success" for call in data["tool_calls"])
    assert data["conversation"]["natural_bridge"]["lead"] == bridge["lead"]
    assert data["answer"].startswith("Liguei a sua pergunta")
    assert "Pacientes" in data["answer"]
