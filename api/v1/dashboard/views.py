from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.models.patient import Patient
from apps.clinical.models.lab_request import LabRequest
from apps.billing.models.invoice import Invoice
from domain.clinical.estado_resultado import EstadoResultado
from security.permissions.groups import IsAdminOrContabilidade


class DashboardStatsSerializer(serializers.Serializer):
    pacientes = serializers.IntegerField()
    requisicoes_pendentes = serializers.IntegerField()
    exames_hoje = serializers.IntegerField()
    faturamento_hoje = serializers.FloatField()


class DashboardStatsView(APIView):
    permission_classes = [IsAdminOrContabilidade]

    @extend_schema(responses={200: DashboardStatsSerializer})
    def get(self, request):
        inquilino = getattr(request, "inquilino", None)

        pacientes_qs = Patient.objects.all()
        requisicoes_qs = LabRequest.objects.all()
        faturas_qs = Invoice.objects.all()

        if inquilino is not None:
            pacientes_qs = pacientes_qs.filter(inquilino=inquilino)
            requisicoes_qs = requisicoes_qs.filter(inquilino=inquilino)
            faturas_qs = faturas_qs.filter(inquilino=inquilino)

        hoje = timezone.localdate()

        pacientes = pacientes_qs.count()
        requisicoes_pendentes = requisicoes_qs.filter(estado=EstadoResultado.PENDENTE).count()
        exames_hoje = requisicoes_qs.filter(criado_em__date=hoje).count()

        faturamento_hoje = faturas_qs.filter(criado_em__date=hoje).aggregate(total=Sum("total"))["total"] or Decimal(
            "0.00"
        )

        return Response(
            {
                "pacientes": pacientes,
                "requisicoes_pendentes": requisicoes_pendentes,
                "exames_hoje": exames_hoje,
                "faturamento_hoje": float(faturamento_hoje),
            }
        )
