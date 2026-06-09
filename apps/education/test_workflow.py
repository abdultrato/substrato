from __future__ import annotations

from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from apps.education.models import Classroom, Course, Enrollment, StudentProfile
from apps.tenants.models.tenant import Tenant
from services.education.academic_service import AcademicService


def _tenant():
    s = uuid4().hex[:8]
    return Tenant.objects.create(identifier=f"tn-edu-{s}", name="Tenant Edu", domain=f"{s}.local", active=True)


def _student(tenant):
    u = get_user_model().objects.create_user(
        username=f"stu-{uuid4().hex[:6]}", email=f"{uuid4().hex[:6]}@ex.com",
        password="testpass123", name="Estudante", tenant=tenant,
    )
    return StudentProfile.objects.create(tenant=tenant, user=u, student_code=f"STU-{uuid4().hex[:5]}")


def _course(tenant, *, status=Course.Status.DRAFT):
    return Course.objects.create(tenant=tenant, name="Matemática", code=f"C-{uuid4().hex[:5]}", status=status)


def _enrollment(tenant, *, status=Enrollment.Status.PENDING):
    classroom = Classroom.objects.create(
        tenant=tenant, name="10A", course=_course(tenant, status=Course.Status.ACTIVE),
        academic_year="2026", capacity=35,
    )
    return Enrollment.objects.create(tenant=tenant, student=_student(tenant), classroom=classroom, status=status)


@pytest.mark.django_db
def test_course_activate_then_archive():
    tenant = _tenant()
    course = _course(tenant)
    assert course.status == Course.Status.DRAFT

    AcademicService.activate_course(course=course)
    assert course.status == Course.Status.ACTIVE

    AcademicService.archive_course(course=course)
    assert course.status == Course.Status.ARCHIVED


@pytest.mark.django_db
def test_enrollment_activate_then_complete():
    tenant = _tenant()
    enrollment = _enrollment(tenant)
    AcademicService.activate_enrollment(enrollment=enrollment)
    assert enrollment.status == Enrollment.Status.ACTIVE
    assert enrollment.enrolled_on is not None

    AcademicService.complete_enrollment(enrollment=enrollment)
    assert enrollment.status == Enrollment.Status.COMPLETED
    assert enrollment.closed_on is not None


@pytest.mark.django_db
def test_complete_requires_active_enrollment():
    tenant = _tenant()
    enrollment = _enrollment(tenant)  # PENDING
    with pytest.raises(ValidationError):
        AcademicService.complete_enrollment(enrollment=enrollment)


@pytest.mark.django_db
def test_cancel_enrollment_blocks_when_terminal():
    tenant = _tenant()
    enrollment = _enrollment(tenant)
    AcademicService.cancel_enrollment(enrollment=enrollment)
    assert enrollment.status == Enrollment.Status.CANCELLED
    with pytest.raises(ValidationError):
        AcademicService.cancel_enrollment(enrollment=enrollment)
