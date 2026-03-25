from django.db import models
from django.utils import timezone


class TimestampMixin(models.Model):
    """
    Timestamp mixin (`created_at`, `updated_at`).
    """

    created_at = models.DateTimeField(
        editable=False,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        db_index=True,
    )

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        now_value = timezone.now()

        if not self.pk:
            self.created_at = now_value

        self.updated_at = now_value

        super().save(*args, **kwargs)

    def touch(self, update_fields=None):
        """
        Updates `updated_at` without touching `created_at`.
        """
        self.updated_at = timezone.now()

        if update_fields:
            update_fields = set(update_fields)
            update_fields.add("updated_at")
        else:
            update_fields = ["updated_at"]

        self.save(update_fields=update_fields)


TimeStampMixin = TimestampMixin
