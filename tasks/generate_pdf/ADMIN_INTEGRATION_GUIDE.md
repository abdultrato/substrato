# Admin Integration Guide — Adicionar Atalhos de PDF em Cada App

## Visão Geral

O sistema de PDF agora fornece um **mixin reutilizável** que adiciona automaticamente botões de download de PDF no Django Admin. Isso permite que cada model relevante tenha um atalho para gerar seu PDF com mínimas mudanças no código.

## Quick Start

### Opção 1: SimplePDFAdminMixin (Recomendado)

Para usar automaticamente o gerador registrado:

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... seu código normal ...
    pass  # Automaticamente usa o gerador registrado!
```

### Opção 2: PDFAdminMixin (Customizado)

Se você quer controlar qual gerador usar:

```python
from django.contrib import admin
from tasks.generate_pdf import PDFAdminMixin, generate_invoice_pdf

@admin.register(Invoice)
class InvoiceAdmin(PDFAdminMixin, admin.ModelAdmin):
    pdf_generator = generate_invoice_pdf
    pdf_filename_template = "fatura_{pk}.pdf"
    pdf_action_label = "⬇ Baixar Fatura"

    # ... resto da configuração ...
```

## Mudanças por App

### 1. **apps/clinical/admin.py**

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin, PDFAdminMixin, generate_results_pdf, generate_request_pdf
from .models import LabRequest, LabResult, Patient

@admin.register(LabRequest)
class LabRequestAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Usa automaticamente: PDF_GENERATORS_REGISTRY["clinical.labrequest"]
    list_display = ("id", "patient", "created_at", "get_pdf_button_html")
    readonly_fields = ["get_pdf_button_html"]

@admin.register(LabResult)
class LabResultAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Usa automaticamente: PDF_GENERATORS_REGISTRY["clinical.labresult"]
    list_display = ("id", "request", "created_at", "get_pdf_button_html")

@admin.register(Patient)
class PatientAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Usa automaticamente: PDF_GENERATORS_REGISTRY["clinical.patient"]
    list_display = ("id", "name", "get_pdf_button_html")
```

### 2. **apps/nursing/admin.py**

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin
from .models import Procedure

@admin.register(Procedure)
class ProcedureAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Usa automaticamente: PDF_GENERATORS_REGISTRY["nursing.procedure"]
    list_display = ("id", "patient", "created_at", "get_pdf_button_html")
    fieldsets = (
        ("Informações", {"fields": ("patient", "procedure_type", "created_at")}),
        ("PDF", {"fields": ("get_pdf_button_html",)}),
    )
```

### 3. **apps/billing/admin.py**

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin
from .models import Invoice, Receipt

@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Usa automaticamente: PDF_GENERATORS_REGISTRY["billing.invoice"]
    list_display = ("id", "patient", "amount", "created_at", "get_pdf_button_html")
    search_fields = ("patient__name", "invoice_number")

@admin.register(Receipt)
class ReceiptAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Usa automaticamente: PDF_GENERATORS_REGISTRY["billing.receipt"]
    list_display = ("id", "invoice", "amount", "created_at", "get_pdf_button_html")
```

### 4. **apps/pharmacy/admin.py**

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin
from .models import Movement, Product, Inventory

@admin.register(Movement)
class MovementAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Usa automaticamente: PDF_GENERATORS_REGISTRY["pharmacy.movement"]
    list_display = ("id", "product", "type", "quantity", "created_at", "get_pdf_button_html")

@admin.register(Product)
class ProductAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Opcional: Sem gerador registrado, o mixin não adiciona nada
    list_display = ("id", "name", "category")

@admin.register(Inventory)
class InventoryAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ("id", "product", "quantity", "get_pdf_button_html")
```

### 5. **apps/human_resources/admin.py**

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin
from .models import Employee, Payroll

@admin.register(Employee)
class EmployeeAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Se houver gerador registrado
    list_display = ("id", "name", "position", "get_pdf_button_html")

@admin.register(Payroll)
class PayrollAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Se houver gerador registrado
    list_display = ("id", "employee", "month", "amount", "get_pdf_button_html")
```

### 6. **apps/payments/admin.py**

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Se houver gerador registrado
    list_display = ("id", "invoice", "amount", "paid_at", "get_pdf_button_html")
```

### 7. **apps/reception/admin.py**

```python
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin
from .models import Appointment, Check

@admin.register(Appointment)
class AppointmentAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Se houver gerador registrado
    list_display = ("id", "patient", "doctor", "date", "get_pdf_button_html")

@admin.register(Check)
class CheckAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # Se houver gerador registrado
    list_display = ("id", "patient", "date", "get_pdf_button_html")
```

## Recursos do PDFAdminMixin

### 1. **Botão no Admin List View**

Use `get_pdf_button_html` no `readonly_fields` e `list_display`:

```python
@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ("id", "patient", "amount", "get_pdf_button_html")
    readonly_fields = ["get_pdf_button_html"]
    fieldsets = (
        ("Informações", {"fields": ("patient", "amount")}),
        ("Ações", {"fields": ("get_pdf_button_html",)}),
    )
```

### 2. **Ação em Dropdown**

Automaticamente adiciona "⬇ Baixar PDF" no dropdown de ações:

```python
# No admin, selecione 1 item e clique em "Baixar PDF"
```

### 3. **URL Customizada**

Acesse direto: `/admin/app/model/{pk}/download-pdf/`

### 4. **Customizar Label e Ícone**

```python
@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    pdf_action_label = "📥 Download Fatura (PDF)"
    pdf_icon_html = "📄"  # Mudad ícone do botão
```

## Registrando Novos Geradores

Se criar um novo gerador de PDF, registre no `pdf_registry.py`:

```python
from tasks.generate_pdf import register_pdf_generator, DocumentType

@register_pdf_generator(
    app_label="myclinic",
    model_name="mymodel",
    doc_type=DocumentType.LABORATORY_RESULT,
    description="Meu PDF customizado"
)
def generate_my_model_pdf(obj, request=None):
    # ... seu código de geração ...
    pdf_bytes = b"..."
    filename = f"doc_{obj.pk}.pdf"
    return pdf_bytes, filename
```

Ou usando a função:

```python
from tasks.generate_pdf import register_pdf_generator

register_pdf_generator(
    app_label="clinical",
    model_name="custommodel",
    generator=generate_custom_pdf,
)
```

## Troubleshooting

### Problema: "Gerador não encontrado"

**Solução**: Verifique se o gerador está registrado em `pdf_registry.py` com o mesmo app_label e model_name.

### Problema: Botão não aparece no admin

**Solução**:

1. Confirm o mixin está primeiro na ordem de herança: `class MyAdmin(SimplePDFAdminMixin, admin.ModelAdmin):`
2. Verifique se um gerador está registrado para este modelo
3. Adicione `get_pdf_button_html` ao `list_display` e `readonly_fields`

### Problema: "Erro ao gerar PDF"

Verifique os logs: `python manage.py tail logs/pdf.log`

## Checklist de Integração

- [ ] Adicionar `SimplePDFAdminMixin` a todos os admins relevantes
- [ ] Criar/registrar geradores de PDF para cada modelo
- [ ] Testar botão "Download PDF" no admin
- [ ] Testar ação em dropdown de ações
- [ ] Verificar nomes de arquivo gerados
- [ ] Testar em múltiplos navegadores
- [ ] Documentar PDFs disponíveis para usuários finais

## Estrutura da Aplicação

```
tasks/generate_pdf/
├── __init__.py                          # Exportações públicas
├── pdf_admin_mixin.py                   # Mixin para Django Admin ✨ NOVO
├── pdf_registry.py                      # Registry de geradores ✨ NOVO
├── pdf_improvements.py                  # Sistema melhorado de PDFs
├── pdf_base.py                          # Utilidades base
├── result_pdf_generator.py
├── procedure_pdf_generator.py
├── invoice_pdf_generator.py
├── request_pdf_generator.py
├── ... (outros geradores)
└── ADMIN_INTEGRATION_GUIDE.md           # Este arquivo
```

## Próximos Passos

1. **Integrar SimplePDFAdminMixin** em cada app admin.py
2. **Registrar novos geradores** para modelos sem PDF
3. **Criar API endpoint** para downloads programáticos: `GET /api/pdf/{model}/{pk}/`
4. **Adicionar testes** para PDF generation e admin integration
