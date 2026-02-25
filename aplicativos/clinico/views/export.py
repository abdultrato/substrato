import csv

from django.http import HttpResponse
from django.utils.timezone import now

from backend.frontend.api.views.permissions import (
    IsAdmin,
    IsAdminTech,
    IsRecepcionista,
)
from frontend.api.views import APIView
from frontend.billing.models.fatura import Fatura
from frontend.billing.models.paciente import Paciente
from frontend.billing.models.requisicao_analise import RequisicaoAnalise


class ExportPacientesCSV(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        filename = f"pacientes_{now().date()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["ID", "Nome", "Documento", "Telefone", "Email"])

        for p in Paciente.objects.all():
            writer.writerow(
                [
                    p.id_custom,
                    p.nome,
                    p.numero_id,
                    p.contacto,
                    p.email,
                ]
            )

        return response


class ExportRequisicoesCSV(APIView):
    permission_classes = [IsAdminTech | IsRecepcionista]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        filename = f"requisicoes_{now().date()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["Código", "Paciente", "Status", "Data"])

        for r in RequisicaoAnalise.objects.select_related("paciente"):
            writer.writerow(
                [
                    r.id_custom,
                    r.paciente.nome,
                    r.status,
                    r.criado_em,
                ]
            )

        return response


class ExportFaturasCSV(APIView):
    permission_classes = [IsAdminTech | IsRecepcionista]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        filename = f"faturas_{now().date()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["Número", "Paciente", "Valor Total", "Data"])

        for f in Fatura.objects.select_related("paciente"):
            writer.writerow(
                [
                    f.numero,
                    f.paciente.nome,
                    f.valor_total,
                    f.criado_em,
                ]
            )

        return response
