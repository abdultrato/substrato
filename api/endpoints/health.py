from django.db import connection
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            connection.ensure_connection()
            db_ok = True
        except Exception:
            db_ok = False

        return Response({"database": db_ok, "status": "ok" if db_ok else "error"})
