from datetime import timedelta

from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.result import Result


def _resolve_result_label(result):
    request = result.request
    exam = request.exams.first() or request.medical_exams.first()
    if exam is not None and getattr(exam, "name", ""):
        return exam.name
    return request.custom_id


class RecentActivityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        since = now() - timedelta(days=1)

        requests_qs = LabRequest.objects.filter(created_at__gte=since).select_related("patient").order_by(
            "-created_at"
        )[:5]

        results_qs = (
            Result.objects.filter(updated_at__gte=since)
            .select_related("request__patient")
            .prefetch_related("request__exams", "request__medical_exams")
            .order_by("-updated_at")[:5]
        )

        invoices_qs = (
            Invoice.objects.filter(created_at__gte=since)
            .select_related("request")
            .order_by("-created_at")[:5]
        )

        return Response(
            {
                "requests": [
                    {
                        "code": r.id,
                        "patient": r.patient.name,
                        "date": r.created_at,
                        "status": r.status,
                    }
                    for r in requests_qs
                ],
                "results": [
                    {
                        "exam": _resolve_result_label(res),
                        "date": res.updated_at,
                    }
                    for res in results_qs
                ],
                "invoices": [
                    {
                        "code": f.id,
                        "total": f.total,
                    }
                    for f in invoices_qs
                ],
            }
        )
