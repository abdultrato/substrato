import json

from scripts.extract_education_audit_overview import extract_overview


def test_extract_overview_uses_payload_overview(tmp_path):
    report = tmp_path / "audit.json"
    report.write_text(
        json.dumps(
            {
                "overview": {
                    "status": "DIVERGENT",
                    "divergent_segments": ["students", "courses"],
                    "total_missing_in_target": 4,
                    "total_extra_in_target": 2,
                    "warnings_total": 1,
                }
            }
        ),
        encoding="utf-8",
    )

    result = extract_overview(report)
    assert result["has_report"] is True
    assert result["status"] == "DIVERGENT"
    assert result["divergent_segments"] == ["students", "courses"]
    assert result["total_missing"] == 4
    assert result["total_extra"] == 2
    assert result["warnings_total"] == 1


def test_extract_overview_fallback_from_segments(tmp_path):
    report = tmp_path / "audit.json"
    report.write_text(
        json.dumps(
            {
                "warnings": ["w1", "w2"],
                "segments": {
                    "students": {"status": "MATCH", "missing_in_target": 0, "extra_in_target": 0},
                    "courses": {"status": "DIVERGENT", "missing_in_target": 3, "extra_in_target": 1},
                },
            }
        ),
        encoding="utf-8",
    )

    result = extract_overview(report)
    assert result["has_report"] is True
    assert result["status"] == "DIVERGENT"
    assert result["divergent_segments"] == ["courses"]
    assert result["total_missing"] == 3
    assert result["total_extra"] == 1
    assert result["warnings_total"] == 2


def test_extract_overview_missing_file_returns_unknown(tmp_path):
    report = tmp_path / "missing.json"
    result = extract_overview(report)
    assert result["has_report"] is False
    assert result["status"] == "UNKNOWN"
    assert result["divergent_segments"] == []
    assert result["total_missing"] == 0
    assert result["total_extra"] == 0
    assert result["warnings_total"] == 0
