from io import StringIO
import json
import sqlite3

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connection
import pytest

from apps.education.models import (
    AttendanceRecord,
    Classroom,
    Course,
    Enrollment,
    Examination,
    GradeRecord,
    LearningContent,
    StudentProfile,
    TeacherProfile,
)
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


def _seed_external_legacy_db(path: str, *, tenant_identifier: str, student_user_id: int, teacher_user_id: int):
    conn = sqlite3.connect(path)
    try:
        cursor = conn.cursor()
        cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS academic_student (
                id INTEGER PRIMARY KEY,
                tenant_id TEXT,
                code TEXT,
                name TEXT,
                user_id INTEGER,
                estado TEXT,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS school_teacher (
                id INTEGER PRIMARY KEY,
                tenant_id TEXT,
                code TEXT,
                specialty TEXT,
                user_id INTEGER,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS learning_course (
                id INTEGER PRIMARY KEY,
                tenant_id TEXT,
                code TEXT,
                title TEXT,
                description TEXT,
                active INTEGER,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS school_academicyear (
                id INTEGER PRIMARY KEY,
                code TEXT
            );
            CREATE TABLE IF NOT EXISTS school_classroom (
                id INTEGER PRIMARY KEY,
                tenant_id TEXT,
                code TEXT,
                name TEXT,
                academic_year_id INTEGER,
                lead_teacher_id INTEGER,
                capacity INTEGER,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS learning_courseoffering (
                id INTEGER PRIMARY KEY,
                course_id INTEGER,
                classroom_id INTEGER,
                teacher_id INTEGER,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS school_enrollment (
                id INTEGER PRIMARY KEY,
                tenant_id TEXT,
                code TEXT,
                student_id INTEGER,
                classroom_id INTEGER,
                enrollment_date TEXT,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS school_attendancerecord (
                id INTEGER PRIMARY KEY,
                tenant_id TEXT,
                code TEXT,
                enrollment_id INTEGER,
                lesson_date TEXT,
                status TEXT,
                notes TEXT,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS school_teachingassignment (
                id INTEGER PRIMARY KEY,
                teacher_id INTEGER,
                classroom_id INTEGER,
                deleted_at TEXT
            );
            CREATE TABLE IF NOT EXISTS assessment_assessment (
                id INTEGER PRIMARY KEY,
                tenant_id TEXT,
                type TEXT,
                date TEXT,
                score REAL,
                student_id INTEGER,
                teaching_assignment_id INTEGER,
                deleted_at TEXT
            );
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
            );
            """
        )
        cursor.execute("DELETE FROM academic_student")
        cursor.execute("DELETE FROM school_teacher")
        cursor.execute("DELETE FROM learning_course")
        cursor.execute("DELETE FROM school_academicyear")
        cursor.execute("DELETE FROM school_classroom")
        cursor.execute("DELETE FROM learning_courseoffering")
        cursor.execute("DELETE FROM school_enrollment")
        cursor.execute("DELETE FROM school_attendancerecord")
        cursor.execute("DELETE FROM school_teachingassignment")
        cursor.execute("DELETE FROM assessment_assessment")
        cursor.execute("DELETE FROM learning_lesson")

        cursor.execute(
            """
            INSERT INTO academic_student (id, tenant_id, code, name, user_id, estado, deleted_at)
            VALUES (1, ?, 'STU-LEG-EXT-001', 'Legacy Student External', ?, 'active', NULL)
            """,
            [tenant_identifier, student_user_id],
        )
        cursor.execute(
            """
            INSERT INTO school_teacher (id, tenant_id, code, specialty, user_id, deleted_at)
            VALUES (1, ?, 'TCH-LEG-EXT-001', 'Physics', ?, NULL)
            """,
            [tenant_identifier, teacher_user_id],
        )
        cursor.execute(
            """
            INSERT INTO learning_course (id, tenant_id, code, title, description, active, deleted_at)
            VALUES (1, ?, 'CRS-LEG-EXT-001', 'Legacy Physics', 'Physics content', 1, NULL)
            """,
            [tenant_identifier],
        )
        cursor.execute("INSERT INTO school_academicyear (id, code) VALUES (1, '2026')")
        cursor.execute(
            """
            INSERT INTO school_classroom (id, tenant_id, code, name, academic_year_id, lead_teacher_id, capacity, deleted_at)
            VALUES (1, ?, 'CLS-LEG-EXT-001', 'Class Ext', 1, 1, 25, NULL)
            """,
            [tenant_identifier],
        )
        cursor.execute(
            "INSERT INTO learning_courseoffering (id, course_id, classroom_id, teacher_id, deleted_at) VALUES (1, 1, 1, 1, NULL)"
        )
        cursor.execute(
            """
            INSERT INTO school_enrollment (id, tenant_id, code, student_id, classroom_id, enrollment_date, deleted_at)
            VALUES (1, ?, 'ENR-LEG-EXT-001', 1, 1, '2026-01-15', NULL)
            """,
            [tenant_identifier],
        )
        cursor.execute(
            """
            INSERT INTO school_attendancerecord (id, tenant_id, code, enrollment_id, lesson_date, status, notes, deleted_at)
            VALUES (1, ?, 'ATT-LEG-EXT-001', 1, '2026-02-10', 'present', 'Present external', NULL)
            """,
            [tenant_identifier],
        )
        cursor.execute("INSERT INTO school_teachingassignment (id, teacher_id, classroom_id, deleted_at) VALUES (1, 1, 1, NULL)")
        cursor.execute(
            """
            INSERT INTO assessment_assessment (id, tenant_id, type, date, score, student_id, teaching_assignment_id, deleted_at)
            VALUES (1, ?, 'exam', '2026-03-10', 18.0, 1, 1, NULL)
            """,
            [tenant_identifier],
        )
        cursor.execute(
            """
            INSERT INTO learning_lesson (id, tenant_id, title, description, scheduled_at, published, offering_id, meeting_url, recording_url, deleted_at)
            VALUES (1, ?, 'Lesson Ext', 'External introduction', '2026-03-12T10:00:00', 1, 1, 'https://meeting.local/ext', '', NULL)
            """,
            [tenant_identifier],
        )
        conn.commit()
    finally:
        conn.close()


@pytest.mark.django_db
def test_education_migrate_legacy_apply_migrates_minimal_dataset():
    _ensure_legacy_tables()
    _clear_legacy_tables()

    tenant = Tenant.objects.create(
        identifier="tn-legacy-cmd",
        name="Tenant Legacy Command",
        domain="legacy-command.local",
        active=True,
    )
    user_model = get_user_model()
    student_user = user_model.objects.create_user(
        username="legacy_student",
        email="legacy_student@example.com",
        password="testpass123",
        name="Legacy Student",
        tenant=tenant,
    )
    teacher_user = user_model.objects.create_user(
        username="legacy_teacher",
        email="legacy_teacher@example.com",
        password="testpass123",
        name="Legacy Teacher",
        tenant=tenant,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO academic_student (id, tenant_id, code, name, user_id, estado, deleted_at)
            VALUES (1, ?, 'STU-LEG-001', 'Legacy Student', ?, 'active', NULL)
            """,
            [tenant.identifier, student_user.id],
        )
        cursor.execute(
            """
            INSERT INTO school_teacher (id, tenant_id, code, specialty, user_id, deleted_at)
            VALUES (1, ?, 'TCH-LEG-001', 'Mathematics', ?, NULL)
            """,
            [tenant.identifier, teacher_user.id],
        )
        cursor.execute(
            """
            INSERT INTO learning_course (id, tenant_id, code, title, description, active, deleted_at)
            VALUES (1, ?, 'CRS-LEG-001', 'Legacy Mathematics', 'Core math content', 1, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute("INSERT INTO school_academicyear (id, code) VALUES (1, '2026')")
        cursor.execute(
            """
            INSERT INTO school_classroom (id, tenant_id, code, name, academic_year_id, lead_teacher_id, capacity, deleted_at)
            VALUES (1, ?, 'CLS-LEG-001', 'Class A', 1, 1, 30, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO learning_courseoffering (id, course_id, classroom_id, teacher_id, deleted_at)
            VALUES (1, 1, 1, 1, NULL)
            """
        )
        cursor.execute(
            """
            INSERT INTO school_enrollment (id, tenant_id, code, student_id, classroom_id, enrollment_date, deleted_at)
            VALUES (1, ?, 'ENR-LEG-001', 1, 1, '2026-01-10', NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO school_attendancerecord (id, tenant_id, code, enrollment_id, lesson_date, status, notes, deleted_at)
            VALUES (1, ?, 'ATT-LEG-001', 1, '2026-02-01', 'present', 'On time', NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO school_teachingassignment (id, teacher_id, classroom_id, deleted_at)
            VALUES (1, 1, 1, NULL)
            """
        )
        cursor.execute(
            """
            INSERT INTO assessment_assessment (id, tenant_id, type, date, score, student_id, teaching_assignment_id, deleted_at)
            VALUES (1, ?, 'exam', '2026-03-01', 17.5, 1, 1, NULL)
            """,
            [tenant.identifier],
        )
        cursor.execute(
            """
            INSERT INTO learning_lesson (id, tenant_id, title, description, scheduled_at, published, offering_id, meeting_url, recording_url, deleted_at)
            VALUES (1, ?, 'Lesson 1', 'Introduction', '2026-03-02T10:00:00', 1, 1, 'https://meeting.local/1', '', NULL)
            """,
            [tenant.identifier],
        )

    out = StringIO()
    call_command(
        "education_migrate_legacy",
        "--apply",
        "--fallback-tenant",
        tenant.identifier,
        "--format",
        "json",
        stdout=out,
    )
    payload = json.loads(out.getvalue())

    assert payload["apply"] is True
    assert payload["summary"]["students"]["created"] >= 1
    assert payload["summary"]["teachers"]["created"] >= 1
    assert payload["summary"]["courses"]["created"] >= 1
    assert payload["summary"]["classrooms"]["created"] >= 1
    assert payload["summary"]["enrollments"]["created"] >= 1
    assert payload["summary"]["examinations"]["created"] >= 1

    student_profile = StudentProfile.objects.get(tenant=tenant, user=student_user)
    teacher_profile = TeacherProfile.objects.get(tenant=tenant, user=teacher_user)
    course = Course.objects.get(tenant=tenant, code="CRS-LEG-001")
    classroom = Classroom.objects.get(tenant=tenant, course=course, name="Class A")
    enrollment = Enrollment.objects.get(tenant=tenant, student=student_profile, classroom=classroom)
    examination = Examination.objects.get(tenant=tenant, course=course, classroom=classroom, title="EXAM 2026-03-01 TA#1")
    attendance = AttendanceRecord.objects.get(tenant=tenant, enrollment=enrollment, attendance_date="2026-02-01")
    grade = GradeRecord.objects.get(tenant=tenant, enrollment=enrollment, component="EXAM")
    content = LearningContent.objects.get(tenant=tenant, course=course, title="Lesson 1")

    assert teacher_profile.specialty == "Mathematics"
    assert examination.max_score == 20
    assert attendance.status == AttendanceRecord.Status.PRESENT
    assert str(grade.score) == "17.50"
    assert content.published is True


@pytest.mark.django_db
def test_education_migrate_legacy_apply_from_external_sqlite(tmp_path):
    tenant = Tenant.objects.create(
        identifier="tn-legacy-external",
        name="Tenant Legacy External",
        domain="legacy-external.local",
        active=True,
    )
    user_model = get_user_model()
    student_user = user_model.objects.create_user(
        username="legacy_external_student",
        email="legacy_external_student@example.com",
        password="testpass123",
        name="Legacy External Student",
        tenant=tenant,
    )
    teacher_user = user_model.objects.create_user(
        username="legacy_external_teacher",
        email="legacy_external_teacher@example.com",
        password="testpass123",
        name="Legacy External Teacher",
        tenant=tenant,
    )

    legacy_db = tmp_path / "legacy_schoolar.sqlite3"
    _seed_external_legacy_db(
        str(legacy_db),
        tenant_identifier=tenant.identifier,
        student_user_id=student_user.id,
        teacher_user_id=teacher_user.id,
    )

    out = StringIO()
    call_command(
        "education_migrate_legacy",
        "--legacy-db",
        str(legacy_db),
        "--apply",
        "--fallback-tenant",
        tenant.identifier,
        "--format",
        "json",
        stdout=out,
    )
    payload = json.loads(out.getvalue())

    assert payload["apply"] is True
    assert payload["summary"]["students"]["created"] >= 1
    assert payload["summary"]["teachers"]["created"] >= 1
    assert payload["summary"]["examinations"]["created"] >= 1

    student_profile = StudentProfile.objects.get(tenant=tenant, user=student_user)
    teacher_profile = TeacherProfile.objects.get(tenant=tenant, user=teacher_user)
    course = Course.objects.get(tenant=tenant, code="CRS-LEG-EXT-001")
    classroom = Classroom.objects.get(tenant=tenant, course=course, name="Class Ext")
    enrollment = Enrollment.objects.get(tenant=tenant, student=student_profile, classroom=classroom)
    examination = Examination.objects.get(tenant=tenant, course=course, classroom=classroom, title="EXAM 2026-03-10 TA#1")
    attendance = AttendanceRecord.objects.get(tenant=tenant, enrollment=enrollment, attendance_date="2026-02-10")
    grade = GradeRecord.objects.get(tenant=tenant, enrollment=enrollment, component="EXAM")
    content = LearningContent.objects.get(tenant=tenant, course=course, title="Lesson Ext")

    assert teacher_profile.specialty == "Physics"
    assert examination.max_score == 20
    assert attendance.status == AttendanceRecord.Status.PRESENT
    assert str(grade.score) == "18.00"
    assert content.published is True
