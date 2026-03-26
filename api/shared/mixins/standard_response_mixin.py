from rest_framework import status
from rest_framework.response import Response


class StandardResponseMixin:
    def success_response(self, data=None, status_code=status.HTTP_200_OK, **extra):
        payload = {"success": True, "data": data}
        payload.update(extra)
        return Response(payload, status=status_code)

    def error_response(self, message, status_code=status.HTTP_400_BAD_REQUEST, **extra):
        payload = {"success": False, "error": message}
        payload.update(extra)
        return Response(payload, status=status_code)
