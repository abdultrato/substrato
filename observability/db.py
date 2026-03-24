from django.db import connection
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class DatabaseStatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                row = cursor.fetchone()
            status = "ok" if row and row[0] == 1 else "error"
        except Exception:
            status = "error"

        return Response(
            {
                "database": status,
                "engine": connection.vendor,
            }
        )
