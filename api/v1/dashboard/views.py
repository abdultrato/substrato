from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.compat import LegacyAliasSerializerMixin
from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from domain.clinical.result_state import ResultState
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated


class DashboardStatsSerializer(LegacyAliasSerializerMixin, serializers.Serializer):
    patients = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    exams_today = serializers.IntegerField()
    billing_today = serializers.FloatField()
    legacy_output_aliases = {
        "pacientes": "patients",
        "requisicoes_pendentes": "pending_requests",
        "exams_hoje": "exams_today",
        "faturamento_hoje": "billing_today",
    }


class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: DashboardStatsSerializer})
    def get(self, request):
        tenant = getattr(request, "tenant", None)

        patients_qs = Patient.objects.all()
        requests_qs = LabRequest.objects.all()
        invoices_qs = Invoice.objects.all()

        if tenant is not None:
            patients_qs = patients_qs.filter(tenant=tenant)
            requests_qs = requests_qs.filter(tenant=tenant)
            invoices_qs = invoices_qs.filter(tenant=tenant)

        today = timezone.localdate()

        patients = patients_qs.count()
        pending_requests = requests_qs.filter(status=ResultState.PENDING).count()
        exams_today = requests_qs.filter(created_at__date=today).count()

        billing_today = invoices_qs.filter(created_at__date=today).aggregate(total=Sum("total"))["total"] or Decimal(
            "0.00"
        )

        payload = {
            "patients": patients,
            "pending_requests": pending_requests,
            "exams_today": exams_today,
            "billing_today": float(billing_today),
        }
        return Response(DashboardStatsSerializer(instance=payload).data)
