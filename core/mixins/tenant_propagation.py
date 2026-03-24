class PropagarInquilinoMixin:
    """
    Propaga automaticamente o inquilino a partir de relações.
    """

    fonte_inquilino = None

    def resolver_inquilino(self):
        if not self.fonte_inquilino:
            return None

        obj = getattr(self, self.fonte_inquilino, None)

        if not obj:
            return None

        return getattr(obj, "inquilino", None)

    def save(self, *args, **kwargs):
        if not getattr(self, "inquilino", None):
            inquilino = self.resolver_inquilino()

            if inquilino:
                self.inquilino = inquilino

        super().save(*args, **kwargs)
