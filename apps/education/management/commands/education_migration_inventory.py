from __future__ import annotations

import json
from datetime import datetime, timezone

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Builds an inventory of legacy Schoolar-S tables vs the new Education domain tables."

    LEGACY_CANDIDATES: dict[str, list[str]] = {
        "students": ["academic_student"],
        "teachers": ["school_teacher"],
        "courses": ["learning_course"],
        "classrooms": ["school_classroom"],
        "enrollments": ["school_enrollment"],
        "attendance": ["school_attendancerecord"],
        "grades": ["academic_studentoutcome", "assessment_subjectperiodresult"],
        "examinations": ["assessment_assessment"],
        "content": ["learning_lesson", "learning_lessonmaterial"],
    }

    NEW_TABLES: dict[str, str] = {
        "students": "education_student_profile",
        "teachers": "education_teacher_profile",
        "courses": "education_course",
        "classrooms": "education_classroom",
        "enrollments": "education_enrollment",
        "attendance": "education_attendance_record",
        "grades": "education_grade_record",
        "examinations": "education_examination",
        "content": "education_learning_content",
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--format",
            choices=["text", "json"],
            default="text",
            help="Output format. Use json for automation pipelines.",
        )

    def handle(self, *args, **options):
        table_names = set(connection.introspection.table_names())
        segments: dict[str, dict[str, object]] = {}

        for segment, new_table in self.NEW_TABLES.items():
            legacy_tables = self.LEGACY_CANDIDATES.get(segment, [])
            legacy_present = [table for table in legacy_tables if table in table_names]
            legacy_rows = sum(self._count_table(table) for table in legacy_present)

            new_exists = new_table in table_names
            new_rows = self._count_table(new_table) if new_exists else 0

            coverage = None if legacy_rows == 0 else round((new_rows / legacy_rows) * 100, 2)
            status = self._status(legacy_rows=legacy_rows, new_rows=new_rows)

            segments[segment] = {
                "legacy_tables": legacy_tables,
                "legacy_tables_present": legacy_present,
                "legacy_rows": legacy_rows,
                "new_table": new_table,
                "new_table_exists": new_exists,
                "new_rows": new_rows,
                "coverage_percent": coverage,
                "delta": new_rows - legacy_rows,
                "status": status,
            }

        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "segments": segments,
        }

        if options["format"] == "json":
            self.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2))
            return

        self._print_text(payload)

    @staticmethod
    def _status(*, legacy_rows: int, new_rows: int) -> str:
        if legacy_rows == 0 and new_rows == 0:
            return "EMPTY"
        if legacy_rows == 0 and new_rows > 0:
            return "BOOTSTRAPPED"
        if new_rows == 0:
            return "NOT_STARTED"
        if new_rows < legacy_rows:
            return "PARTIAL"
        return "COVERED"

    @staticmethod
    def _format_coverage(value) -> str:
        if value is None:
            return "-"
        return f"{value:.2f}%"

    def _count_table(self, table_name: str) -> int:
        quoted = connection.ops.quote_name(table_name)
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(1) FROM {quoted}")
            row = cursor.fetchone() or (0,)
        return int(row[0] or 0)

    def _print_text(self, payload: dict[str, object]) -> None:
        self.stdout.write(self.style.SUCCESS("Education Migration Inventory"))
        self.stdout.write(f"Generated at (UTC): {payload['generated_at']}")
        self.stdout.write("")
        self.stdout.write("segment       legacy_rows  new_rows  coverage   status")
        self.stdout.write("------------  -----------  --------  ---------  ------------")

        segments: dict[str, dict[str, object]] = payload["segments"]  # type: ignore[assignment]
        for segment in sorted(segments.keys()):
            data = segments[segment]
            legacy_rows = int(data["legacy_rows"])  # type: ignore[arg-type]
            new_rows = int(data["new_rows"])  # type: ignore[arg-type]
            coverage = self._format_coverage(data["coverage_percent"])  # type: ignore[arg-type]
            status = str(data["status"])
            self.stdout.write(f"{segment:<12}  {legacy_rows:>11}  {new_rows:>8}  {coverage:>9}  {status}")
