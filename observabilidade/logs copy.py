import os

from django.conf import settings
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class LogsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        log_file = os.path.join(settings.BASE_DIR, "logs", "app.log")

        if not os.path.exists(log_file):
            return Response({"logs": []})

        with open(log_file, encoding="utf-8") as f:
            lines = f.readlines()[-100:]

        return Response({"last_lines": lines})
