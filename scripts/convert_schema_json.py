#!/usr/bin/env python
"""
Converte frontend-next/schema.json para frontend-next/schema.generated.json.

- Se `schema.json` estiver em JSON, faz load JSON.
- Se estiver em YAML, usa PyYAML (opcional) para converter.
"""

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend-next" / "schema.json"
DEST = ROOT / "frontend-next" / "schema.generated.json"


def main():
    raw = SRC.read_text(encoding="utf-8").strip()

    if not raw:
        raise SystemExit("schema.json vazio.")

    # Prefer JSON quando aplicável (é o formato gerado pelo `generate_schema.py`).
    if raw.startswith("{") or raw.startswith("["):
        data = json.loads(raw)
    else:
        try:
            import yaml  # type: ignore
        except ImportError as e:
            raise SystemExit(
                "schema.json parece YAML, mas PyYAML não está instalado. "
                "Instale com `pip install pyyaml`."
            ) from e
        data = yaml.safe_load(raw)

    DEST.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main()
