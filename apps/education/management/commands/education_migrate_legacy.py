from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time
from decimal import Decimal
import json
from pathlib import Path
import sqlite3

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone

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


class Command(BaseCommand):
    help = (
        "Migrates legacy Schoolar-S data from legacy tables into the new education "
        "domain models. Use --apply to persist changes; without it, runs preview only."
    )

    SEGMENTS = (
        "students",
        "teachers",
        "courses",
        "classrooms",
        "enrollments",
        "examinations",
        "attendance",
        "grades",
        "content",
    )

    LEGACY_TABLES = {
        "students": "academic_student",
        "teachers": "school_teacher",
        "courses": "learning_course",
        "classrooms": "school_classroom",
        "enrollments": "school_enrollment",
        "examinations": "assessment_assessment",
        "attendance": "school_attendancerecord",
        "grades": "assessment_assessment",
        "content": "learning_lesson",
        "years": "school_academicyear",
        "offerings": "learning_courseoffering",
        "teaching_assignments": "school_teachingassignment",
    }

    STUDENT_STATUS_MAP = {
        "active": StudentProfile.Status.ACTIVE,
        "graduado": StudentProfile.Status.INACTIVE,
        "transferido": StudentProfile.Status.INACTIVE,
        "retido": StudentProfile.Status.SUSPENDED,
    }

    ATTENDANCE_STATUS_MAP = {
        "present": AttendanceRecord.Status.PRESENT,
        "late": AttendanceRecord.Status.LATE,
        "absent": AttendanceRecord.Status.ABSENT,
        "justified_absence": AttendanceRecord.Status.EXCUSED,
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist data. Without this flag, command only prints preview.",
        )
        parser.add_argument(
            "--fallback-tenant",
            default="",
            help="Tenant identifier or id to use when legacy tenant cannot be resolved.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limit rows per segment during migration (0 = no limit).",
        )
        parser.add_argument(
            "--format",
            choices=["text", "json"],
            default="text",
            help="Output format.",
        )
        parser.add_argument(
            "--legacy-db",
            default="",
            help="Optional path to legacy Schoolar-S SQLite DB file.",
        )

    def handle(self, *args, **options):
        apply_changes = bool(options["apply"])
        row_limit = max(0, int(options["limit"] or 0))
        fallback_tenant = self._resolve_tenant(options["fallback_tenant"]) if options["fallback_tenant"] else None
        legacy_db_path = str(options.get("legacy_db") or "").strip()
        legacy_conn = None

        if legacy_db_path:
            path = Path(legacy_db_path)
            if not path.exists():
                raise CommandError(f"Legacy DB file not found: {legacy_db_path}")
            legacy_conn = sqlite3.connect(str(path))
            legacy_conn.row_factory = sqlite3.Row

        context = {
            "apply": apply_changes,
            "limit": row_limit,
            "fallback_tenant": getattr(fallback_tenant, "identifier", ""),
            "summary": {segment: {"source_rows": 0, "created": 0, "updated": 0, "skipped": 0} for segment in self.SEGMENTS},
            "errors": [],
            "warnings": [],
            "warnings_seen": set(),
            "table_names": self._list_table_names(legacy_conn),
            "table_columns_cache": {},
            "tenant_cache": {},
            "legacy_conn": legacy_conn,
            "legacy_to_new": {segment: {} for segment in ("students", "teachers", "courses", "classrooms", "enrollments")},
            "lookups": {},
        }

        try:
            if options["fallback_tenant"] and fallback_tenant is None:
                raise CommandError("Fallback tenant was provided but could not be resolved.")

            self._load_legacy_support_lookups(context)

            preview = self._build_preview(context, row_limit)
            if not apply_changes:
                payload = {
                    "mode": "preview",
                    "apply": False,
                    "limit": row_limit,
                    "fallback_tenant": context["fallback_tenant"],
                    "segments": preview,
                    "warnings": context["warnings"],
                }
                self._emit(payload, options["format"])
                return

            with transaction.atomic():
                self._migrate_students(context, fallback_tenant, row_limit)
                self._migrate_teachers(context, fallback_tenant, row_limit)
                self._migrate_courses(context, fallback_tenant, row_limit)
                self._migrate_classrooms(context, fallback_tenant, row_limit)
                self._migrate_enrollments(context, fallback_tenant, row_limit)
                self._migrate_examinations(context, fallback_tenant, row_limit)
                self._migrate_attendance(context, fallback_tenant, row_limit)
                self._migrate_grades(context, fallback_tenant, row_limit)
                self._migrate_content(context, fallback_tenant, row_limit)

            payload = {
                "mode": "apply",
                "apply": True,
                "limit": row_limit,
                "fallback_tenant": context["fallback_tenant"],
                "summary": context["summary"],
                "warnings": context["warnings"],
                "errors": context["errors"],
            }
            self._emit(payload, options["format"])
        finally:
            if legacy_conn is not None:
                legacy_conn.close()

    def _build_preview(self, context: dict, row_limit: int) -> dict[str, dict[str, int]]:
        result: dict[str, dict[str, int]] = {}
        for segment in self.SEGMENTS:
            rows = self._fetch_rows(context, self.LEGACY_TABLES[segment], row_limit=row_limit)
            result[segment] = {
                "source_rows": len(rows),
                "target_rows": self._count_target_rows(segment),
            }
        return result

    @staticmethod
    def _count_target_rows(segment: str) -> int:
        model_map = {
            "students": StudentProfile,
            "teachers": TeacherProfile,
            "courses": Course,
            "classrooms": Classroom,
            "enrollments": Enrollment,
            "examinations": Examination,
            "attendance": AttendanceRecord,
            "grades": GradeRecord,
            "content": LearningContent,
        }
        return model_map[segment].objects.filter(deleted=False).count()

    def _emit(self, payload: dict, output_format: str) -> None:
        if output_format == "json":
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
            return

        self.stdout.write(self.style.SUCCESS(f"Education legacy migration ({payload['mode']})"))
        self.stdout.write(f"apply={payload.get('apply')} fallback_tenant={payload.get('fallback_tenant') or '-'}")
        self.stdout.write("")

        if payload["mode"] == "preview":
            segments = payload.get("segments", {})
            self.stdout.write("segment       source_rows  target_rows")
            self.stdout.write("------------  -----------  -----------")
            for segment in self.SEGMENTS:
                data = segments.get(segment, {})
                self.stdout.write(f"{segment:<12}  {int(data.get('source_rows', 0)):>11}  {int(data.get('target_rows', 0)):>11}")
        else:
            summary = payload.get("summary", {})
            self.stdout.write("segment       source_rows  created  updated  skipped")
            self.stdout.write("------------  -----------  -------  -------  -------")
            for segment in self.SEGMENTS:
                data = summary.get(segment, {})
                self.stdout.write(
                    f"{segment:<12}  {int(data.get('source_rows', 0)):>11}  "
                    f"{int(data.get('created', 0)):>7}  {int(data.get('updated', 0)):>7}  {int(data.get('skipped', 0)):>7}"
                )

        warnings = payload.get("warnings") or []
        errors = payload.get("errors") or []
        if warnings:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Warnings:"))
            for warning in warnings:
                self.stdout.write(f"- {warning}")
        if errors:
            self.stdout.write("")
            self.stdout.write(self.style.ERROR("Errors:"))
            for err in errors:
                self.stdout.write(f"- {err}")

    def _load_legacy_support_lookups(self, context: dict) -> None:
        years = self._fetch_rows(context, self.LEGACY_TABLES["years"])
        offerings = self._fetch_rows(context, self.LEGACY_TABLES["offerings"])
        teaching_assignments = self._fetch_rows(context, self.LEGACY_TABLES["teaching_assignments"])

        year_code_by_id: dict[int, str] = {}
        for row in years:
            row_id = self._int_or_none(row.get("id"))
            if row_id is None:
                continue
            code = str(row.get("code") or "").strip()
            if code:
                year_code_by_id[row_id] = code

        classroom_course_by_id: dict[int, int] = {}
        offering_course_by_id: dict[int, int] = {}
        offering_teacher_by_id: dict[int, int] = {}
        for row in offerings:
            offering_id = self._int_or_none(row.get("id"))
            course_id = self._int_or_none(row.get("course_id"))
            classroom_id = self._int_or_none(row.get("classroom_id"))
            teacher_id = self._int_or_none(row.get("teacher_id"))
            if offering_id is not None and course_id is not None:
                offering_course_by_id[offering_id] = course_id
            if offering_id is not None and teacher_id is not None:
                offering_teacher_by_id[offering_id] = teacher_id
            if classroom_id is not None and course_id is not None and classroom_id not in classroom_course_by_id:
                classroom_course_by_id[classroom_id] = course_id

        assignment_by_id: dict[int, dict[str, int | None]] = {}
        for row in teaching_assignments:
            assignment_id = self._int_or_none(row.get("id"))
            if assignment_id is None:
                continue
            assignment_by_id[assignment_id] = {
                "teacher_id": self._int_or_none(row.get("teacher_id")),
                "classroom_id": self._int_or_none(row.get("classroom_id")),
            }

        context["lookups"] = {
            "year_code_by_id": year_code_by_id,
            "classroom_course_by_id": classroom_course_by_id,
            "offering_course_by_id": offering_course_by_id,
            "offering_teacher_by_id": offering_teacher_by_id,
            "assignment_by_id": assignment_by_id,
        }

    def _migrate_students(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["students"], row_limit=row_limit)
        context["summary"]["students"]["source_rows"] = len(rows)
        user_model = get_user_model()

        for row in rows:
            legacy_id = self._int_or_none(row.get("id"))
            user_id = self._int_or_none(row.get("user_id"))
            user = user_model.objects.filter(id=user_id).first() if user_id is not None else None
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant, user=user)

            if legacy_id is None or user is None or tenant is None:
                context["summary"]["students"]["skipped"] += 1
                continue

            status = self.STUDENT_STATUS_MAP.get(str(row.get("estado") or "").strip().lower(), StudentProfile.Status.ACTIVE)
            student_code = self._safe_code(row.get("code"), prefix="LEG-STU", source_id=legacy_id)

            obj, created = StudentProfile.objects.get_or_create(
                tenant=tenant,
                user=user,
                defaults={
                    "student_code": student_code,
                    "status": status,
                },
            )
            changed = False
            if not created:
                if obj.student_code != student_code:
                    obj.student_code = student_code
                    changed = True
                if obj.status != status:
                    obj.status = status
                    changed = True
                if changed:
                    obj.save(update_fields=["student_code", "status", "updated_at"])

            context["legacy_to_new"]["students"][legacy_id] = obj.id
            context["summary"]["students"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_teachers(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["teachers"], row_limit=row_limit)
        context["summary"]["teachers"]["source_rows"] = len(rows)
        user_model = get_user_model()

        for row in rows:
            legacy_id = self._int_or_none(row.get("id"))
            user_id = self._int_or_none(row.get("user_id"))
            user = user_model.objects.filter(id=user_id).first() if user_id is not None else None
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant, user=user)

            if legacy_id is None or user is None or tenant is None:
                context["summary"]["teachers"]["skipped"] += 1
                continue

            teacher_code = self._safe_code(row.get("code"), prefix="LEG-TCH", source_id=legacy_id)
            specialty = str(row.get("specialty") or "").strip()

            obj, created = TeacherProfile.objects.get_or_create(
                tenant=tenant,
                user=user,
                defaults={
                    "teacher_code": teacher_code,
                    "specialty": specialty,
                    "status": TeacherProfile.Status.ACTIVE,
                },
            )
            changed = False
            if not created:
                if obj.teacher_code != teacher_code:
                    obj.teacher_code = teacher_code
                    changed = True
                if specialty and obj.specialty != specialty:
                    obj.specialty = specialty
                    changed = True
                if obj.status != TeacherProfile.Status.ACTIVE:
                    obj.status = TeacherProfile.Status.ACTIVE
                    changed = True
                if changed:
                    obj.save(update_fields=["teacher_code", "specialty", "status", "updated_at"])

            context["legacy_to_new"]["teachers"][legacy_id] = obj.id
            context["summary"]["teachers"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_courses(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["courses"], row_limit=row_limit)
        context["summary"]["courses"]["source_rows"] = len(rows)

        for row in rows:
            legacy_id = self._int_or_none(row.get("id"))
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            if legacy_id is None or tenant is None:
                context["summary"]["courses"]["skipped"] += 1
                continue

            title = str(row.get("title") or "").strip() or f"Legacy Course {legacy_id}"
            code = self._safe_code(row.get("code"), prefix="LEG-CRS", source_id=legacy_id)
            description = str(row.get("description") or "").strip()
            active_raw = row.get("active")
            status = Course.Status.ACTIVE if self._truthy(active_raw) else Course.Status.ARCHIVED

            obj, created = Course.objects.get_or_create(
                tenant=tenant,
                code=code,
                defaults={
                    "name": title,
                    "description": description,
                    "status": status,
                },
            )
            changed = False
            if not created:
                if obj.name != title:
                    obj.name = title
                    changed = True
                if obj.description != description:
                    obj.description = description
                    changed = True
                if obj.status != status:
                    obj.status = status
                    changed = True
                if changed:
                    obj.save(update_fields=["name", "description", "status", "updated_at"])

            context["legacy_to_new"]["courses"][legacy_id] = obj.id
            context["summary"]["courses"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_classrooms(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["classrooms"], row_limit=row_limit)
        context["summary"]["classrooms"]["source_rows"] = len(rows)
        lookups = context["lookups"]
        year_code_by_id: dict[int, str] = lookups["year_code_by_id"]
        classroom_course_by_id: dict[int, int] = lookups["classroom_course_by_id"]

        for row in rows:
            legacy_id = self._int_or_none(row.get("id"))
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            if legacy_id is None or tenant is None:
                context["summary"]["classrooms"]["skipped"] += 1
                continue

            old_course_id = classroom_course_by_id.get(legacy_id)
            new_course = self._resolve_migrated_obj(Course, context["legacy_to_new"]["courses"], old_course_id)
            if new_course is None:
                context["summary"]["classrooms"]["skipped"] += 1
                continue

            old_teacher_id = self._int_or_none(row.get("lead_teacher_id")) or self._int_or_none(row.get("teacher_id"))
            homeroom_teacher = self._resolve_migrated_obj(
                TeacherProfile,
                context["legacy_to_new"]["teachers"],
                old_teacher_id,
            )

            year_id = self._int_or_none(row.get("academic_year_id"))
            academic_year = year_code_by_id.get(year_id or -1, "").strip() or str(row.get("academic_year") or "").strip()
            if not academic_year:
                academic_year = str(datetime.now(tz=timezone.utc).year)

            name = str(row.get("name") or "").strip() or f"Legacy Classroom {legacy_id}"
            capacity = self._int_or_none(row.get("capacity")) or 40
            if capacity <= 0:
                capacity = 40

            obj, created = Classroom.objects.get_or_create(
                tenant=tenant,
                course=new_course,
                name=name,
                academic_year=academic_year,
                defaults={
                    "capacity": capacity,
                    "homeroom_teacher": homeroom_teacher,
                },
            )
            changed = False
            if not created:
                if obj.capacity != capacity:
                    obj.capacity = capacity
                    changed = True
                if homeroom_teacher and obj.homeroom_teacher_id != homeroom_teacher.id:
                    obj.homeroom_teacher = homeroom_teacher
                    changed = True
                if changed:
                    obj.save(update_fields=["capacity", "homeroom_teacher", "updated_at"])

            context["legacy_to_new"]["classrooms"][legacy_id] = obj.id
            context["summary"]["classrooms"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_enrollments(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["enrollments"], row_limit=row_limit)
        context["summary"]["enrollments"]["source_rows"] = len(rows)

        for row in rows:
            legacy_id = self._int_or_none(row.get("id"))
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            old_student_id = self._int_or_none(row.get("student_id"))
            old_classroom_id = self._int_or_none(row.get("classroom_id"))
            student = self._resolve_migrated_obj(StudentProfile, context["legacy_to_new"]["students"], old_student_id)
            classroom = self._resolve_migrated_obj(Classroom, context["legacy_to_new"]["classrooms"], old_classroom_id)

            if legacy_id is None or tenant is None or student is None or classroom is None:
                context["summary"]["enrollments"]["skipped"] += 1
                continue

            enrolled_on = self._to_date(row.get("enrollment_date")) or timezone.localdate()
            obj, created = Enrollment.objects.get_or_create(
                tenant=tenant,
                student=student,
                classroom=classroom,
                defaults={
                    "status": Enrollment.Status.ACTIVE,
                    "enrolled_on": enrolled_on,
                },
            )
            changed = False
            if not created:
                if obj.status != Enrollment.Status.ACTIVE:
                    obj.status = Enrollment.Status.ACTIVE
                    changed = True
                if obj.enrolled_on != enrolled_on:
                    obj.enrolled_on = enrolled_on
                    changed = True
                if changed:
                    obj.save(update_fields=["status", "enrolled_on", "updated_at"])

            context["legacy_to_new"]["enrollments"][legacy_id] = obj.id
            context["summary"]["enrollments"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_examinations(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["examinations"], row_limit=row_limit)
        context["summary"]["examinations"]["source_rows"] = len(rows)
        assignment_by_id = context["lookups"]["assignment_by_id"]

        grouped: dict[tuple[int, int, date, str], dict] = {}
        for row in rows:
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            assignment_id = self._int_or_none(row.get("teaching_assignment_id"))
            exam_date = self._to_date(row.get("date"))
            exam_type = str(row.get("type") or "").strip().upper()
            if tenant is None or assignment_id is None or exam_date is None or not exam_type:
                context["summary"]["examinations"]["skipped"] += 1
                continue

            key = (tenant.id, assignment_id, exam_date, exam_type)
            grouped.setdefault(key, row)

        for key in grouped:
            tenant_id, assignment_id, exam_date, exam_type = key
            tenant = Tenant.objects.filter(id=tenant_id).first()
            assignment = assignment_by_id.get(assignment_id, {})
            old_classroom_id = assignment.get("classroom_id")
            classroom = self._resolve_migrated_obj(
                Classroom,
                context["legacy_to_new"]["classrooms"],
                old_classroom_id if isinstance(old_classroom_id, int) else None,
            )
            if tenant is None or classroom is None:
                context["summary"]["examinations"]["skipped"] += 1
                continue

            course = classroom.course
            scheduled_for = timezone.make_aware(datetime.combine(exam_date, time(hour=12, minute=0)))
            title = f"{exam_type} {exam_date.isoformat()} TA#{assignment_id}"
            if len(title) > 180:
                title = title[:180]

            obj, created = Examination.objects.get_or_create(
                tenant=tenant,
                course=course,
                classroom=classroom,
                title=title,
                scheduled_for=scheduled_for,
                defaults={
                    "max_score": Decimal("20.00"),
                },
            )
            changed = False
            if not created:
                if obj.max_score != Decimal("20.00"):
                    obj.max_score = Decimal("20.00")
                    changed = True
                if changed:
                    obj.save(update_fields=["max_score", "updated_at"])

            context["summary"]["examinations"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_attendance(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["attendance"], row_limit=row_limit)
        context["summary"]["attendance"]["source_rows"] = len(rows)

        for row in rows:
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            old_enrollment_id = self._int_or_none(row.get("enrollment_id"))
            enrollment = self._resolve_migrated_obj(Enrollment, context["legacy_to_new"]["enrollments"], old_enrollment_id)
            attendance_date = self._to_date(row.get("lesson_date"))
            if tenant is None or enrollment is None or attendance_date is None:
                context["summary"]["attendance"]["skipped"] += 1
                continue

            status_raw = str(row.get("status") or "").strip().lower()
            status = self.ATTENDANCE_STATUS_MAP.get(status_raw, AttendanceRecord.Status.PRESENT)
            notes = str(row.get("notes") or "").strip()

            obj, created = AttendanceRecord.objects.get_or_create(
                tenant=tenant,
                enrollment=enrollment,
                attendance_date=attendance_date,
                defaults={
                    "status": status,
                    "notes": notes,
                },
            )
            changed = False
            if not created:
                if obj.status != status:
                    obj.status = status
                    changed = True
                if notes and obj.notes != notes:
                    obj.notes = notes
                    changed = True
                if changed:
                    obj.save(update_fields=["status", "notes", "updated_at"])

            context["summary"]["attendance"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_grades(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["grades"], row_limit=row_limit)
        context["summary"]["grades"]["source_rows"] = len(rows)
        assignment_by_id = context["lookups"]["assignment_by_id"]

        student_enrollment_cache: dict[int, list[Enrollment]] = defaultdict(list)
        for enrollment in Enrollment.objects.select_related("student").filter(deleted=False):
            student_enrollment_cache[enrollment.student_id].append(enrollment)
        for enrollments in student_enrollment_cache.values():
            enrollments.sort(key=lambda x: (x.enrolled_on, x.created_at), reverse=True)

        for row in rows:
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            old_student_id = self._int_or_none(row.get("student_id"))
            student = self._resolve_migrated_obj(StudentProfile, context["legacy_to_new"]["students"], old_student_id)
            if tenant is None or student is None:
                context["summary"]["grades"]["skipped"] += 1
                continue

            score_value = self._to_decimal(row.get("score"))
            if score_value is None:
                context["summary"]["grades"]["skipped"] += 1
                continue

            assignment_id = self._int_or_none(row.get("teaching_assignment_id"))
            assignment = assignment_by_id.get(assignment_id or -1, {})
            old_classroom_id = assignment.get("classroom_id")
            old_teacher_id = assignment.get("teacher_id")
            classroom = self._resolve_migrated_obj(
                Classroom,
                context["legacy_to_new"]["classrooms"],
                old_classroom_id if isinstance(old_classroom_id, int) else None,
            )
            teacher = self._resolve_migrated_obj(
                TeacherProfile,
                context["legacy_to_new"]["teachers"],
                old_teacher_id if isinstance(old_teacher_id, int) else None,
            )

            enrollment = None
            student_enrollments = student_enrollment_cache.get(student.id, [])
            if classroom is not None:
                for candidate in student_enrollments:
                    if candidate.classroom_id == classroom.id:
                        enrollment = candidate
                        break
            if enrollment is None and student_enrollments:
                enrollment = student_enrollments[0]
            if enrollment is None:
                context["summary"]["grades"]["skipped"] += 1
                continue

            component = str(row.get("type") or "").strip().upper() or "LEGACY"
            if len(component) > 120:
                component = component[:120]
            grade_date = self._to_date(row.get("date"))
            published_at = None
            if grade_date is not None:
                published_at = timezone.make_aware(datetime.combine(grade_date, time(hour=12, minute=0)))

            obj, created = GradeRecord.objects.get_or_create(
                tenant=tenant,
                enrollment=enrollment,
                component=component,
                defaults={
                    "teacher": teacher,
                    "score": score_value,
                    "max_score": Decimal("20.00"),
                    "weight": Decimal("1.00"),
                    "published_at": published_at,
                },
            )
            changed = False
            if not created:
                if obj.score != score_value:
                    obj.score = score_value
                    changed = True
                if teacher and obj.teacher_id != teacher.id:
                    obj.teacher = teacher
                    changed = True
                if published_at and obj.published_at != published_at:
                    obj.published_at = published_at
                    changed = True
                if changed:
                    obj.save(update_fields=["score", "teacher", "published_at", "updated_at"])

            context["summary"]["grades"]["created" if created else "updated" if changed else "skipped"] += 1

    def _migrate_content(self, context: dict, fallback_tenant: Tenant | None, row_limit: int) -> None:
        rows = self._fetch_rows(context, self.LEGACY_TABLES["content"], row_limit=row_limit)
        context["summary"]["content"]["source_rows"] = len(rows)
        lookups = context["lookups"]
        offering_course_by_id: dict[int, int] = lookups["offering_course_by_id"]
        offering_teacher_by_id: dict[int, int] = lookups["offering_teacher_by_id"]

        for row in rows:
            tenant = self._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            offering_id = self._int_or_none(row.get("offering_id"))
            if tenant is None or offering_id is None:
                context["summary"]["content"]["skipped"] += 1
                continue

            old_course_id = offering_course_by_id.get(offering_id)
            course = self._resolve_migrated_obj(Course, context["legacy_to_new"]["courses"], old_course_id)
            if course is None:
                context["summary"]["content"]["skipped"] += 1
                continue

            old_teacher_id = offering_teacher_by_id.get(offering_id)
            author = self._resolve_migrated_obj(TeacherProfile, context["legacy_to_new"]["teachers"], old_teacher_id)
            title = str(row.get("title") or "").strip() or f"Legacy Lesson {self._int_or_none(row.get('id')) or 0}"
            description = str(row.get("description") or "").strip()
            meeting_url = str(row.get("meeting_url") or "").strip()
            recording_url = str(row.get("recording_url") or "").strip()
            published = self._truthy(row.get("published"))

            body_chunks = [description]
            if meeting_url:
                body_chunks.append(f"Meeting URL: {meeting_url}")
            if recording_url:
                body_chunks.append(f"Recording URL: {recording_url}")
            body = "\n\n".join([chunk for chunk in body_chunks if chunk]).strip()

            obj, created = LearningContent.objects.get_or_create(
                tenant=tenant,
                course=course,
                title=title,
                defaults={
                    "author": author,
                    "content_type": LearningContent.ContentType.LESSON,
                    "body": body,
                    "external_url": meeting_url or recording_url,
                    "published": published,
                },
            )
            changed = False
            if not created:
                if body and obj.body != body:
                    obj.body = body
                    changed = True
                if author and obj.author_id != author.id:
                    obj.author = author
                    changed = True
                if obj.published != published:
                    obj.published = published
                    changed = True
                ext_url = meeting_url or recording_url
                if ext_url and obj.external_url != ext_url:
                    obj.external_url = ext_url
                    changed = True
                if changed:
                    obj.save(update_fields=["body", "author", "published", "external_url", "updated_at"])

            context["summary"]["content"]["created" if created else "updated" if changed else "skipped"] += 1

    def _fetch_rows(self, context: dict, table_name: str, *, row_limit: int = 0) -> list[dict]:
        if table_name not in context["table_names"]:
            self._warn_once(context, f"Legacy table not found: {table_name}")
            return []

        legacy_conn = context.get("legacy_conn")
        columns = self._table_columns(context, table_name)
        table_ref = f'"{table_name}"' if legacy_conn is not None else connection.ops.quote_name(table_name)
        query = f"SELECT * FROM {table_ref}"
        params: list = []
        if "deleted_at" in columns:
            query += " WHERE deleted_at IS NULL"
        query += " ORDER BY id"
        if row_limit > 0:
            query += " LIMIT ?"
            params.append(row_limit)

        if legacy_conn is not None:
            cursor = legacy_conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            col_names = [col[0] for col in cursor.description or []]
            return [dict(zip(col_names, row, strict=False)) for row in cursor.fetchall()]

    @staticmethod
    def _warn_once(context: dict, message: str) -> None:
        seen = context.get("warnings_seen")
        if isinstance(seen, set):
            if message in seen:
                return
            seen.add(message)
        context["warnings"].append(message)

    def _table_columns(self, context: dict, table_name: str) -> set[str]:
        cache = context["table_columns_cache"]
        if table_name in cache:
            return cache[table_name]
        legacy_conn = context.get("legacy_conn")
        if legacy_conn is not None:
            cursor = legacy_conn.cursor()
            cursor.execute(f'PRAGMA table_info("{table_name}")')
            cols = {row[1] for row in cursor.fetchall()}
        else:
            with connection.cursor() as cursor:
                cursor.execute(f"PRAGMA table_info({connection.ops.quote_name(table_name)})")
                cols = {row[1] for row in cursor.fetchall()}
        cache[table_name] = cols
        return cols

    @staticmethod
    def _list_table_names(legacy_conn) -> set[str]:
        if legacy_conn is None:
            return set(connection.introspection.table_names())
        cursor = legacy_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return {str(row[0]) for row in cursor.fetchall() if row and row[0]}

    def _resolve_tenant_for_row(self, context: dict, raw_tenant, fallback_tenant: Tenant | None, *, user=None) -> Tenant | None:
        tenant = self._resolve_tenant(raw_tenant, context=context)
        if tenant is not None:
            return tenant
        user_tenant = getattr(user, "tenant", None)
        if user_tenant is not None:
            return user_tenant
        return fallback_tenant

    def _resolve_tenant(self, raw_tenant, *, context: dict | None = None) -> Tenant | None:
        if raw_tenant is None:
            return None
        raw = str(raw_tenant).strip()
        if not raw:
            return None

        cache = context.get("tenant_cache") if context else {}
        if raw in cache:
            return cache[raw]

        tenant = None
        if raw.isdigit():
            tenant = Tenant.objects.filter(id=int(raw)).first()
        if tenant is None:
            tenant = Tenant.objects.filter(identifier=raw).first()
        if tenant is None:
            tenant = Tenant.objects.filter(domain=raw).first()
        if tenant is None:
            tenant = Tenant.objects.filter(name=raw).first()

        if context is not None:
            cache[raw] = tenant
        return tenant

    @staticmethod
    def _resolve_migrated_obj(model_cls, mapping: dict[int, int], old_id: int | None):
        if old_id is None:
            return None
        new_id = mapping.get(old_id)
        if new_id is None:
            return None
        return model_cls.objects.filter(id=new_id, deleted=False).first()

    @staticmethod
    def _safe_code(raw_code, *, prefix: str, source_id: int) -> str:
        value = str(raw_code or "").strip()
        if value:
            return value[:32]
        return f"{prefix}-{source_id}"

    @staticmethod
    def _int_or_none(value):
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _to_date(value) -> date | None:
        if value is None:
            return None
        if isinstance(value, date) and not isinstance(value, datetime):
            return value
        if isinstance(value, datetime):
            return value.date()
        text = str(value).strip()
        if not text:
            return None
        try:
            return date.fromisoformat(text[:10])
        except ValueError:
            return None

    @staticmethod
    def _to_decimal(value) -> Decimal | None:
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except Exception:
            return None

    @staticmethod
    def _truthy(value) -> bool:
        if isinstance(value, bool):
            return value
        return value in (1, "1", "true", "True", "yes", "YES", "on", "ON")
