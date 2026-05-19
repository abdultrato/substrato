from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any


def _derive_overview(payload: dict[str, Any]) -> dict[str, Any]:
    overview = payload.get("overview") or {}
    if overview:
        status = str(overview.get("status") or "UNKNOWN")
        divergent_segments = list(overview.get("divergent_segments") or [])
        total_missing = int(overview.get("total_missing_in_target") or 0)
        total_extra = int(overview.get("total_extra_in_target") or 0)
        warnings_total = int(overview.get("warnings_total") or 0)
        return {
            "status": status,
            "divergent_segments": divergent_segments,
            "total_missing": total_missing,
            "total_extra": total_extra,
            "warnings_total": warnings_total,
        }

    segments = payload.get("segments") or {}
    warnings_total = len(payload.get("warnings") or [])
    divergent_segments: list[str] = []
    total_missing = 0
    total_extra = 0
    for segment, data in segments.items():
        segment_data = data or {}
        if segment_data.get("status") != "MATCH":
            divergent_segments.append(str(segment))
        total_missing += int(segment_data.get("missing_in_target", 0) or 0)
        total_extra += int(segment_data.get("extra_in_target", 0) or 0)

    status = "DIVERGENT" if divergent_segments else "MATCH"
    return {
        "status": status,
        "divergent_segments": divergent_segments,
        "total_missing": total_missing,
        "total_extra": total_extra,
        "warnings_total": warnings_total,
    }


def extract_overview(report_path: Path) -> dict[str, Any]:
    if not report_path.exists():
        return {
            "has_report": False,
            "status": "UNKNOWN",
            "divergent_segments": [],
            "total_missing": 0,
            "total_extra": 0,
            "warnings_total": 0,
        }

    try:
        payload = json.loads(report_path.read_text(encoding="utf-8"))
    except Exception:
        return {
            "has_report": True,
            "status": "UNKNOWN",
            "divergent_segments": [],
            "total_missing": 0,
            "total_extra": 0,
            "warnings_total": 0,
        }

    derived = _derive_overview(payload)
    derived["has_report"] = True
    return derived


def _render_lines(data: dict[str, Any]) -> list[str]:
    divergent_segments = list(data.get("divergent_segments") or [])
    divergent_csv = ", ".join(divergent_segments) if divergent_segments else "-"
    return [
        f"has_report={'true' if data.get('has_report') else 'false'}",
        f"status={data.get('status', 'UNKNOWN')}",
        f"divergent_segments_csv={divergent_csv}",
        f"divergent_segments_count={len(divergent_segments)}",
        f"total_missing={int(data.get('total_missing', 0) or 0)}",
        f"total_extra={int(data.get('total_extra', 0) or 0)}",
        f"warnings_total={int(data.get('warnings_total', 0) or 0)}",
    ]


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract normalized education migration audit overview values.")
    parser.add_argument("--input", default="logs/education-migration-audit-manual.json", help="Path to audit JSON.")
    parser.add_argument(
        "--github-output",
        default="",
        help="Optional GITHUB_OUTPUT file path. If omitted, prints key=value lines to stdout.",
    )
    args = parser.parse_args()

    report_path = Path(str(args.input))
    overview = extract_overview(report_path)
    lines = _render_lines(overview)

    output_path = str(args.github_output or "").strip()
    if output_path:
        with open(output_path, "a", encoding="utf-8") as fh:
            for line in lines:
                fh.write(f"{line}\n")
    else:
        for line in lines:
            sys.stdout.write(f"{line}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
