from contextlib import suppress
import os

from django.core.exceptions import ValidationError
from django.db import models
from PIL import Image

from core.constants.medical_exam.medical_exam_result_type import TipoResultadoExameMedico
from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel

from .lab_request_item import LabRequestItem
from .medical_exam import MedicalExam
from .result import Result


def _medical_result_upload_to(instance, filename):
    parts = [
        "resultados_medicos",
        str(instance.result.tenant_id or "tenant"),
        instance.result.custom_id or str(instance.result_id),
        filename,
    ]
    return os.path.join(*parts)


EXTENSOES_POR_TIPO = {
    TipoResultadoExameMedico.RELATORIO_PDF: {"pdf"},
    TipoResultadoExameMedico.IMAGEM: {"jpg", "jpeg", "png", "webp", "tif", "tiff", "bmp", "gif"},
    TipoResultadoExameMedico.DICOM: {"dcm", "dicom"},
    TipoResultadoExameMedico.VIDEO: {"mp4", "mov", "avi", "mkv", "webm"},
}


def _extensao_file(name):
    if not name or "." not in name:
        return ""
    return name.rsplit(".", 1)[-1].lower()


def _ler_bytes(file, tamanho=4, offset=0):
    if not file:
        return b""
    try:
        pos = file.tell()
    except Exception:
        pos = None
    try:
        file.seek(offset)
        return file.read(tamanho) or b""
    finally:
        if pos is not None:
            with suppress(Exception):
                file.seek(pos)


def _validate_image(file):
    try:
        pos = file.tell()
    except Exception:
        pos = None
    try:
        file.seek(0)
        imagem = Image.open(file)
        imagem.verify()
    except Exception as err:
        raise ValidationError("Arquivo de imagem inválido.") from err
    finally:
        if pos is not None:
            with suppress(Exception):
                file.seek(pos)


def _validate_pdf(file):
    cabecalho = _ler_bytes(file, tamanho=4, offset=0)
    if cabecalho != b"%PDF":
        raise ValidationError("Arquivo PDF inválido.")


def validate_medical_file_for_type(file, type):
    if not file or not type:
        return
    exts = EXTENSOES_POR_TIPO.get(type)
    if exts:
        ext = _extensao_file(getattr(file, "name", "") or "")
        if ext not in exts:
            exts_fmt = ", ".join(sorted(exts))
            ext_fmt = ext or "desconhecida"
            raise ValidationError(f"Extensão '{ext_fmt}' inválida. Permitidas: {exts_fmt}.")
    if type == TipoResultadoExameMedico.IMAGEM:
        _validate_image(file)
    if type == TipoResultadoExameMedico.RELATORIO_PDF:
        _validate_pdf(file)


class MedicalResultFile(PropagarInquilinoMixin, NoNameCoreModel):
    prefix = "RMA"

    result = models.ForeignKey(

        Result,

        db_column="resultado_id",
        on_delete=models.CASCADE,
        related_name="arquivos_medicos",
    )

    request_item = models.ForeignKey(

        LabRequestItem,

        db_column="requisicao_item_id",
        on_delete=models.SET_NULL,
        related_name="arquivos_medicos",
        null=True,
        blank=True,
    )

    medical_exam = models.ForeignKey(

        MedicalExam,

        db_column="exame_medico_id",
        on_delete=models.PROTECT,
        related_name="arquivos",
    )

    type = models.CharField(

        db_column="tipo",

        max_length=20,
        choices=TipoResultadoExameMedico.choices,
        default=TipoResultadoExameMedico.IMAGEM,
        verbose_name="Tipo de file",
    )

    description = models.CharField(

        db_column="descricao",

        max_length=255,
        blank=True,
        verbose_name="Descrição/legenda",
    )

    file = models.FileField(

        db_column="arquivo",

        upload_to=_medical_result_upload_to,
        verbose_name="Arquivo (PDF/Imagem/DICOM)",
    )

    class Meta:
        db_table = "clinico_resultadomedicoarquivo"
        verbose_name = "Arquivo de result médico"
        verbose_name_plural = "Arquivos de result médico"
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        erros = {}

        if self.medical_exam_id and self.type:
            tipos_permitidos = self.medical_exam.tipos_result_cadastrados
            if self.type not in tipos_permitidos:
                method = self.medical_exam.get_method_display() or self.medical_exam.method
                permitidos_fmt = ", ".join(sorted(tipos_permitidos))
                erros["type"] = (
                    f"Tipo não permitido para o método {method}. "
                    f"Permitidos: {permitidos_fmt}."
                )

        if self.file and self.type:
            try:
                validate_medical_file_for_type(self.file, self.type)
            except ValidationError as err:
                erros["file"] = err.messages[0] if err.messages else "Arquivo inválido."

        if erros:
            raise ValidationError(erros)

    def __str__(self):
        return f"{self.medical_exam.name or 'exam médico'} · {self.type}"


_resultado_medico_upload_to = _medical_result_upload_to
_result_doctor_upload_to = _medical_result_upload_to
_validar_imagem = _validate_image
_validar_pdf = _validate_pdf
validar_arquivo_medico_por_tipo = validate_medical_file_for_type
validar_file_doctor_por_type = validate_medical_file_for_type
