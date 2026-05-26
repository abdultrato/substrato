from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from apps.equipment.models import Equipment
from apps.incidents.models import Incident
from apps.maintenance.models import Maintenance
from apps.tenants.models import Tenant


class MaintenanceIncidentWorkflowTests(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(
            name="Tenant Manutencao",
            identifier="tenant-manutencao",
            domain="testserver",
        )
        self.equipment = Equipment.objects.create(
            tenant=self.tenant,
            name="Monitor multiparametrico",
            serial_number="EQ-MNT-001",
        )

    def test_equipment_incident_marks_equipment_as_requiring_maintenance(self):
        incident = Incident.objects.create(
            tenant=self.tenant,
            equipment=self.equipment,
            description="Equipamento desligou durante atendimento.",
        )

        self.equipment.refresh_from_db()
        incident.refresh_from_db()

        self.assertTrue(incident.requires_maintenance)
        self.assertIsNotNone(incident.maintenance_requested_at)
        self.assertTrue(self.equipment.requires_maintenance)
        self.assertEqual(self.equipment.maintenance_required_since, incident.maintenance_requested_at)

    def test_generic_incident_without_equipment_does_not_generate_maintenance_request(self):
        incident = Incident.objects.create(
            tenant=self.tenant,
            equipment=None,
            description="Ocorrência administrativa sem equipamento associado.",
        )

        incident.refresh_from_db()
        self.equipment.refresh_from_db()

        self.assertFalse(incident.requires_maintenance)
        self.assertIsNone(incident.maintenance_requested_at)
        self.assertFalse(self.equipment.requires_maintenance)

    def test_incident_requires_equipment_when_marked_for_maintenance(self):
        incident = Incident(
            tenant=self.tenant,
            equipment=None,
            description="Pedido técnico sem equipamento identificado.",
            requires_maintenance=True,
        )

        with self.assertRaises(ValidationError) as context:
            incident.full_clean()

        self.assertIn("equipment", context.exception.message_dict)

    def test_perform_maintenance_from_incident_resolves_request(self):
        user = get_user_model().objects.create_superuser(
            username="manutencao-admin",
            email="manutencao-admin@example.com",
            password="test-pass",
            tenant=self.tenant,
        )
        incident = Incident.objects.create(
            tenant=self.tenant,
            equipment=self.equipment,
            description="Falha no sensor de saturacao.",
        )

        client = APIClient()
        client.defaults["HTTP_HOST"] = self.tenant.domain
        client.force_authenticate(user=user)
        response = client.post(
            f"/api/v1/equipment/incident/{incident.id}/perform-maintenance/",
            {
                "maintenance_type": Maintenance.MaintenanceType.CORRECTIVE,
                "type": Maintenance.Type.MONTHLY,
                "scheduled_date": "2026-05-25",
                "performed_date": "2026-05-25",
                "technician": "Tecnico A",
                "description": "Sensor substituido e equipamento testado.",
                "post_incident_actions": "Triagem feita antes da intervencao.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)
        maintenance = Maintenance.objects.get(incident=incident)
        self.assertEqual(maintenance.equipment, self.equipment)
        self.assertEqual(maintenance.maintenance_type, Maintenance.MaintenanceType.CORRECTIVE)

        incident.refresh_from_db()
        self.equipment.refresh_from_db()
        self.assertTrue(incident.resolved)
        self.assertFalse(incident.requires_maintenance)
        self.assertIsNotNone(incident.maintenance_completed_at)
        self.assertIn("Triagem feita", incident.post_incident_actions)
        self.assertFalse(self.equipment.requires_maintenance)

        self.assertEqual(response.data["incident_context"]["custom_id"], incident.custom_id)
        self.assertEqual(response.data["incident_context"]["equipment_id"], self.equipment.id)
        self.assertEqual(
            response.data["incident_context"]["equipment_serial_number"],
            self.equipment.serial_number,
        )
        self.assertIn("Triagem feita", response.data["incident_context"]["post_incident_actions"])

    def test_perform_maintenance_requires_explicit_maintenance_type(self):
        user = get_user_model().objects.create_superuser(
            username="manutencao-sem-tipo",
            email="manutencao-sem-tipo@example.com",
            password="test-pass",
            tenant=self.tenant,
        )
        incident = Incident.objects.create(
            tenant=self.tenant,
            equipment=self.equipment,
            description="Falha sem tipo informado.",
        )

        client = APIClient()
        client.defaults["HTTP_HOST"] = self.tenant.domain
        client.force_authenticate(user=user)
        response = client.post(
            f"/api/v1/equipment/incident/{incident.id}/perform-maintenance/",
            {
                "type": Maintenance.Type.MONTHLY,
                "scheduled_date": "2026-05-25",
                "performed_date": "2026-05-25",
                "technician": "Tecnico B",
                "description": "Tentativa sem tipo de manutenção.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.content)
        validation_errors = response.data.get("validationErrors", response.data)
        self.assertIn("maintenance_type", validation_errors)
        self.assertFalse(Maintenance.objects.filter(incident=incident).exists())

        incident.refresh_from_db()
        self.equipment.refresh_from_db()
        self.assertFalse(incident.resolved)
        self.assertTrue(incident.requires_maintenance)
        self.assertTrue(self.equipment.requires_maintenance)

    def test_maintenance_pending_requests_endpoint_returns_incident_context(self):
        user = get_user_model().objects.create_superuser(
            username="manutencao-pedidos",
            email="manutencao-pedidos@example.com",
            password="test-pass",
            tenant=self.tenant,
        )
        incident = Incident.objects.create(
            tenant=self.tenant,
            equipment=self.equipment,
            description="Alarmes intermitentes no monitor.",
            support_contact="Suporte biomédico",
            post_incident_actions="Equipamento isolado e sinalizado.",
        )

        client = APIClient()
        client.defaults["HTTP_HOST"] = self.tenant.domain
        client.force_authenticate(user=user)
        response = client.get("/api/v1/maintenance/maintenance/pending-requests/")

        self.assertEqual(response.status_code, 200, response.content)
        payload = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
        self.assertEqual(len(payload), 1)
        self.assertEqual(payload[0]["id"], incident.id)
        self.assertEqual(payload[0]["equipment"], self.equipment.id)
        self.assertEqual(payload[0]["equipment_name"], self.equipment.name)
        self.assertEqual(payload[0]["equipment_serial_number"], self.equipment.serial_number)
        self.assertEqual(payload[0]["post_incident_actions"], "Equipamento isolado e sinalizado.")
        self.assertEqual(payload[0]["maintenance_status"], "Manutenção pendente")

    def test_equipment_maintenance_api_contract_uses_english_routes(self):
        from api.v1.equipment.filters import FILTER_MAP
        from api.v1.equipment.serializers import SERIALIZER_MAP
        from api.v1.equipment.viewsets import VIEWSET_MAP

        legacy_keys = {"inspecaodiaria", "manutencao", "ocorrencia"}
        self.assertFalse(legacy_keys & set(VIEWSET_MAP))
        self.assertFalse(legacy_keys & set(SERIALIZER_MAP))
        self.assertFalse(legacy_keys & set(FILTER_MAP))

        user = get_user_model().objects.create_superuser(
            username="maintenance-contract",
            email="maintenance-contract@example.com",
            password="test-pass",
            tenant=self.tenant,
        )
        incident = Incident.objects.create(
            tenant=self.tenant,
            equipment=self.equipment,
            description="Falha usada para validar contrato técnico.",
        )

        client = APIClient()
        client.defaults["HTTP_HOST"] = self.tenant.domain
        client.force_authenticate(user=user)

        self.assertEqual(client.get("/api/v1/equipment/incident/").status_code, 200)
        self.assertEqual(client.get("/api/v1/equipment/ocorrencia/").status_code, 404)
        self.assertEqual(client.get("/api/v1/equipment/maintenance/").status_code, 404)
        self.assertEqual(
            client.post(
                f"/api/v1/equipment/incident/{incident.id}/realizar-manutencao/",
                {"maintenance_type": Maintenance.MaintenanceType.CORRECTIVE},
                format="json",
            ).status_code,
            404,
        )
