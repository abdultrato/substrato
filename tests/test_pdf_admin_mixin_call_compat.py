import pytest

from tasks.generate_pdf.pdf_admin_mixin import PDFAdminMixin


class _DummyAdmin(PDFAdminMixin):
    pass


def test_invoke_pdf_generator_supports_standard_signature():
    admin = _DummyAdmin()

    def generator(obj, request=None):
        assert obj == {"id": 1}
        assert request == {"user": "x"}
        return b"%PDF-1.4", "ok.pdf"

    admin.pdf_generator = generator
    pdf_bytes, filename = admin._invoke_pdf_generator({"id": 1}, request={"user": "x"})
    assert pdf_bytes.startswith(b"%PDF")
    assert filename == "ok.pdf"


def test_invoke_pdf_generator_supports_legacy_single_arg_signature():
    admin = _DummyAdmin()

    def generator(request_obj):
        assert request_obj == {"id": 2}
        return b"%PDF-1.4", "legacy.pdf"

    admin.pdf_generator = generator
    pdf_bytes, filename = admin._invoke_pdf_generator({"id": 2}, request={"user": "x"})
    assert pdf_bytes.startswith(b"%PDF")
    assert filename == "legacy.pdf"


def test_invoke_pdf_generator_supports_positional_second_arg_signature():
    admin = _DummyAdmin()

    def generator(obj, req=None):
        assert obj == {"id": 3}
        assert req == {"user": "x"}
        return b"%PDF-1.4", "positional.pdf"

    admin.pdf_generator = generator
    pdf_bytes, filename = admin._invoke_pdf_generator({"id": 3}, request={"user": "x"})
    assert pdf_bytes.startswith(b"%PDF")
    assert filename == "positional.pdf"


def test_invoke_pdf_generator_does_not_swallow_unrelated_type_error():
    admin = _DummyAdmin()

    def generator(obj, request=None):
        raise TypeError("erro interno de tipo")

    admin.pdf_generator = generator
    with pytest.raises(TypeError, match="erro interno de tipo"):
        admin._invoke_pdf_generator({"id": 4}, request={"user": "x"})
