#!/usr/bin/env python
"""
Converte frontend-next/schema.json (YAML) para frontend-next/schema.generated.json (JSON).
Evita dependências externas; use após gerar o schema com spectacular.
"""
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    sys.stderr.write("PyYAML necessário. Instale com `pip install pyyaml`.\n")
    raise


ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend-next" / "schema.json"
DEST = ROOT / "frontend-next" / "schema.generated.json"


def main():
    data = yaml.safe_load(SRC.read_text())
    DEST.write_text(json.dumps(data))
    print(f"[schema] {SRC} -> {DEST}")


if __name__ == "__main__":
    main()
