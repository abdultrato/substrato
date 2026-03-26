from django.db.models import Count, Sum
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = now().date()

        data = {
            "total_patients": Patient.objects.count(),
            "requests_today": LabRequest.objects.filter(created_at__date=today).count(),
            "pending_results": Result.objects.filter(finalized=False).count(),
            "total_revenue": Invoice.objects.aggregate(total=Sum("total"))["total"] or 0,
            "requests_by_status": list(
                LabRequest.objects.values("status").annotate(total=Count("id")).order_by()
            ),
        }

        return Response(data)
