from django.db import transaction

from apps.clinical.models import LabRequest
from services.billing.billing_service import InvoiceBuilderService


class RequestService:
    @staticmethod
    @transaction.atomic
    def create_request(patient, exams):

        request = LabRequest.objects.create(paciente=patient)

        request.exames.set(exams)

        request.criar_resultados_automaticos()

        return request

    @staticmethod
    @transaction.atomic
    def finalize_request(request):

        if not request.exames.exists():
            raise ValueError("Requisição deve conter exames.")

        request.status = LabRequest.Status.AGUARDANDO_RESULTADO
        request.save(update_fields=["status"])

        InvoiceBuilderService.generate_invoice(request)

        return request


ServicoRequisicao = RequestService
RequestService.criar_requisicao = RequestService.create_request
RequestService.finalizar_requisicao = RequestService.finalize_request
