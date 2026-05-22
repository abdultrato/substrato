#!/usr/bin/env python
"""Script para extrair mapeamento completo de modelos e endpoints."""
import os
import sys
import json

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'platform.settings')

import django
django.setup()

from django.apps import apps
from rest_framework.routers import DefaultRouter

# Mapear modelos por app
models_by_app = {}
for app_config in apps.get_app_configs():
    app_name = app_config.name
    if not app_name.startswith(('apps', 'core')):
        continue
    
    for model in app_config.get_models():
        short_app = app_name.replace('apps.', '').replace('core.', '')
        if short_app not in models_by_app:
            models_by_app[short_app] = []
        
        fields = []
        for f in model._meta.get_fields():
            fields.append({
                'nome': f.name,
                'tipo': f.get_internal_type()
            })
        
        models_by_app[short_app].append({
            'modelo': model.__name__,
            'tabela': model._meta.db_table if hasattr(model._meta, 'db_table') else '',
            'campos_total': len(fields),
            'campos': fields[:15]  # Primeiros 15 campos
        })

# Extrair endpoints
print("Lendo schema.json para endpoints...")
try:
    with open('frontend-next/schema.json', 'r', encoding='utf-8') as f:
        schema = json.load(f)
    
    endpoints = {}
    for path, methods in schema.get('paths', {}).items():
        if '/api/v1/' in path:
            # Extrair módulo e recurso
            parts = path.replace('/api/v1/', '').split('/')
            if parts:
                module = parts[0]
                if module not in endpoints:
                    endpoints[module] = []
                endpoints[module].append({
                    'rota': path,
                    'metodos': list(methods.keys()) if isinstance(methods, dict) else []
                })
except Exception as e:
    print(f"Erro ao ler schema: {e}")
    endpoints = {}

# Compilar resultado final
resultado = {
    'modelos_backend': [],
    'endpoints_por_modulo': {},
    'resumo': {
        'total_apps': len(models_by_app),
        'total_modelos': sum(len(v) for v in models_by_app.values()),
        'total_endpoints_modulos': len(endpoints)
    }
}

# Adicionar modelos
for app, modelos in sorted(models_by_app.items()):
    for modelo_info in modelos:
        resultado['modelos_backend'].append({
            'app': app,
            'modelo': modelo_info['modelo'],
            'tabela': modelo_info['tabela'],
            'campos_total': modelo_info['campos_total'],
            'campos': [f['nome'] for f in modelo_info['campos']],
            'tipos': {f['nome']: f['tipo'] for f in modelo_info['campos']},
            'endpoint_existe': any(
                modelo_info['modelo'].lower() in rota.lower() 
                for rotas in endpoints.values() 
                for rota in [r['rota'] for r in rotas]
            )
        })

# Adicionar endpoints
resultado['endpoints_por_modulo'] = endpoints

# Salvar
with open('mapeamento_completo.json', 'w', encoding='utf-8') as f:
    json.dump(resultado, f, indent=2, ensure_ascii=False)

print(f"✓ Mapeamento completo salvo em mapeamento_completo.json")
print(f"  - {resultado['resumo']['total_modelos']} modelos")
print(f"  - {resultado['resumo']['total_endpoints_modulos']} módulos com endpoints")
print(f"  - {len(resultado['modelos_backend'])} modelos mapeados")
