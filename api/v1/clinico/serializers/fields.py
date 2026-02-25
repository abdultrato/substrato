from rest_framework import serializers as s


class UppercaseCharField(s.CharField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return value.upper()


class LowercaseEmailField(s.EmailField):
    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        return value.lower()
