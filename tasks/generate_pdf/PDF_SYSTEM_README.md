# PDF System — Sistema Completo de Geração e Admin Integration

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Quick Start](#quick-start)
4. [Componentes](#componentes)
5. [Como Usar](#como-usar)
6. [Exemplos Práticos](#exemplos-práticos)
7. [API de Programação](#api-de-programação)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Este sistema oferece:

1. **Geração de PDFs melhorada** com:
   - Headers personalizados por setor (laboratório, enfermagem, farmácia, etc.)
   - Nomes de instituição dinâmicos (tenant-aware)
   - Fontes amigáveis e legíveis
   - Margens otimizadas para A5
   - Logos com fundo transparente

2. **Atalhos de PDF no Django Admin** com:
   - Botões de download em list views
   - Ações no dropdown
   - URLs customizadas para acesso direto
   - Auto-detection de geradores

3. **Registry centralizado** para mapear models a geradores

---

## 🏗️ Arquitetura

```
tasks/generate_pdf/
├── pdf_improvements.py          # Sistema melhorado de PDFs
│   ├── DocumentType             # Enum com tipos de documentos
│   ├── A5Margins                # Constantes de margem otimizadas
│   ├── build_personalized_header()
│   ├── draw_header_improved()
│   └── Estilos customizados
│
├── pdf_admin_mixin.py           # Atalhos no Admin ✨ NOVO
│   ├── PDFAdminMixin            # Base reutilizável
│   └── SimplePDFAdminMixin      # Auto-detect versão
│
├── pdf_registry.py              # Registry de geradores ✨ NOVO
│   ├── PDF_GENERATORS_REGISTRY  # Instância global
│   └── register_pdf_generator() # Decorator/função
│
└── *_pdf_generator.py           # Geradores específicos
    ├── result_pdf_generator.py
    ├── procedure_pdf_generator.py
    ├── invoice_pdf_generator.py
    └── ... (outros)
```

---

## ⚡ Quick Start

### 1. Usar SimplePDFAdminMixin (Recomendado)

```python
# apps/clinical/admin.py
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(LabResult)
class LabResultAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "patient", "created_at", "get_pdf_button_html"]
    readonly_fields = ["get_pdf_button_html"]
```

**Resultado:**

- ✅ Botão "Download PDF" aparece no admin list view
- ✅ Ação "⬇ Baixar PDF" aparece no dropdown
- ✅ URL `/admin/clinical/labresult/{pk}/download-pdf/` funciona

### 2. Gerar um PDF Manualmente

```python
# Em uma view ou management command
from tasks.generate_pdf import PDF_GENERATORS_REGISTRY

result = LabResult.objects.get(pk=1)
generator = PDF_GENERATORS_REGISTRY.get("clinical", "labresult")

if generator:
    pdf_bytes, filename = generator(result)
    # Fazer algo com pdf_bytes...
```

---

## 📦 Componentes

### pdf_improvements.py

**Propósito:** Sistema melhorado de geração de PDFs

**Principais Classes/Funções:**

| Nome                          | Descrição                                                           |
| ----------------------------- | ------------------------------------------------------------------- |
| `DocumentType`                | Enum com tipos: LABORATORY_RESULT, NURSING_PROCEDURE, INVOICE, etc. |
| `A5Margins`                   | Constantes de margem otimizadas (0.8cm left/right, 3.5cm top)       |
| `build_personalized_header()` | Constrói header dict com titulo, subtitulo, cor, ícone              |
| `draw_header_improved()`      | Desenha header no canvas com logo e sector info                     |
| `title_style_improved()`      | Estilo de título com fonte melhorada                                |
| `section_style_improved()`    | Estilo de seção com cor customizável                                |

### pdf_admin_mixin.py

**Propósito:** Adicionar atalhos de PDF ao Django Admin

**Classes:**

| Classe                | Uso                               | Auto-detect? |
| --------------------- | --------------------------------- | ------------ |
| `PDFAdminMixin`       | Controle manual qual gerador usar | ❌ Não       |
| `SimplePDFAdminMixin` | Auto-detect via registry          | ✅ Sim       |

**Recursos:**

- Botão HTML no list view
- Ação no dropdown
- URL customizada para download
- Tratamento de erros com mensagens ao usuário

### pdf_registry.py

**Propósito:** Mapeamento centralizado de models → geradores

**Uso:**

```python
from tasks.generate_pdf import PDF_GENERATORS_REGISTRY

# Buscar um gerador
gen = PDF_GENERATORS_REGISTRY.get("clinical", "labresult")

# Listar todos
all_generators = PDF_GENERATORS_REGISTRY.list_all()

# Listar por app
clinical_gens = PDF_GENERATORS_REGISTRY.list_by_app("clinical")

# Listar por tipo
lab_gens = PDF_GENERATORS_REGISTRY.list_by_doc_type(DocumentType.LABORATORY_RESULT)
```

---

## 📖 Como Usar

### Opção 1: SimplePDFAdminMixin (Padrão)

Melhor opção quando o gerador já está registrado em `pdf_registry.py`:

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "amount", "get_pdf_button_html"]
    readonly_fields = ["get_pdf_button_html"]
```

### Opção 2: PDFAdminMixin com Controle Manual

Use quando quer customizar qual gerador usar:

```python
from django.contrib import admin
from tasks.generate_pdf import PDFAdminMixin, generate_invoice_pdf

@admin.register(Invoice)
class InvoiceAdmin(PDFAdminMixin, admin.ModelAdmin):
    pdf_generator = generate_invoice_pdf
    pdf_filename_template = "fatura_{pk}.pdf"
    pdf_action_label = "📥 Baixar Fatura"
    pdf_icon_html = "📄"

    list_display = ["id", "amount", "get_pdf_button_html"]
```

### Opção 3: Customizar Completamente

Se precisa de lógica customizada:

```python
from django.contrib import admin
from tasks.generate_pdf import PDFAdminMixin

@admin.register(Invoice)
class InvoiceAdmin(PDFAdminMixin, admin.ModelAdmin):
    pdf_generator = None  # Sem gerador automático

    def get_pdf_generator(self):
        """Custom logic para escolher gerador"""
        # Implementar lógica aqui
        pass

    list_display = ["id", "get_pdf_button_html"]
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Clinical App

```python
# apps/clinical/admin.py
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(LabRequest)
class LabRequestAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "patient", "created_at", "get_pdf_button_html"]
    search_fields = ["patient__name"]

@admin.register(LabResult)
class LabResultAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "request", "created_at", "get_pdf_button_html"]
```

**Resultado no admin:**

- LabRequest list view: Botão PDF, ação dropdown
- LabResult list view: Botão PDF, ação dropdown

### Exemplo 2: Nursing App

```python
# apps/nursing/admin.py
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Procedure)
class ProcedureAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "patient", "procedure_type", "get_pdf_button_html"]
```

### Exemplo 3: Billing App

```python
# apps/billing/admin.py
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "patient", "amount", "get_pdf_button_html"]

@admin.register(Receipt)
class ReceiptAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "invoice", "amount", "get_pdf_button_html"]
```

---

## 🔧 API de Programação

### Gerar PDF Manualmente

```python
from tasks.generate_pdf import PDF_GENERATORS_REGISTRY

# Buscar gerador
lab_result = LabResult.objects.get(pk=123)
generator = PDF_GENERATORS_REGISTRY.get("clinical.labresult")

if generator:
    # Gerar PDF
    pdf_bytes, filename = generator(lab_result)

    # Usar PDF
    with open(f"/tmp/{filename}", "wb") as f:
        f.write(pdf_bytes)
```

### Registrar um Novo Gerador

```python
from tasks.generate_pdf import register_pdf_generator, DocumentType

@register_pdf_generator(
    app_label="myapp",
    model_name="mymodel",
    doc_type=DocumentType.LABORATORY_RESULT,
)
def generate_mymodel_pdf(obj, request=None):
    # Seu código aqui
    pdf_bytes = b"..."
    filename = f"doc_{obj.pk}.pdf"
    return pdf_bytes, filename
```

### Listar Todos os Geradores

```python
from tasks.generate_pdf import PDF_GENERATORS_REGISTRY

# Todos
all_gens = PDF_GENERATORS_REGISTRY.list_all()
for key, entry in all_gens.items():
    print(f"{key}: {entry['description']}")

# Por app
clinical = PDF_GENERATORS_REGISTRY.list_by_app("clinical")

# Por tipo
lab_results = PDF_GENERATORS_REGISTRY.list_by_doc_type(DocumentType.LABORATORY_RESULT)
```

---

## 🚨 Troubleshooting

### Problema: Botão PDF não aparece

**Causas possíveis:**

1. ❌ Mixin não está primeiro na MRO:

   ```python
   # Errado
   class MyAdmin(admin.ModelAdmin, SimplePDFAdminMixin):

   # Correto
   class MyAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
   ```

2. ❌ Gerador não está registrado:

   ```python
   # Verificar registry
   gen = PDF_GENERATORS_REGISTRY.get("myapp", "mymodel")
   print(gen)  # Deve ser uma função, não None
   ```

3. ❌ `get_pdf_button_html` não está em `list_display`:
   ```python
   list_display = ["id", "name", "get_pdf_button_html"]  # Adicionar
   ```

### Problema: Erro ao gerar PDF

**Verificar logs:**

```python
import logging
logging.getLogger("pdf.admin").setLevel(logging.DEBUG)
```

**Causas comuns:**

1. ❌ Logo não encontrada
2. ❌ Tenant não associado ao objeto
3. ❌ DocumentType invalido

### Problema: Filename não está customizado

**Solução:** Especificar `pdf_filename_template`:

```python
class MyAdmin(PDFAdminMixin, admin.ModelAdmin):
    pdf_filename_template = "my_document_{pk}.pdf"
```

---

## 📚 Documentação Completa

- [PDF_IMPROVEMENTS_GUIDE.md](PDF_IMPROVEMENTS_GUIDE.md) — Guia do sistema melhorado
- [ADMIN_INTEGRATION_GUIDE.md](ADMIN_INTEGRATION_GUIDE.md) — Como integrar em cada app
- [CLINICAL_ADMIN_EXAMPLE.py](CLINICAL_ADMIN_EXAMPLE.py) — Exemplos práticos
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) — Como migrar geradores existentes

---

## 🎬 Próximos Passos

1. **Integrar em todas as apps:**

   ```bash
   # apps/clinical/admin.py
   # apps/nursing/admin.py
   # apps/billing/admin.py
   # ... etc
   ```

2. **Registrar geradores faltantes** em `pdf_registry.py`

3. **Criar API endpoint** para downloads programáticos

4. **Adicionar testes** para validar PDFs

5. **Documentar para usuários finais**

---

## 📞 Support

Para dúvidas ou problemas:

1. Consultar [ADMIN_INTEGRATION_GUIDE.md](ADMIN_INTEGRATION_GUIDE.md)
2. Verificar exemplos em [CLINICAL_ADMIN_EXAMPLE.py](CLINICAL_ADMIN_EXAMPLE.py)
3. Revisar logs: `logs/pdf.log`
4. Testar manualmente no Django shell:
   ```python
   from tasks.generate_pdf import PDF_GENERATORS_REGISTRY
   gen = PDF_GENERATORS_REGISTRY.get("clinical", "labresult")
   obj = LabResult.objects.first()
   pdf_bytes, filename = gen(obj)
   ```

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o sistema de geração de PDFs e a sua integração administrativa por domínio.

**Valor que protege.** Protege documentos oficiais, rastreabilidade, consistência visual, tenant-awareness e execução fora do caminho crítico quando necessário.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve garantir atalhos de admin, geradores por modelo, nomes de ficheiro, permissões e exemplos reproduzíveis.

**Para production-ready.** Exige geração resiliente, logging, testes por tipo de documento, controlo de dados sensíveis e fallback operacional.
