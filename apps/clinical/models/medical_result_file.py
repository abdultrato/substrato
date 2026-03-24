import os

from django.core.exceptions import ValidationError
from django.db import models
from PIL import Image
from core.constants.medical_exam.medical_exam_result_type import TipoResultadoExameMedico
from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel

from .medical_exam import MedicalExam
from .lab_request_item import LabRequestItem
from .result import Result


def _medical_result_upload_to(instance, filename):
    parts = [
        "resultados_medicos",
        str(instance.resultado.inquilino_id or "tenant"),
        instance.resultado.id_custom or str(instance.resultado_id),
        filename,
    ]
    return os.path.join(*parts)


EXTENSOES_POR_TIPO = {
    TipoResultadoExameMedico.RELATORIO_PDF: {"pdf"},
    TipoResultadoExameMedico.IMAGEM: {"jpg", "jpeg", "png", "webp", "tif", "tiff", "bmp", "gif"},
    TipoResultadoExameMedico.DICOM: {"dcm", "dicom"},
    TipoResultadoExameMedico.VIDEO: {"mp4", "mov", "avi", "mkv", "webm"},
}


def _extensao_arquivo(nome):
    if not nome or "." not in nome:
        return ""
    return nome.rsplit(".", 1)[-1].lower()


def _ler_bytes(arquivo, tamanho=4, offset=0):
    if not arquivo:
        return b""
    try:
        pos = arquivo.tell()
    except Exception:
        pos = None
    try:
        arquivo.seek(offset)
        return arquivo.read(tamanho) or b""
    finally:
        if pos is not None:
            try:
                arquivo.seek(pos)
            except Exception:
                pass


def _validate_image(arquivo):
    try:
        pos = arquivo.tell()
    except Exception:
        pos = None
    try:
        arquivo.seek(0)
        imagem = Image.open(arquivo)
        imagem.verify()
    except Exception as err:
        raise ValidationError("Arquivo de imagem inválido.") from err
    finally:
        if pos is not None:
            try:
                arquivo.seek(pos)
            except Exception:
                pass


def _validate_pdf(arquivo):
    cabecalho = _ler_bytes(arquivo, tamanho=4, offset=0)
    if cabecalho != b"%PDF":
        raise ValidationError("Arquivo PDF inválido.")


def validate_medical_file_for_type(arquivo, tipo):
    if not arquivo or not tipo:
        return
    exts = EXTENSOES_POR_TIPO.get(tipo)
    if exts:
        ext = _extensao_arquivo(getattr(arquivo, "name", "") or "")
        if ext not in exts:
            exts_fmt = ", ".join(sorted(exts))
            ext_fmt = ext or "desconhecida"
            raise ValidationError(f"Extensão '{ext_fmt}' inválida. Permitidas: {exts_fmt}.")
    if tipo == TipoResultadoExameMedico.IMAGEM:
        _validate_image(arquivo)
    if tipo == TipoResultadoExameMedico.RELATORIO_PDF:
        _validate_pdf(arquivo)


class MedicalResultFile(PropagarInquilinoMixin, NoNameCoreModel):
    prefixo = "RMA"

    resultado = models.ForeignKey(
        Result,
        on_delete=models.CASCADE,
        related_name="arquivos_medicos",
    )

    requisicao_item = models.ForeignKey(
        LabRequestItem,
        on_delete=models.SET_NULL,
        related_name="arquivos_medicos",
        null=True,
        blank=True,
    )

    exame_medico = models.ForeignKey(
        MedicalExam,
        on_delete=models.PROTECT,
        related_name="arquivos",
    )

    tipo = models.CharField(
        max_length=20,
        choices=TipoResultadoExameMedico.choices,
        default=TipoResultadoExameMedico.IMAGEM,
        verbose_name="Tipo de arquivo",
    )

    descricao = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Descrição/legenda",
    )

    arquivo = models.FileField(
        upload_to=_medical_result_upload_to,
        verbose_name="Arquivo (PDF/Imagem/DICOM)",
    )

    class Meta:
        verbose_name = "Arquivo de resultado médico"
        verbose_name_plural = "Arquivos de resultado médico"
        ordering = ["-criado_em"]

    def clean(self):
        super().clean()
        erros = {}

        if self.exame_medico_id and self.tipo:
            tipos_permitidos = self.exame_medico.tipos_resultado_cadastrados
            if self.tipo not in tipos_permitidos:
                metodo = self.exame_medico.get_metodo_display() or self.exame_medico.metodo
                permitidos_fmt = ", ".join(sorted(tipos_permitidos))
                erros["tipo"] = (
                    f"Tipo não permitido para o método {metodo}. "
                    f"Permitidos: {permitidos_fmt}."
                )

        if self.arquivo and self.tipo:
            try:
                validate_medical_file_for_type(self.arquivo, self.tipo)
            except ValidationError as err:
                erros["arquivo"] = err.messages[0] if err.messages else "Arquivo inválido."

        if erros:
            raise ValidationError(erros)

    def __str__(self):
        return f"{self.exame_medico.nome or 'exame médico'} · {self.tipo}"


_resultado_medico_upload_to = _medical_result_upload_to
_validar_imagem = _validate_image
_validar_pdf = _validate_pdf
validar_arquivo_medico_por_tipo = validate_medical_file_for_type
