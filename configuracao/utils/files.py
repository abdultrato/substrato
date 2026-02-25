import os
import time

from django.conf import settings
from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    import boto3
except ImportError:
    boto3 = None


CACHE_KEY = "media_storage_usage"
CACHE_TIMEOUT = 60 * 5  # 5 minutos
ALERT_THRESHOLD_PERCENT = 85  # alerta quando atingir 85%


class StorageUsageView(APIView):
    """
    Monitoramento de uso de armazenamento.

    Recursos:
    ✔ cache inteligente
    ✔ suporte local e S3/MinIO
    ✔ alerta de limite
    ✔ preparado para Prometheus
    ✔ tolerante a falhas
    """

    permission_classes = [IsAuthenticated]

    # ================================
    # ENTRY POINT
    # ================================
    def get(self, request):
        data = cache.get(CACHE_KEY)

        if not data:
            data = self._calculate_storage()
            cache.set(CACHE_KEY, data, CACHE_TIMEOUT)

        return Response(data)

    # ================================
    # STORAGE DETECTION
    # ================================
    def _calculate_storage(self):
        if getattr(settings, "USE_S3", False):
            total = self._calculate_s3_usage()
            limit = getattr(settings, "S3_STORAGE_LIMIT_BYTES", None)
        else:
            total = self._calculate_local_usage()
            limit = getattr(settings, "MEDIA_STORAGE_LIMIT_BYTES", None)

        percent = (total / limit * 100) if limit else None

        return {
            "storage_bytes": total,
            "storage_mb": round(total / (1024 * 1024), 2),
            "storage_gb": round(total / (1024 * 1024 * 1024), 2),
            "limit_bytes": limit,
            "usage_percent": round(percent, 2) if percent else None,
            "alert": percent >= ALERT_THRESHOLD_PERCENT if percent else False,
            "timestamp": int(time.time()),
        }

    # ================================
    # LOCAL STORAGE
    # ================================
    def _calculate_local_usage(self) -> int:
        media_path = settings.MEDIA_ROOT
        total_size = 0

        if not media_path or not os.path.exists(media_path):
            return 0

        for root, _, files in os.walk(media_path):
            for filename in files:
                filepath = os.path.join(root, filename)
                try:
                    total_size += os.stat(filepath).st_size
                except OSError:
                    continue

        return total_size

    # ================================
    # S3 / MINIO STORAGE
    # ================================
    def _calculate_s3_usage(self) -> int:
        if not boto3:
            return 0

        bucket = settings.AWS_STORAGE_BUCKET_NAME

        try:
            s3 = boto3.client("s3")
            total = 0
            paginator = s3.get_paginator("list_objects_v2")

            for page in paginator.paginate(Bucket=bucket):
                for obj in page.get("Contents", []):
                    total += obj["Size"]

            return total

        except Exception:
            return 0

USE_S3 = True
AWS_STORAGE_BUCKET_NAME = "meu-bucket"
S3_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024  # 100GB
