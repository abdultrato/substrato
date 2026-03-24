from __future__ import annotations

import shutil
import unittest
from pathlib import Path

from quality.english_naming import find_portuguese_tokens, scan_repository, split_identifier

TEST_ROOT = Path(__file__).resolve().parent
FIXTURE_ROOT = TEST_ROOT / "_english_naming_fixtures"


def build_fixture_root(name: str) -> Path:
    root = FIXTURE_ROOT / name
    shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True, exist_ok=True)
    return root


class EnglishNamingAuditTests(unittest.TestCase):
    def test_split_identifier_handles_common_patterns(self) -> None:
        self.assertEqual(split_identifier("PerfilUsuario"), ["perfil", "usuario"])
        self.assertEqual(split_identifier("resultado_validado_handler"), ["resultado", "validado", "handler"])
        self.assertEqual(split_identifier("registrar evento_fatura"), ["registrar", "evento", "fatura"])

    def test_find_portuguese_tokens_returns_expected_matches(self) -> None:
        self.assertEqual(find_portuguese_tokens("TenantConfiguracaoService"), ("configuracao",))
        self.assertEqual(find_portuguese_tokens("emitir_fatura"), ("emitir", "fatura"))
        self.assertEqual(find_portuguese_tokens("UserProfileService"), ())

    def test_scan_repository_flags_paths_and_identifiers(self) -> None:
        root = build_fixture_root("paths_and_identifiers")
        try:
            module_dir = root / "usuarios"
            module_dir.mkdir()
            source_file = module_dir / "perfil_usuario.py"
            source_file.write_text(
                """
class PerfilUsuario:
    def validar_usuario(self):
        return True
""".strip(),
                encoding="utf-8",
            )

            findings = scan_repository(root)
            formatted = [finding.format(root) for finding in findings]

            self.assertTrue(any("directory: usuarios" in line for line in formatted))
            self.assertTrue(any("file: usuarios/perfil_usuario.py" in line for line in formatted))
            self.assertTrue(any("class: usuarios/perfil_usuario.py:1 -> PerfilUsuario" in line for line in formatted))
            self.assertTrue(any("function: usuarios/perfil_usuario.py:2 -> validar_usuario" in line for line in formatted))
        finally:
            shutil.rmtree(root, ignore_errors=True)

    def test_scan_repository_ignores_docstrings_and_verbose_names(self) -> None:
        root = build_fixture_root("docstrings_and_verbose_names")
        try:
            source_file = root / "models.py"
            source_file.write_text(
                '''
class UserProfile:
    """Docstring em portugues."""

    verbose_name = "Perfil do usuario"

    def save_profile(self):
        return True
'''.strip(),
                encoding="utf-8",
            )

            findings = scan_repository(root)
            self.assertEqual(findings, [])
        finally:
            shutil.rmtree(root, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
