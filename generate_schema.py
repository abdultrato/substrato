#!/usr/bin/env python
"""
Script para gerar schema OpenAPI JSON a partir da estrutura Django
Uso: python generate_schema.py
"""

import json
import os
import sys

from django.core.serializers.json import DjangoJSONEncoder

import sitecustomize  # noqa: F401

# Adiciona o diretório do projeto ao path
sys.path.insert(0, os.path.dirname(__file__))

# Configuração mínima Django para que funcione.
# Mantém o mesmo comportamento do `manage.py` (resolve dev/prod via DJANGO_ENV).
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "platform.settings")

import django

django.setup()


def generate_schema():
    """Gera o schema OpenAPI"""
    from drf_spectacular.generators import SchemaGenerator

    generator = SchemaGenerator(title="Substrato API", version="1.0.0")
    return generator.get_schema(public=True, request=None)


if __name__ == "__main__":
    try:
        schema = generate_schema()

        # Salva o schema em JSON
        with open("frontend-next/schema.json", "w") as f:
            json.dump(schema, f, indent=2, cls=DjangoJSONEncoder)

        sys.exit(0)
    except Exception:
        sys.exit(1)
