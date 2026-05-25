from django.contrib.auth import get_user_model
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
            f"/api/v1/equipment/incident/{incident.id}/realizar-manutencao/",
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
