import csv

from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.clinical.models.patient import Patient


class ExportPatientsCSV(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        filename = f"patients_{now().date()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["ID", "Name"])

        for patient in Patient.objects.all():
            writer.writerow([patient.id, patient.nome])

        return response
