import os
import shutil
from datetime import datetime

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView


class BackupDatabaseView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        db_path = settings.DATABASES["default"]["NAME"]

        if not os.path.exists(db_path):
            raise Http404("Database não encontrada.")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}.sqlite3"
        backup_path = os.path.join(settings.BASE_DIR, backup_name)

        shutil.copy(db_path, backup_path)

        return FileResponse(
            open(backup_path, "rb"),
            as_attachment=True,
            filename=backup_name,
        )
