from django.db import transaction

from apps.clinical.models import LabRequest
from services.billing.billing_service import InvoiceBuilderService


class RequestService:
    @staticmethod
    @transaction.atomic
    def create_request(patient, exams):

        request = LabRequest.objects.create(patient=patient)

        request.exams.set(exams)

        request.criar_resultados_automaticos()

        return request

    @staticmethod
    @transaction.atomic
    def finalize_request(request):

        if not request.exams.exists():
            raise ValueError("Requisição deve conter exams.")

        request.status = LabRequest.Status.AGUARDANDO_RESULTADO
        request.save(update_fields=["status"])

        InvoiceBuilderService.generate_invoice(request)

        return request


"""Serviços para criação/gestão de requisições de exames."""
