from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
import json
from pathlib import Path
import sqlite3

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.education.management.commands.education_migrate_legacy import Command as LegacyMigrationCommand
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


@dataclass(frozen=True)
class EnrollmentIdentity:
    tenant_id: int
    student_user_id: int
    course_code: str
    classroom_name: str
    academic_year: str


class Command(BaseCommand):
    help = "Audits legacy Schoolar-S vs new education domain and reports divergences by segment."

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

    def add_arguments(self, parser):
        parser.add_argument(
            "--legacy-db",
            default="",
            help="Optional path to legacy Schoolar-S SQLite DB file.",
        )
        parser.add_argument(
            "--fallback-tenant",
            default="",
            help="Tenant identifier or id used to resolve blank legacy tenant_id.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limit rows read per legacy table during audit (0 = no limit).",
        )
        parser.add_argument(
            "--samples",
            type=int,
            default=10,
            help="Max sample rows for missing/extra listings.",
        )
        parser.add_argument(
            "--format",
            choices=["text", "json", "markdown"],
            default="text",
            help="Output format.",
        )
        parser.add_argument(
            "--output",
            default="",
            help="Optional path to save the final audit payload as JSON.",
        )
        parser.add_argument(
            "--output-markdown",
            default="",
            help="Optional path to save the final audit payload as Markdown.",
        )
        parser.add_argument(
            "--auto-fix",
            action="store_true",
            help="Run safe upsert migration when divergences are found, then re-audit.",
        )
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Exit with error when final audit contains divergent segments.",
        )

    def handle(self, *args, **options):
        migrator = LegacyMigrationCommand()
        row_limit = max(0, int(options["limit"] or 0))
        sample_limit = max(1, int(options["samples"] or 1))
        strict_mode = bool(options["strict"])
        output_path = str(options.get("output") or "").strip()
        output_markdown_path = str(options.get("output_markdown") or "").strip()
        auto_fix = bool(options["auto_fix"])
        fallback_tenant = migrator._resolve_tenant(options["fallback_tenant"]) if options["fallback_tenant"] else None
        legacy_db_path = str(options.get("legacy_db") or "").strip()
        legacy_conn = None

        if options["fallback_tenant"] and fallback_tenant is None:
            raise CommandError("Fallback tenant was provided but could not be resolved.")

        if legacy_db_path:
            path = Path(legacy_db_path)
            if not path.exists():
                raise CommandError(f"Legacy DB file not found: {legacy_db_path}")
            legacy_conn = sqlite3.connect(str(path))
            legacy_conn.row_factory = sqlite3.Row

        try:
            context_before = self._build_context(
                migrator=migrator,
                row_limit=row_limit,
                fallback_tenant=fallback_tenant,
                legacy_conn=legacy_conn,
                apply=False,
            )
            migrator._load_legacy_support_lookups(context_before)
            payload_before = self._build_audit_payload(
                migrator=migrator,
                context=context_before,
                fallback_tenant=fallback_tenant,
                row_limit=row_limit,
                sample_limit=sample_limit,
            )
            payload_before["warnings"] = context_before["warnings"]

            divergent_before = [
                segment
                for segment, data in payload_before["segments"].items()
                if data.get("status") != "MATCH"
            ]

            payload = payload_before

            if auto_fix:
                auto_fix_payload = {
                    "enabled": True,
                    "applied": False,
                    "divergent_before": divergent_before,
                    "migration_summary": {},
                }

                if divergent_before:
                    fix_context = self._run_auto_fix(
                        migrator=migrator,
                        row_limit=row_limit,
                        fallback_tenant=fallback_tenant,
                        legacy_conn=legacy_conn,
                    )
                    auto_fix_payload["applied"] = True
                    auto_fix_payload["migration_summary"] = fix_context["summary"]

                    context_after = self._build_context(
                        migrator=migrator,
                        row_limit=row_limit,
                        fallback_tenant=fallback_tenant,
                        legacy_conn=legacy_conn,
                        apply=False,
                    )
                    migrator._load_legacy_support_lookups(context_after)
                    payload_after = self._build_audit_payload(
                        migrator=migrator,
                        context=context_after,
                        fallback_tenant=fallback_tenant,
                        row_limit=row_limit,
                        sample_limit=sample_limit,
                    )
                    payload_after["warnings"] = context_after["warnings"]
                    payload_after["before"] = payload_before["segments"]
                    payload_after["warnings_before"] = payload_before.get("warnings", [])
                    payload_after["auto_fix"] = auto_fix_payload
                    payload = payload_after
                else:
                    payload["auto_fix"] = auto_fix_payload

            payload = self._with_overview(payload)

            if output_path:
                self._write_output_json(payload, output_path)

            if output_markdown_path:
                self._write_output_markdown(payload, output_markdown_path)

            if options["format"] == "json":
                self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2, default=str))
            elif options["format"] == "markdown":
                self.stdout.write(self._render_markdown(payload))
            else:
                self._print_text(payload)

            if strict_mode:
                divergent_final = list(payload.get("overview", {}).get("divergent_segments") or [])
                if divergent_final:
                    raise CommandError(
                        "Audit finished with divergences under --strict: " + ", ".join(sorted(divergent_final))
                    )
        finally:
            if legacy_conn is not None:
                legacy_conn.close()

    def _build_context(
        self,
        *,
        migrator: LegacyMigrationCommand,
        row_limit: int,
        fallback_tenant,
        legacy_conn,
        apply: bool,
    ) -> dict:
        summary = (
            {segment: {"source_rows": 0, "created": 0, "updated": 0, "skipped": 0} for segment in migrator.SEGMENTS}
            if apply
            else {}
        )
        return {
            "apply": apply,
            "limit": row_limit,
            "fallback_tenant": getattr(fallback_tenant, "identifier", ""),
            "summary": summary,
            "errors": [],
            "warnings": [],
            "warnings_seen": set(),
            "table_names": migrator._list_table_names(legacy_conn),
            "table_columns_cache": {},
            "tenant_cache": {},
            "legacy_conn": legacy_conn,
            "legacy_to_new": {segment: {} for segment in ("students", "teachers", "courses", "classrooms", "enrollments")},
            "lookups": {},
        }

    def _run_auto_fix(
        self,
        *,
        migrator: LegacyMigrationCommand,
        row_limit: int,
        fallback_tenant,
        legacy_conn,
    ) -> dict:
        context = self._build_context(
            migrator=migrator,
            row_limit=row_limit,
            fallback_tenant=fallback_tenant,
            legacy_conn=legacy_conn,
            apply=True,
        )
        migrator._load_legacy_support_lookups(context)
        with transaction.atomic():
            migrator._migrate_students(context, fallback_tenant, row_limit)
            migrator._migrate_teachers(context, fallback_tenant, row_limit)
            migrator._migrate_courses(context, fallback_tenant, row_limit)
            migrator._migrate_classrooms(context, fallback_tenant, row_limit)
            migrator._migrate_enrollments(context, fallback_tenant, row_limit)
            migrator._migrate_examinations(context, fallback_tenant, row_limit)
            migrator._migrate_attendance(context, fallback_tenant, row_limit)
            migrator._migrate_grades(context, fallback_tenant, row_limit)
            migrator._migrate_content(context, fallback_tenant, row_limit)
        return context

    def _build_audit_payload(
        self,
        *,
        migrator: LegacyMigrationCommand,
        context: dict,
        fallback_tenant,
        row_limit: int,
        sample_limit: int,
    ) -> dict:
        legacy_students = migrator._fetch_rows(context, migrator.LEGACY_TABLES["students"], row_limit=row_limit)
        legacy_teachers = migrator._fetch_rows(context, migrator.LEGACY_TABLES["teachers"], row_limit=row_limit)
        legacy_courses = migrator._fetch_rows(context, migrator.LEGACY_TABLES["courses"], row_limit=row_limit)
        legacy_classrooms = migrator._fetch_rows(context, migrator.LEGACY_TABLES["classrooms"], row_limit=row_limit)
        legacy_enrollments = migrator._fetch_rows(context, migrator.LEGACY_TABLES["enrollments"], row_limit=row_limit)
        legacy_attendance = migrator._fetch_rows(context, migrator.LEGACY_TABLES["attendance"], row_limit=row_limit)
        legacy_assessments = migrator._fetch_rows(context, migrator.LEGACY_TABLES["grades"], row_limit=row_limit)
        legacy_lessons = migrator._fetch_rows(context, migrator.LEGACY_TABLES["content"], row_limit=row_limit)

        lookups = context["lookups"]
        year_code_by_id: dict[int, str] = lookups["year_code_by_id"]
        classroom_course_by_id: dict[int, int] = lookups["classroom_course_by_id"]
        offering_course_by_id: dict[int, int] = lookups["offering_course_by_id"]
        assignment_by_id: dict[int, dict[str, int | None]] = lookups["assignment_by_id"]

        expected_students: set[tuple[int, int]] = set()
        expected_teachers: set[tuple[int, int]] = set()
        expected_courses: set[tuple[int, str]] = set()
        expected_classrooms: set[tuple[int, str, str, str]] = set()
        expected_enrollments: set[EnrollmentIdentity] = set()
        expected_examinations: set[tuple[int, str, str, str, str]] = set()
        expected_attendance: set[tuple[int, int, str, str, str, str]] = set()
        expected_grades: set[tuple[int, int, str, str, str, str]] = set()
        expected_content: set[tuple[int, str, str]] = set()

        student_legacy_to_user: dict[int, int] = {}
        course_legacy_to_key: dict[int, tuple[int, str]] = {}
        classroom_legacy_to_key: dict[int, tuple[int, str, str, str]] = {}
        enrollment_legacy_to_key: dict[int, EnrollmentIdentity] = {}
        student_to_enrollments: dict[tuple[int, int], list[EnrollmentIdentity]] = defaultdict(list)

        for row in legacy_students:
            user_id = migrator._int_or_none(row.get("user_id"))
            legacy_id = migrator._int_or_none(row.get("id"))
            if user_id is None or legacy_id is None:
                continue
            user = StudentProfile._meta.get_field("user").related_model.objects.filter(id=user_id).first()
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant, user=user)
            if tenant is None or user is None:
                continue
            expected_students.add((tenant.id, user.id))
            student_legacy_to_user[legacy_id] = user.id

        for row in legacy_teachers:
            user_id = migrator._int_or_none(row.get("user_id"))
            if user_id is None:
                continue
            user = TeacherProfile._meta.get_field("user").related_model.objects.filter(id=user_id).first()
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant, user=user)
            if tenant is None or user is None:
                continue
            expected_teachers.add((tenant.id, user.id))

        for row in legacy_courses:
            legacy_id = migrator._int_or_none(row.get("id"))
            if legacy_id is None:
                continue
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            if tenant is None:
                continue
            code = migrator._safe_code(row.get("code"), prefix="LEG-CRS", source_id=legacy_id)
            expected_courses.add((tenant.id, code))
            course_legacy_to_key[legacy_id] = (tenant.id, code)

        for row in legacy_classrooms:
            legacy_id = migrator._int_or_none(row.get("id"))
            if legacy_id is None:
                continue
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            old_course_id = classroom_course_by_id.get(legacy_id)
            course_key = course_legacy_to_key.get(old_course_id or -1)
            if tenant is None or course_key is None:
                continue
            year_id = migrator._int_or_none(row.get("academic_year_id"))
            academic_year = year_code_by_id.get(year_id or -1, "").strip() or str(row.get("academic_year") or "").strip()
            if not academic_year:
                academic_year = str(datetime.now(tz=timezone.utc).year)
            name = str(row.get("name") or "").strip() or f"Legacy Classroom {legacy_id}"
            key = (tenant.id, course_key[1], name, academic_year)
            expected_classrooms.add(key)
            classroom_legacy_to_key[legacy_id] = key

        for row in legacy_enrollments:
            legacy_id = migrator._int_or_none(row.get("id"))
            old_student_id = migrator._int_or_none(row.get("student_id"))
            old_classroom_id = migrator._int_or_none(row.get("classroom_id"))
            if legacy_id is None or old_student_id is None or old_classroom_id is None:
                continue
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            student_user_id = student_legacy_to_user.get(old_student_id)
            classroom_key = classroom_legacy_to_key.get(old_classroom_id)
            if tenant is None or student_user_id is None or classroom_key is None:
                continue
            ident = EnrollmentIdentity(
                tenant_id=tenant.id,
                student_user_id=student_user_id,
                course_code=classroom_key[1],
                classroom_name=classroom_key[2],
                academic_year=classroom_key[3],
            )
            expected_enrollments.add(ident)
            enrollment_legacy_to_key[legacy_id] = ident
            student_to_enrollments[(tenant.id, student_user_id)].append(ident)

        for row in legacy_assessments:
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            assignment_id = migrator._int_or_none(row.get("teaching_assignment_id"))
            exam_date = migrator._to_date(row.get("date"))
            exam_type = str(row.get("type") or "").strip().upper()
            if tenant is None or assignment_id is None or exam_date is None or not exam_type:
                continue
            assignment = assignment_by_id.get(assignment_id, {})
            old_classroom_id = assignment.get("classroom_id")
            if not isinstance(old_classroom_id, int):
                continue
            classroom_key = classroom_legacy_to_key.get(old_classroom_id)
            if classroom_key is None:
                continue
            title = f"{exam_type} {exam_date.isoformat()} TA#{assignment_id}"
            if len(title) > 180:
                title = title[:180]
            expected_examinations.add((tenant.id, classroom_key[1], classroom_key[2], classroom_key[3], title))

            score_value = migrator._to_decimal(row.get("score"))
            old_student_id = migrator._int_or_none(row.get("student_id"))
            if score_value is None or old_student_id is None:
                continue
            student_user_id = student_legacy_to_user.get(old_student_id)
            if student_user_id is None:
                continue
            enrollments_for_student = student_to_enrollments.get((tenant.id, student_user_id), [])
            selected = None
            for candidate in enrollments_for_student:
                if (
                    candidate.course_code == classroom_key[1]
                    and candidate.classroom_name == classroom_key[2]
                    and candidate.academic_year == classroom_key[3]
                ):
                    selected = candidate
                    break
            if selected is None and enrollments_for_student:
                selected = enrollments_for_student[0]
            if selected is None:
                continue
            component = exam_type or "LEGACY"
            expected_grades.add(
                (
                    tenant.id,
                    selected.student_user_id,
                    selected.course_code,
                    selected.classroom_name,
                    selected.academic_year,
                    component,
                )
            )

        for row in legacy_attendance:
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            enrollment_id = migrator._int_or_none(row.get("enrollment_id"))
            attendance_date = migrator._to_date(row.get("lesson_date"))
            if tenant is None or enrollment_id is None or attendance_date is None:
                continue
            enrollment_ident = enrollment_legacy_to_key.get(enrollment_id)
            if enrollment_ident is None:
                continue
            expected_attendance.add(
                (
                    tenant.id,
                    enrollment_ident.student_user_id,
                    enrollment_ident.course_code,
                    enrollment_ident.classroom_name,
                    enrollment_ident.academic_year,
                    attendance_date.isoformat(),
                )
            )

        for row in legacy_lessons:
            tenant = migrator._resolve_tenant_for_row(context, row.get("tenant_id"), fallback_tenant)
            offering_id = migrator._int_or_none(row.get("offering_id"))
            if tenant is None or offering_id is None:
                continue
            old_course_id = offering_course_by_id.get(offering_id)
            course_key = course_legacy_to_key.get(old_course_id or -1)
            if course_key is None:
                continue
            title = str(row.get("title") or "").strip() or f"Legacy Lesson {migrator._int_or_none(row.get('id')) or 0}"
            expected_content.add((tenant.id, course_key[1], title))

        actual_students = set(StudentProfile.objects.filter(deleted=False).values_list("tenant_id", "user_id"))
        actual_teachers = set(TeacherProfile.objects.filter(deleted=False).values_list("tenant_id", "user_id"))
        actual_courses = set(Course.objects.filter(deleted=False).values_list("tenant_id", "code"))

        actual_classrooms = {
            (obj.tenant_id, obj.course.code, obj.name, obj.academic_year)
            for obj in Classroom.objects.select_related("course").filter(deleted=False)
        }
        actual_enrollments = {
            EnrollmentIdentity(
                tenant_id=obj.tenant_id,
                student_user_id=obj.student.user_id,
                course_code=obj.classroom.course.code,
                classroom_name=obj.classroom.name,
                academic_year=obj.classroom.academic_year,
            )
            for obj in Enrollment.objects.select_related("student__user", "classroom__course").filter(deleted=False)
        }
        actual_examinations = {
            (obj.tenant_id, obj.course.code, obj.classroom.name if obj.classroom_id else "", obj.classroom.academic_year if obj.classroom_id else "", obj.title)
            for obj in Examination.objects.select_related("course", "classroom").filter(deleted=False)
        }
        actual_attendance = {
            (
                obj.tenant_id,
                obj.enrollment.student.user_id,
                obj.enrollment.classroom.course.code,
                obj.enrollment.classroom.name,
                obj.enrollment.classroom.academic_year,
                obj.attendance_date.isoformat(),
            )
            for obj in AttendanceRecord.objects.select_related("enrollment__student__user", "enrollment__classroom__course").filter(
                deleted=False
            )
        }
        actual_grades = {
            (
                obj.tenant_id,
                obj.enrollment.student.user_id,
                obj.enrollment.classroom.course.code,
                obj.enrollment.classroom.name,
                obj.enrollment.classroom.academic_year,
                obj.component,
            )
            for obj in GradeRecord.objects.select_related("enrollment__student__user", "enrollment__classroom__course").filter(deleted=False)
        }
        actual_content = {
            (obj.tenant_id, obj.course.code, obj.title)
            for obj in LearningContent.objects.select_related("course").filter(deleted=False)
        }

        segment_data = {
            "students": self._segment_report(expected_students, actual_students, sample_limit),
            "teachers": self._segment_report(expected_teachers, actual_teachers, sample_limit),
            "courses": self._segment_report(expected_courses, actual_courses, sample_limit),
            "classrooms": self._segment_report(expected_classrooms, actual_classrooms, sample_limit),
            "enrollments": self._segment_report(expected_enrollments, actual_enrollments, sample_limit),
            "examinations": self._segment_report(expected_examinations, actual_examinations, sample_limit),
            "attendance": self._segment_report(expected_attendance, actual_attendance, sample_limit),
            "grades": self._segment_report(expected_grades, actual_grades, sample_limit),
            "content": self._segment_report(expected_content, actual_content, sample_limit),
        }

        return {
            "generated_at": datetime.now(tz=timezone.utc).isoformat(),
            "legacy_db": bool(context.get("legacy_conn")),
            "fallback_tenant": context.get("fallback_tenant") or "",
            "segments": segment_data,
        }

    @staticmethod
    def _segment_report(expected_set, actual_set, sample_limit: int) -> dict:
        missing = sorted(expected_set - actual_set, key=lambda v: repr(v))
        extra = sorted(actual_set - expected_set, key=lambda v: repr(v))
        status = "MATCH" if not missing and not extra else "DIVERGENT"
        return {
            "status": status,
            "expected_total": len(expected_set),
            "actual_total": len(actual_set),
            "missing_in_target": len(missing),
            "extra_in_target": len(extra),
            "missing_samples": [repr(v) for v in missing[:sample_limit]],
            "extra_samples": [repr(v) for v in extra[:sample_limit]],
        }

    def _print_text(self, payload: dict) -> None:
        self.stdout.write(self.style.SUCCESS("Education Migration Audit"))
        self.stdout.write(f"Generated at (UTC): {payload['generated_at']}")
        self.stdout.write(f"legacy_db={payload.get('legacy_db')} fallback_tenant={payload.get('fallback_tenant') or '-'}")
        overview = payload.get("overview") or {}
        if overview:
            self.stdout.write(
                "overview "
                f"status={overview.get('status', 'UNKNOWN')} "
                f"segments_divergent={int(overview.get('segments_divergent', 0))} "
                f"missing_total={int(overview.get('total_missing_in_target', 0))} "
                f"extra_total={int(overview.get('total_extra_in_target', 0))} "
                f"warnings={int(overview.get('warnings_total', 0))}"
            )
        self.stdout.write("")
        auto_fix = payload.get("auto_fix") or {}
        if auto_fix.get("enabled"):
            self.stdout.write(
                f"auto_fix enabled={auto_fix.get('enabled')} applied={auto_fix.get('applied')} "
                f"divergent_before={len(auto_fix.get('divergent_before') or [])}"
            )
            self.stdout.write("")
        self.stdout.write("segment       status      expected  actual  missing  extra")
        self.stdout.write("------------  ----------  --------  ------  -------  -----")
        for segment in self.SEGMENTS:
            data = payload["segments"][segment]
            self.stdout.write(
                f"{segment:<12}  {data['status']:<10}  {int(data['expected_total']):>8}  "
                f"{int(data['actual_total']):>6}  {int(data['missing_in_target']):>7}  {int(data['extra_in_target']):>5}"
            )

        warnings = payload.get("warnings") or []
        if warnings:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Warnings:"))
            for warning in warnings:
                self.stdout.write(f"- {warning}")

        if auto_fix.get("enabled") and auto_fix.get("migration_summary"):
            self.stdout.write("")
            self.stdout.write(self.style.SUCCESS("Auto-fix migration summary:"))
            summary = auto_fix.get("migration_summary") or {}
            self.stdout.write("segment       source_rows  created  updated  skipped")
            self.stdout.write("------------  -----------  -------  -------  -------")
            for segment in self.SEGMENTS:
                data = summary.get(segment, {})
                self.stdout.write(
                    f"{segment:<12}  {int(data.get('source_rows', 0)):>11}  "
                    f"{int(data.get('created', 0)):>7}  {int(data.get('updated', 0)):>7}  {int(data.get('skipped', 0)):>7}"
                )

        divergent = [segment for segment in self.SEGMENTS if payload["segments"][segment]["status"] != "MATCH"]
        if divergent:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Sample divergences:"))
            for segment in divergent:
                data = payload["segments"][segment]
                if data["missing_samples"]:
                    self.stdout.write(f"- {segment} missing: {', '.join(data['missing_samples'])}")
                if data["extra_samples"]:
                    self.stdout.write(f"- {segment} extra: {', '.join(data['extra_samples'])}")

    @staticmethod
    def _write_output_json(payload: dict, output_path: str) -> None:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2, default=str)

    def _render_markdown(self, payload: dict) -> str:
        lines: list[str] = []
        lines.append("# Education Migration Audit")
        lines.append("")
        lines.append(f"- Generated at (UTC): `{payload.get('generated_at')}`")
        lines.append(f"- `legacy_db`: `{payload.get('legacy_db')}`")
        lines.append(f"- `fallback_tenant`: `{payload.get('fallback_tenant') or '-'}`")
        lines.append("")

        overview = payload.get("overview") or {}
        if overview:
            lines.append("## Overview")
            lines.append("")
            lines.append(f"- `status`: `{overview.get('status', 'UNKNOWN')}`")
            lines.append(f"- `segments_total`: `{int(overview.get('segments_total', 0))}`")
            lines.append(f"- `segments_match`: `{int(overview.get('segments_match', 0))}`")
            lines.append(f"- `segments_divergent`: `{int(overview.get('segments_divergent', 0))}`")
            lines.append(
                f"- `divergent_segments`: "
                f"`{', '.join(overview.get('divergent_segments') or []) or '-'}`"
            )
            lines.append(f"- `total_missing_in_target`: `{int(overview.get('total_missing_in_target', 0))}`")
            lines.append(f"- `total_extra_in_target`: `{int(overview.get('total_extra_in_target', 0))}`")
            lines.append(f"- `warnings_total`: `{int(overview.get('warnings_total', 0))}`")
            lines.append("")

        auto_fix = payload.get("auto_fix") or {}
        if auto_fix.get("enabled"):
            lines.append("## Auto-Fix")
            lines.append("")
            lines.append(f"- Enabled: `{auto_fix.get('enabled')}`")
            lines.append(f"- Applied: `{auto_fix.get('applied')}`")
            lines.append(f"- Divergent Before: `{len(auto_fix.get('divergent_before') or [])}`")
            lines.append("")

        lines.append("## Segment Status")
        lines.append("")
        lines.append("| Segment | Status | Expected | Actual | Missing | Extra |")
        lines.append("|---|---|---:|---:|---:|---:|")
        for segment in self.SEGMENTS:
            data = payload["segments"][segment]
            lines.append(
                f"| `{segment}` | `{data['status']}` | {int(data['expected_total'])} | "
                f"{int(data['actual_total'])} | {int(data['missing_in_target'])} | {int(data['extra_in_target'])} |"
            )
        lines.append("")

        warnings = payload.get("warnings") or []
        if warnings:
            lines.append("## Warnings")
            lines.append("")
            for warning in warnings:
                lines.append(f"- {warning}")
            lines.append("")

        if auto_fix.get("enabled") and auto_fix.get("migration_summary"):
            summary = auto_fix.get("migration_summary") or {}
            lines.append("## Auto-Fix Migration Summary")
            lines.append("")
            lines.append("| Segment | Source Rows | Created | Updated | Skipped |")
            lines.append("|---|---:|---:|---:|---:|")
            for segment in self.SEGMENTS:
                data = summary.get(segment, {})
                lines.append(
                    f"| `{segment}` | {int(data.get('source_rows', 0))} | {int(data.get('created', 0))} | "
                    f"{int(data.get('updated', 0))} | {int(data.get('skipped', 0))} |"
                )
            lines.append("")

        divergent = [segment for segment in self.SEGMENTS if payload["segments"][segment]["status"] != "MATCH"]
        if divergent:
            lines.append("## Divergence Samples")
            lines.append("")
            for segment in divergent:
                data = payload["segments"][segment]
                if data["missing_samples"]:
                    lines.append(f"- `{segment}` missing: {', '.join(data['missing_samples'])}")
                if data["extra_samples"]:
                    lines.append(f"- `{segment}` extra: {', '.join(data['extra_samples'])}")
            lines.append("")
        else:
            lines.append("## Final Result")
            lines.append("")
            lines.append("All audited segments are in `MATCH` state.")
            lines.append("")

        return "\n".join(lines).rstrip() + "\n"

    def _write_output_markdown(self, payload: dict, output_path: str) -> None:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(self._render_markdown(payload), encoding="utf-8")

    def _with_overview(self, payload: dict) -> dict:
        segments = payload.get("segments") or {}
        divergent_segments = [segment for segment, data in segments.items() if (data or {}).get("status") != "MATCH"]
        segments_total = len(segments)
        segments_divergent = len(divergent_segments)
        segments_match = max(0, segments_total - segments_divergent)
        total_missing = sum(int((data or {}).get("missing_in_target", 0)) for data in segments.values())
        total_extra = sum(int((data or {}).get("extra_in_target", 0)) for data in segments.values())
        warnings_total = len(payload.get("warnings") or [])
        auto_fix = payload.get("auto_fix") or {}

        payload["overview"] = {
            "status": "MATCH" if segments_divergent == 0 else "DIVERGENT",
            "segments_total": segments_total,
            "segments_match": segments_match,
            "segments_divergent": segments_divergent,
            "divergent_segments": divergent_segments,
            "total_missing_in_target": total_missing,
            "total_extra_in_target": total_extra,
            "warnings_total": warnings_total,
            "auto_fix_enabled": bool(auto_fix.get("enabled")),
            "auto_fix_applied": bool(auto_fix.get("applied")),
        }
        return payload
