from __future__ import annotations

from typing import Any

from apps.education.models import AttendanceRecord, Classroom, Course, Enrollment, GradeRecord, StudentProfile, TeacherProfile
from security.permissions.rbac import GROUPS as RBAC_GROUPS

from .base import AiTool, AiToolContext


class EducationSummaryTool(AiTool):
    name = "get_education_summary"
    description_pt = "Resume estudantes, matrículas, turmas, professores, presenças e avaliações."
    description_en = "Summarizes students, enrollments, classrooms, teachers, attendance and grades."
    required_groups = (
        RBAC_GROUPS["ADMIN"],
        RBAC_GROUPS["PROFESSOR"],
        RBAC_GROUPS["DIRETOR_ESCOLA"],
        RBAC_GROUPS["DIRETOR_ADJUNTO_PEDAGOGICO"],
    )
    mode = "read"

    def run(self, context: AiToolContext) -> dict[str, Any]:
        tenant = context.tenant
        return {
            "summary": {
                "title_pt": "Resumo escolar operacional",
                "title_en": "Education operational summary",
                "metrics": [
                    {"label_pt": "Estudantes activos", "label_en": "Active students", "value": StudentProfile.objects.filter(tenant=tenant, deleted=False, status=StudentProfile.Status.ACTIVE).count()},
                    {"label_pt": "Professores", "label_en": "Teachers", "value": TeacherProfile.objects.filter(tenant=tenant, deleted=False).count()},
                    {"label_pt": "Cursos", "label_en": "Courses", "value": Course.objects.filter(tenant=tenant, deleted=False).count()},
                    {"label_pt": "Turmas", "label_en": "Classrooms", "value": Classroom.objects.filter(tenant=tenant, deleted=False).count()},
                    {"label_pt": "Matrículas activas", "label_en": "Active enrollments", "value": Enrollment.objects.filter(tenant=tenant, deleted=False, status=Enrollment.Status.ACTIVE).count()},
                    {"label_pt": "Registos de presença", "label_en": "Attendance records", "value": AttendanceRecord.objects.filter(tenant=tenant, deleted=False).count()},
                    {"label_pt": "Avaliações", "label_en": "Grades", "value": GradeRecord.objects.filter(tenant=tenant, deleted=False).count()},
                ],
            },
            "sources": [
                {"type": "model", "label": "StudentProfile", "href": "/education"},
                {"type": "model", "label": "Enrollment", "href": "/education"},
                {"type": "model", "label": "GradeRecord", "href": "/education"},
            ],
        }
