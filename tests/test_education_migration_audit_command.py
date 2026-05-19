from io import StringIO
import json

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
import pytest

from apps.tenants.models.tenant import Tenant


def _ensure_legacy_tables():
    statements = [
        """
        CREATE TABLE IF NOT EXISTS academic_student (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            code TEXT,
            name TEXT,
            user_id INTEGER,
            estado TEXT,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS school_teacher (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            code TEXT,
            specialty TEXT,
            user_id INTEGER,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS learning_course (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            code TEXT,
            title TEXT,
            description TEXT,
            active INTEGER,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS school_academicyear (
            id INTEGER PRIMARY KEY,
            code TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS school_classroom (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            code TEXT,
            name TEXT,
            academic_year_id INTEGER,
            lead_teacher_id INTEGER,
            capacity INTEGER,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS learning_courseoffering (
            id INTEGER PRIMARY KEY,
            course_id INTEGER,
            classroom_id INTEGER,
            teacher_id INTEGER,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS school_enrollment (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            code TEXT,
            student_id INTEGER,
            classroom_id INTEGER,
            enrollment_date TEXT,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS school_attendancerecord (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            code TEXT,
            enrollment_id INTEGER,
            lesson_date TEXT,
            status TEXT,
            notes TEXT,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS school_teachingassignment (
            id INTEGER PRIMARY KEY,
            teacher_id INTEGER,
            classroom_id INTEGER,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS assessment_assessment (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            type TEXT,
            date TEXT,
            score REAL,
            student_id INTEGER,
            teaching_assignment_id INTEGER,
            deleted_at TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS learning_lesson (
            id INTEGER PRIMARY KEY,
            tenant_id TEXT,
            title TEXT,
            description TEXT,
            scheduled_at TEXT,
            published INTEGER,
            offering_id INTEGER,
            meeting_url TEXT,
            recording_url TEXT,
            deleted_at TEXT
        )
        """,
    ]
    with connection.cursor() as cursor:
        for statement in statements:
            cursor.execute(statement)


def _clear_legacy_tables():
    tables = [
        "academic_student",
        "school_teacher",
        "learning_course",
        "school_academicyear",
        "school_classroom",
        "learning_courseoffering",
        "school_enrollment",
        "school_attendancerecord",
        "school_teachingassignment",
        "assessment_assessment",
        "learning_lesson",
    ]
    with connection.cursor() as cursor:
        for table in tables:
            cursor.execute(f"DELETE FROM {table}")


@pytest.mark.django_db
def test_education_migration_audit_reports_match_after_apply():
    _ensure_legacy_tables()
    _clear_legacy_tables()

    tenant = Tenant.objects.create(
        identifier="tn-edu-audit",
        name="Tenant Education Audit",
        domain="edu-audit.local",
        active=True,
    )

    user_model = get_user_model()
    student_user = user_model.objects.create_user(
        username="audit_student",
        email="audit_student@example.com",
        password="testpass123",
        name="Audit Student",
        tenant=tenant,
    )
    teacher_user = user_model.objects.create_user(
        username="audit_teacher",
        email="audit_teacher@example.com",
        password="testpass123",
        name="Audit Teacher",
        tenant=tenant,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO academic_student (id, tenant_id, code, name, user_id, estado, deleted_at)
            VALUES (1, ?, 'STU-AUD-001', 'Audit Student', ?, 'active', NULL)
            """,
            [tenant.identifier, student_user.id],
        )
        cursor.execute(
            """
            INSERT INTO school_teacher (id, tenant_id, code, specialty, user_id, deleted_at)
            VALUES (1, ?, 'TCH-AUD-001', 'Math', ?, NULL)
            """,
            [tenant.identifier, teacher_user.id],
        )
        cursor.execute(
            """
            INSERT INTO learning_course (id, tenant_id, code, title, description, active, deleted_at)
            VALUES (1, ?, 'CRS-AUD-001', 'Audit Math', 'Math content', 1, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute("INSERT INTO school_academicyear (id, code) VALUES (1, '2026')")
        cursor.execute(
            """
            INSERT INTO school_classroom (id, tenant_id, code, name, academic_year_id, lead_teacher_id, capacity, deleted_at)
            VALUES (1, ?, 'CLS-AUD-001', 'Class Audit', 1, 1, 28, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            "INSERT INTO learning_courseoffering (id, course_id, classroom_id, teacher_id, deleted_at) VALUES (1, 1, 1, 1, NULL)"
        )
        cursor.execute(
            """
            INSERT INTO school_enrollment (id, tenant_id, code, student_id, classroom_id, enrollment_date, deleted_at)
            VALUES (1, ?, 'ENR-AUD-001', 1, 1, '2026-01-20', NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO school_attendancerecord (id, tenant_id, code, enrollment_id, lesson_date, status, notes, deleted_at)
            VALUES (1, ?, 'ATT-AUD-001', 1, '2026-02-11', 'present', 'Present', NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            "INSERT INTO school_teachingassignment (id, teacher_id, classroom_id, deleted_at) VALUES (1, 1, 1, NULL)"
        )
        cursor.execute(
            """
            INSERT INTO assessment_assessment (id, tenant_id, type, date, score, student_id, teaching_assignment_id, deleted_at)
            VALUES (1, ?, 'exam', '2026-03-11', 19.0, 1, 1, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO learning_lesson (id, tenant_id, title, description, scheduled_at, published, offering_id, meeting_url, recording_url, deleted_at)
            VALUES (1, ?, 'Lesson Audit', 'Audit introduction', '2026-03-12T10:00:00', 1, 1, 'https://meeting.local/audit', '', NULL)
            """,
            [tenant.identifier],
        )

    call_command(
        "education_migrate_legacy",
        "--apply",
        "--fallback-tenant",
        tenant.identifier,
        "--format",
        "json",
    )

    out = StringIO()
    call_command(
        "education_migration_audit",
        "--fallback-tenant",
        tenant.identifier,
        "--format",
        "json",
        stdout=out,
    )
    payload = json.loads(out.getvalue())

    segments = payload["segments"]
    assert all(segments[segment]["status"] == "MATCH" for segment in segments)
    assert payload["overview"]["status"] == "MATCH"
    assert payload["overview"]["segments_divergent"] == 0
    assert payload["overview"]["total_missing_in_target"] == 0
    assert payload["overview"]["total_extra_in_target"] == 0


@pytest.mark.django_db
def test_education_migration_audit_auto_fix_runs_and_reaudits():
    _ensure_legacy_tables()
    _clear_legacy_tables()

    tenant = Tenant.objects.create(
        identifier="tn-edu-audit-fix",
        name="Tenant Education Audit Fix",
        domain="edu-audit-fix.local",
        active=True,
    )

    user_model = get_user_model()
    student_user = user_model.objects.create_user(
        username="audit_fix_student",
        email="audit_fix_student@example.com",
        password="testpass123",
        name="Audit Fix Student",
        tenant=tenant,
    )
    teacher_user = user_model.objects.create_user(
        username="audit_fix_teacher",
        email="audit_fix_teacher@example.com",
        password="testpass123",
        name="Audit Fix Teacher",
        tenant=tenant,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO academic_student (id, tenant_id, code, name, user_id, estado, deleted_at)
            VALUES (1, ?, 'STU-AFX-001', 'Audit Fix Student', ?, 'active', NULL)
            """,
            [tenant.identifier, student_user.id],
        )
        cursor.execute(
            """
            INSERT INTO school_teacher (id, tenant_id, code, specialty, user_id, deleted_at)
            VALUES (1, ?, 'TCH-AFX-001', 'Science', ?, NULL)
            """,
            [tenant.identifier, teacher_user.id],
        )
        cursor.execute(
            """
            INSERT INTO learning_course (id, tenant_id, code, title, description, active, deleted_at)
            VALUES (1, ?, 'CRS-AFX-001', 'Audit Fix Science', 'Science content', 1, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute("INSERT INTO school_academicyear (id, code) VALUES (1, '2026')")
        cursor.execute(
            """
            INSERT INTO school_classroom (id, tenant_id, code, name, academic_year_id, lead_teacher_id, capacity, deleted_at)
            VALUES (1, ?, 'CLS-AFX-001', 'Class Audit Fix', 1, 1, 30, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            "INSERT INTO learning_courseoffering (id, course_id, classroom_id, teacher_id, deleted_at) VALUES (1, 1, 1, 1, NULL)"
        )
        cursor.execute(
            """
            INSERT INTO school_enrollment (id, tenant_id, code, student_id, classroom_id, enrollment_date, deleted_at)
            VALUES (1, ?, 'ENR-AFX-001', 1, 1, '2026-01-21', NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO school_attendancerecord (id, tenant_id, code, enrollment_id, lesson_date, status, notes, deleted_at)
            VALUES (1, ?, 'ATT-AFX-001', 1, '2026-02-12', 'present', 'Present', NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            "INSERT INTO school_teachingassignment (id, teacher_id, classroom_id, deleted_at) VALUES (1, 1, 1, NULL)"
        )
        cursor.execute(
            """
            INSERT INTO assessment_assessment (id, tenant_id, type, date, score, student_id, teaching_assignment_id, deleted_at)
            VALUES (1, ?, 'exam', '2026-03-12', 18.5, 1, 1, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO learning_lesson (id, tenant_id, title, description, scheduled_at, published, offering_id, meeting_url, recording_url, deleted_at)
            VALUES (1, ?, 'Lesson Audit Fix', 'Audit fix introduction', '2026-03-13T10:00:00', 1, 1, 'https://meeting.local/audit-fix', '', NULL)
            """,
            [tenant.identifier],
        )

    out = StringIO()
    call_command(
        "education_migration_audit",
        "--fallback-tenant",
        tenant.identifier,
        "--auto-fix",
        "--format",
        "json",
        stdout=out,
    )
    payload = json.loads(out.getvalue())

    assert payload["auto_fix"]["enabled"] is True
    assert payload["auto_fix"]["applied"] is True
    assert len(payload["auto_fix"]["divergent_before"]) >= 1
    assert payload["auto_fix"]["migration_summary"]["students"]["created"] >= 1

    segments = payload["segments"]
    assert all(segments[segment]["status"] == "MATCH" for segment in segments)
    assert payload["overview"]["status"] == "MATCH"
    assert payload["overview"]["segments_divergent"] == 0
    assert payload["overview"]["auto_fix_enabled"] is True
    assert payload["overview"]["auto_fix_applied"] is True


@pytest.mark.django_db
def test_education_migration_audit_strict_fails_when_divergent():
    _ensure_legacy_tables()
    _clear_legacy_tables()

    tenant = Tenant.objects.create(
        identifier="tn-edu-audit-strict",
        name="Tenant Education Audit Strict",
        domain="edu-audit-strict.local",
        active=True,
    )

    user_model = get_user_model()
    student_user = user_model.objects.create_user(
        username="audit_strict_student",
        email="audit_strict_student@example.com",
        password="testpass123",
        name="Audit Strict Student",
        tenant=tenant,
    )
    teacher_user = user_model.objects.create_user(
        username="audit_strict_teacher",
        email="audit_strict_teacher@example.com",
        password="testpass123",
        name="Audit Strict Teacher",
        tenant=tenant,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO academic_student (id, tenant_id, code, name, user_id, estado, deleted_at)
            VALUES (1, ?, 'STU-AST-001', 'Audit Strict Student', ?, 'active', NULL)
            """,
            [tenant.identifier, student_user.id],
        )
        cursor.execute(
            """
            INSERT INTO school_teacher (id, tenant_id, code, specialty, user_id, deleted_at)
            VALUES (1, ?, 'TCH-AST-001', 'Biology', ?, NULL)
            """,
            [tenant.identifier, teacher_user.id],
        )

    out = StringIO()
    call_command(
        "education_migration_audit",
        "--fallback-tenant",
        tenant.identifier,
        "--format",
        "json",
        stdout=out,
    )
    payload = json.loads(out.getvalue())
    assert payload["overview"]["status"] == "DIVERGENT"
    assert payload["overview"]["segments_divergent"] >= 1
    assert payload["overview"]["total_missing_in_target"] >= 1

    with pytest.raises(CommandError):
        call_command(
            "education_migration_audit",
            "--fallback-tenant",
            tenant.identifier,
            "--strict",
            "--format",
            "json",
        )


@pytest.mark.django_db
def test_education_migration_audit_output_json_written(tmp_path):
    _ensure_legacy_tables()
    _clear_legacy_tables()

    tenant = Tenant.objects.create(
        identifier="tn-edu-audit-output",
        name="Tenant Education Audit Output",
        domain="edu-audit-output.local",
        active=True,
    )

    user_model = get_user_model()
    student_user = user_model.objects.create_user(
        username="audit_output_student",
        email="audit_output_student@example.com",
        password="testpass123",
        name="Audit Output Student",
        tenant=tenant,
    )
    teacher_user = user_model.objects.create_user(
        username="audit_output_teacher",
        email="audit_output_teacher@example.com",
        password="testpass123",
        name="Audit Output Teacher",
        tenant=tenant,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO academic_student (id, tenant_id, code, name, user_id, estado, deleted_at)
            VALUES (1, ?, 'STU-AOU-001', 'Audit Output Student', ?, 'active', NULL)
            """,
            [tenant.identifier, student_user.id],
        )
        cursor.execute(
            """
            INSERT INTO school_teacher (id, tenant_id, code, specialty, user_id, deleted_at)
            VALUES (1, ?, 'TCH-AOU-001', 'History', ?, NULL)
            """,
            [tenant.identifier, teacher_user.id],
        )

    output_file = tmp_path / "audit-report.json"
    call_command(
        "education_migration_audit",
        "--fallback-tenant",
        tenant.identifier,
        "--auto-fix",
        "--output",
        str(output_file),
        "--format",
        "json",
    )

    assert output_file.exists()
    payload = json.loads(output_file.read_text(encoding="utf-8"))
    assert "segments" in payload
    assert "students" in payload["segments"]
    assert "overview" in payload
    assert payload["overview"]["status"] == "MATCH"


@pytest.mark.django_db
def test_education_migration_audit_output_markdown_written(tmp_path):
    _ensure_legacy_tables()
    _clear_legacy_tables()

    tenant = Tenant.objects.create(
        identifier="tn-edu-audit-md",
        name="Tenant Education Audit Markdown",
        domain="edu-audit-md.local",
        active=True,
    )

    user_model = get_user_model()
    student_user = user_model.objects.create_user(
        username="audit_md_student",
        email="audit_md_student@example.com",
        password="testpass123",
        name="Audit Markdown Student",
        tenant=tenant,
    )
    teacher_user = user_model.objects.create_user(
        username="audit_md_teacher",
        email="audit_md_teacher@example.com",
        password="testpass123",
        name="Audit Markdown Teacher",
        tenant=tenant,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO academic_student (id, tenant_id, code, name, user_id, estado, deleted_at)
            VALUES (1, ?, 'STU-AMD-001', 'Audit Markdown Student', ?, 'active', NULL)
            """,
            [tenant.identifier, student_user.id],
        )
        cursor.execute(
            """
            INSERT INTO school_teacher (id, tenant_id, code, specialty, user_id, deleted_at)
            VALUES (1, ?, 'TCH-AMD-001', 'Geography', ?, NULL)
            """,
            [tenant.identifier, teacher_user.id],
        )

    output_file = tmp_path / "audit-report.md"
    out = StringIO()
    call_command(
        "education_migration_audit",
        "--fallback-tenant",
        tenant.identifier,
        "--auto-fix",
        "--output-markdown",
        str(output_file),
        "--format",
        "markdown",
        stdout=out,
    )

    assert output_file.exists()
    report = output_file.read_text(encoding="utf-8")
    assert "# Education Migration Audit" in report
    assert "## Overview" in report
    assert "## Segment Status" in report
    assert "| Segment | Status | Expected | Actual | Missing | Extra |" in report
    assert "# Education Migration Audit" in out.getvalue()
