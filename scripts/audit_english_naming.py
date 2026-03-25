#!/usr/bin/env python3
from pathlib import Path
import sys


def run() -> int:
    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from quality.english_naming import main

    return main()

if __name__ == "__main__":
    raise SystemExit(run())
