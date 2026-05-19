import json
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
import pytest

from apps.education.models import StudentProfile
from apps.tenants.models.tenant import Tenant


@pytest.mark.django_db
def test_education_migration_inventory_command_outputs_json_with_segments():
    tenant = Tenant.objects.create(
        identifier="tn-edu-cmd",
        name="Tenant Education Command",
        domain="edu-command.local",
        active=True,
    )
    user = get_user_model().objects.create_user(
        username="edu_cmd_student",
        email="edu_cmd_student@example.com",
        password="testpass123",
        name="Edu Cmd Student",
        tenant=tenant,
    )
    StudentProfile.objects.create(
        tenant=tenant,
        user=user,
        student_code="CMD-STU-001",
    )

    out = StringIO()
    call_command("education_migration_inventory", "--format", "json", stdout=out)

    payload = json.loads(out.getvalue())
    segments = payload["segments"]
    students = segments["students"]

    assert "generated_at" in payload
    assert students["new_table"] == "education_student_profile"
    assert students["new_rows"] >= 1
    assert "legacy_rows" in students
    assert "status" in students
