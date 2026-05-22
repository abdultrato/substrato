# Cheat Sheet — PDF Admin Shortcuts Quick Start

## ⚡ 30 Segundos: Como Adicionar PDF Buttons ao Admin

### 1️⃣ Abrir admin.py da sua app

```bash
code apps/myapp/admin.py
```

### 2️⃣ Adicionar import

```python
from tasks.generate_pdf import SimplePDFAdminMixin
```

### 3️⃣ Adicionar mixin + button

```python
# ANTES:
@admin.register(MyModel)
class MyModelAdmin(admin.ModelAdmin):
    list_display = ["id", "name"]

# DEPOIS:
@admin.register(MyModel)
class MyModelAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "name", "get_pdf_button_html"]
    readonly_fields = ["get_pdf_button_html"]
```

### 4️⃣ Pronto! ✅

- Botão "📄 PDF" aparece no list view
- Ação "⬇ Baixar PDF" aparece no dropdown

---

## 🎯 Caso de Uso: LabResult

```python
# apps/clinical/admin.py
from django.contrib import admin
from tasks.generate_pdf import SimplePDFAdminMixin
from .models import LabResult

@admin.register(LabResult)
class LabResultAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [
        "id",
        "request",
        "test_type",
        "result_value",
        "created_at",
        "get_pdf_button_html",  # ← Adicionar isto
    ]
    readonly_fields = ["created_at", "get_pdf_button_html"]  # ← E isto
```

**No admin:**

- http://localhost:8000/admin/clinical/labresult/
- Vê botão "📄 PDF" em cada linha
- Click → Download PDF

---

## 📝 Todas as Apps (Copia e Cola)

### clinical/admin.py

```python
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(LabRequest)
class LabRequestAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]

@admin.register(LabResult)
class LabResultAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]

@admin.register(Patient)
class PatientAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]
```

### nursing/admin.py

```python
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Procedure)
class ProcedureAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]
```

### billing/admin.py

```python
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]

@admin.register(Receipt)
class ReceiptAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]
```

### pharmacy/admin.py

```python
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Movement)
class MovementAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]
```

---

## 🔧 Customizações

### Mudar label do botão

```python
class MyModelAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    pdf_action_label = "📥 Download PDF"
    pdf_icon_html = "📄"  # Mudar ícone
```

### Usar gerador específico (sem auto-detect)

```python
from tasks.generate_pdf import PDFAdminMixin, generate_invoice_pdf

class InvoiceAdmin(PDFAdminMixin, admin.ModelAdmin):
    pdf_generator = generate_invoice_pdf
    pdf_filename_template = "fatura_{pk}.pdf"
```

### Apenas na change view (não list)

```python
class MyModelAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    readonly_fields = ["get_pdf_button_html"]
    # Não adicionar ao list_display
```

---

## 🧪 Teste Rápido

```bash
# 1. Start server
python manage.py runserver

# 2. Ir para admin
open http://localhost:8000/admin/

# 3. Ir para clinical/labresult/

# 4. Ver botão "📄 PDF"

# 5. Click → PDF baixa
```

---

## ✅ Checklist

- [ ] Adicionar import `SimplePDFAdminMixin` em cada admin.py
- [ ] Adicionar mixin a cada admin relevante
- [ ] Adicionar `get_pdf_button_html` ao `list_display`
- [ ] Adicionar `get_pdf_button_html` ao `readonly_fields`
- [ ] Testar: Botão aparece no admin list view
- [ ] Testar: Click no botão baixa PDF
- [ ] Testar: Ação "Baixar PDF" no dropdown funciona
- [ ] Testar: Arquivo PDF abre/é legível

---

## 🆘 Problemas Comuns

| Problema           | Solução                                         |
| ------------------ | ----------------------------------------------- |
| Botão não aparece  | Adicionar ao `list_display` + `readonly_fields` |
| Click não funciona | Mixin deve estar PRIMEIRO na herança            |
| PDF não baixa      | Gerador não registrado (ver `pdf_registry.py`)  |
| Erro 500           | Verificar logs: `logs/pdf.log`                  |

---

## 📚 Docs Completas

- [PDF_SYSTEM_README.md](PDF_SYSTEM_README.md) — Visão geral completa
- [ADMIN_INTEGRATION_GUIDE.md](ADMIN_INTEGRATION_GUIDE.md) — Guia detalhado
- [APP_INTEGRATION_CHECKLIST.md](APP_INTEGRATION_CHECKLIST.md) — Checklist por app
- [CLINICAL_ADMIN_EXAMPLE.py](CLINICAL_ADMIN_EXAMPLE.py) — Código completo exemplo

---

## 🚀 Pronto!

3 linhas = PDF buttons em todo o admin:

```python
from tasks.generate_pdf import SimplePDFAdminMixin

class MyAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
```

Boom. Feito. 💥
