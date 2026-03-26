class SoftDeleteMixin:
    def perform_destroy(self, instance):
        instance.delete()
