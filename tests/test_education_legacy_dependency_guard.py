from __future__ import annotations

from pathlib import Path
import re


ROOT_DIR = Path(__file__).resolve().parents[1]

RUNTIME_SURFACES = (
    ROOT_DIR / "api" / "v1" / "education",
    ROOT_DIR / "services" / "education",
    ROOT_DIR / "events" / "education",
    ROOT_DIR / "apps" / "education" / "models",
)

LEGACY_IMPORT_PATTERN = re.compile(
    r"^\s*(?:from|import)\s+apps\.education\.legacy_schoolar\b",
    re.MULTILINE,
)


def _python_files(paths: tuple[Path, ...]) -> list[Path]:
    files: list[Path] = []
    for base in paths:
        files.extend(sorted(base.rglob("*.py")))
    return files


def test_runtime_education_surfaces_do_not_import_legacy_schoolar():
    violations: list[str] = []
    for py_file in _python_files(RUNTIME_SURFACES):
        content = py_file.read_text(encoding="utf-8")
        if LEGACY_IMPORT_PATTERN.search(content):
            violations.append(py_file.relative_to(ROOT_DIR).as_posix())

    assert violations == [], (
        "Education runtime still depends on legacy_schoolar: "
        + ", ".join(violations)
    )
