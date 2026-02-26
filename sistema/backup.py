import os
import subprocess
from datetime import datetime

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView


class BackupDatabaseView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):

        db = settings.DATABASES["default"]

        if db["ENGINE"] != "django.db.backends.postgresql":
            raise Http404("Backup automático suportado apenas para PostgreSQL.")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{timestamp}.sql"
        backup_path = os.path.join(settings.BASE_DIR, filename)

        comando = [
            "pg_dump",
            "-h",
            db["HOST"],
            "-U",
            db["USER"],
            "-F",
            "c",
            "-f",
            backup_path,
            db["NAME"],
        ]

        env = os.environ.copy()
        env["PGPASSWORD"] = db["PASSWORD"]

        subprocess.run(comando, env=env, check=True)

        return FileResponse(
            open(backup_path, "rb"),
            as_attachment=True,
            filename=filename,
        )
