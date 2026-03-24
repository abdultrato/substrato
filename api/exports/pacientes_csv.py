import csv

from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.clinical.models.patient import Patient


class ExportPacientesCSV(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        filename = f"pacientes_{now().date()}.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow(["ID", "Nome"])

        for p in Patient.objects.all():
            writer.writerow([p.id, p.nome])

        return response
