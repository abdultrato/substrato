#!/usr/bin/env python
"""
Script para gerar schema OpenAPI JSON a partir da estrutura Django
Uso: python generate_schema.py
"""
import json
import sys
import os

# Adiciona o diretório do projeto ao path
sys.path.insert(0, os.path.dirname(__file__))

# Configuração mínima Django para que funcione.
# Mantém o mesmo comportamento do `manage.py` (resolve dev/prod via DJANGO_ENV).
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plataforma.settings")

import django
django.setup()

from drf_spectacular.generators import SchemaGenerator

def generate_schema():
    """Gera o schema OpenAPI"""
    generator = SchemaGenerator(title='Substrato API', version='1.0.0')
    schema = generator.get_schema(public=True, request=None)
    return schema

if __name__ == '__main__':
    try:
        schema = generate_schema()
        
        # Salva o schema em JSON
        with open('frontend-next/schema.json', 'w') as f:
            json.dump(schema, f, indent=2)
        
        print("✓ Schema gerado com sucesso em frontend-next/schema.json")
        sys.exit(0)
    except Exception as e:
        print(f"✗ Erro ao gerar schema: {e}")
        sys.exit(1)
