from django.contrib.auth import get_user_model
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

User = get_user_model()


class UserViewSet(ModelViewSet):
    queryset = User.objects.all().order_by("username")
    permission_classes = [IsAdminUser]
    fields = [
        "id",
        "username",
        "first_name",
        "last_name",
        "email",
        "is_active",
        "is_staff",
    ]

    def list(self, request, *args, **kwargs):
        user_records = self.get_queryset().values(*self.fields)
        return Response(user_records)

    def retrieve(self, request, pk=None):
        user_record = self.get_queryset().filter(pk=pk).values(*self.fields).first()
        return Response(user_record)

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=["is_active"])
        return Response({"status": "activated"})

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"status": "deactivated"})
"""Utilitários de gerenciamento de usuários (criação, reset, lookup)."""
