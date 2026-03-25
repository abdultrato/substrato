from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()

        if not q:
            return Response(
                {
                    "pacientes": [],
                    "requisicoes": [],
                }
            )

        patients = list(
            Patient.objects.filter(
                Q(name__icontains=q) | Q(document_number__icontains=q) | Q(custom_id__icontains=q)
            ).values("id", "custom_id", "name")[:10]
        )

        lab_requests = list(
            LabRequest.objects.filter(Q(custom_id__icontains=q) | Q(patient__name__icontains=q))
            .select_related("patient")
            .values("id", "custom_id", "patient__name")[:10]
        )

        return Response(
            {
                "pacientes": patients,
                "requisicoes": lab_requests,
            }
        )
