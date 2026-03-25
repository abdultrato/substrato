from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from domain.clinical.status_result import EstadoResultado
from security.permissions.groups import IsAdminOrContabilidade


class DashboardStatsSerializer(serializers.Serializer):
    pacientes = serializers.IntegerField()
    requisicoes_pendentes = serializers.IntegerField()
    exams_hoje = serializers.IntegerField()
    faturamento_hoje = serializers.FloatField()


class DashboardStatsView(APIView):
    permission_classes = [IsAdminOrContabilidade]

    @extend_schema(responses={200: DashboardStatsSerializer})
    def get(self, request):
        tenant = getattr(request, "tenant", None)

        pacientes_qs = Patient.objects.all()
        requisicoes_qs = LabRequest.objects.all()
        faturas_qs = Invoice.objects.all()

        if tenant is not None:
            pacientes_qs = pacientes_qs.filter(tenant=tenant)
            requisicoes_qs = requisicoes_qs.filter(tenant=tenant)
            faturas_qs = faturas_qs.filter(tenant=tenant)

        hoje = timezone.localdate()

        pacientes = pacientes_qs.count()
        requisicoes_pendentes = requisicoes_qs.filter(status=EstadoResultado.PENDENTE).count()
        exams_hoje = requisicoes_qs.filter(created_at__date=hoje).count()

        faturamento_hoje = faturas_qs.filter(created_at__date=hoje).aggregate(total=Sum("total"))["total"] or Decimal(
            "0.00"
        )

        return Response(
            {
                "pacientes": pacientes,
                "requisicoes_pendentes": requisicoes_pendentes,
                "exams_hoje": exams_hoje,
                "faturamento_hoje": float(faturamento_hoje),
            }
        )
