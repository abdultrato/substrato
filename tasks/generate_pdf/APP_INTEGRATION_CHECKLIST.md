# Implementação por App — Checklist de Integração de Atalhos PDF

## 📋 Estratégia Geral

Para cada app, fazer:

1. ✅ **Abrir `apps/{app}/admin.py`**
2. ✅ **Importar** `SimplePDFAdminMixin`
3. ✅ **Adicionar mixin** a cada admin relevante
4. ✅ **Adicionar** `get_pdf_button_html` ao `list_display`
5. ✅ **Testar** no admin

---

## 🏥 App: clinical

**Models com PDF:**

- [ ] LabRequest → PDF requisição
- [ ] LabResult → PDF resultado
- [ ] Patient → PDF histórico

**Código a Adicionar:**

```python
# apps/clinical/admin.py
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(LabRequest)
class LabRequestAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]

@admin.register(LabResult)
class LabResultAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    list_display = [..., "get_pdf_button_html"]

@admin.register(Patient)
class PatientAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    list_display = [..., "get_pdf_button_html"]
```

**Teste:**

```bash
# 1. Abrir Django admin
python manage.py runserver

# 2. Ir a http://localhost:8000/admin/clinical/
# 3. Clicar em LabRequest list view
# 4. Ver botão "📄 PDF" em cada linha
# 5. Clicar para baixar
```

---

## 👩‍⚕️ App: nursing

**Models com PDF:**

- [ ] Procedure → PDF procedimento

**Código a Adicionar:**

```python
# apps/nursing/admin.py
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Procedure)
class ProcedureAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]
```

---

## 💊 App: pharmacy

**Models com PDF:**

- [ ] Movement → PDF movimentos (já tem gerador)
- [ ] Product → Sem gerador (opcional)
- [ ] Inventory → Sem gerador (opcional)

**Código a Adicionar:**

```python
# apps/pharmacy/admin.py
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Movement)
class MovementAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]

@admin.register(Product)
class ProductAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    # Sem PDF por enquanto (opcional adicionar depois)
```

---

## 💰 App: billing

**Models com PDF:**

- [ ] Invoice → PDF fatura
- [ ] Receipt → PDF recibo

**Código a Adicionar:**

```python
# apps/billing/admin.py
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]

@admin.register(Receipt)
class ReceiptAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    list_display = [..., "get_pdf_button_html"]
```

---

## 💳 App: payments

**Models com PDF:**

- [ ] Payment → Sem gerador (opcional criar)

**Ação:** Deixar por enquanto (sem gerador registrado)

```python
# apps/payments/admin.py
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Payment)
class PaymentAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    # ... existing config ...
    # Sem PDF registrado por enquanto
```

---

## 👥 App: human_resources

**Models com PDF:**

- [ ] Employee → Sem gerador (opcional)
- [ ] Payroll → Sem gerador (opcional)
- [ ] Contract → Sem gerador (opcional)

**Ação:** Deixar por enquanto (sem geradores registrados)

```python
# apps/human_resources/admin.py
from tasks.generate_pdf import SimplePDFAdminMixin

# Adicionar mixin quando houver geradores
```

---

## 🚪 App: reception

**Models com PDF:**

- [ ] Appointment → Sem gerador (opcional)
- [ ] Check → Sem gerador (opcional)

**Ação:** Deixar por enquanto (sem geradores registrados)

---

## 🔬 App: monitoring

**Models com PDF:**

- [ ] MonitoringRecord → Sem gerador (opcional)

**Ação:** Deixar por enquanto

---

## 🏥 App: consultations

**Models com PDF:**

- [ ] Consultation → Sem gerador (opcional)

**Ação:** Deixar por enquanto

---

## 🏥 App: accounting

**Models com PDF:**

- [ ] Transaction → Sem gerador (opcional)

**Ação:** Deixar por enquanto

---

## 🔄 Passo-a-Passo Detalhado

### Passo 1: Editar apps/clinical/admin.py

```bash
# Abrir arquivo
code apps/clinical/admin.py
```

Adicionar no topo do arquivo:

```python
from tasks.generate_pdf import SimplePDFAdminMixin
```

Modificar cada admin:

```python
# ANTES
@admin.register(LabRequest)
class LabRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "patient", "doctor", "created_at"]

# DEPOIS
@admin.register(LabRequest)
class LabRequestAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = ["id", "patient", "doctor", "created_at", "get_pdf_button_html"]
    readonly_fields = ["get_pdf_button_html"]  # Adicionar se quiser mostrar no change view
```

### Passo 2: Repetir para nursing, billing, pharmacy

```python
# apps/nursing/admin.py
from tasks.generate_pdf import SimplePDFAdminMixin

@admin.register(Procedure)
class ProcedureAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
```

### Passo 3: Testar cada app

```bash
# Terminal
python manage.py runserver

# Abrir http://localhost:8000/admin/
# Testar cada app:
# - clinical/labrequest/
# - clinical/labresult/
# - nursing/procedure/
# - billing/invoice/
# - billing/receipt/
# - pharmacy/movement/
```

### Passo 4: Verificar se funciona

Na list view de cada model:

1. ✅ Ver botão "📄 PDF" em cada linha
2. ✅ Clicar e baixar PDF
3. ✅ Abrir PDF e verificar conteúdo
4. ✅ Testar ação "Baixar PDF" no dropdown (select 1 item)

---

## 📋 Checklist Completo

### clinical/admin.py

- [ ] Adicionar import: `from tasks.generate_pdf import SimplePDFAdminMixin`
- [ ] LabRequest: Adicionar `SimplePDFAdminMixin`, `get_pdf_button_html` ao list_display
- [ ] LabResult: Adicionar `SimplePDFAdminMixin`, `get_pdf_button_html` ao list_display
- [ ] Patient: Adicionar `SimplePDFAdminMixin`, `get_pdf_button_html` ao list_display
- [ ] Testar no admin (http://localhost:8000/admin/clinical/)

### nursing/admin.py

- [ ] Adicionar import: `from tasks.generate_pdf import SimplePDFAdminMixin`
- [ ] Procedure: Adicionar `SimplePDFAdminMixin`, `get_pdf_button_html` ao list_display
- [ ] Testar no admin (http://localhost:8000/admin/nursing/)

### billing/admin.py

- [ ] Adicionar import: `from tasks.generate_pdf import SimplePDFAdminMixin`
- [ ] Invoice: Adicionar `SimplePDFAdminMixin`, `get_pdf_button_html` ao list_display
- [ ] Receipt: Adicionar `SimplePDFAdminMixin`, `get_pdf_button_html` ao list_display
- [ ] Testar no admin (http://localhost:8000/admin/billing/)

### pharmacy/admin.py

- [ ] Adicionar import: `from tasks.generate_pdf import SimplePDFAdminMixin`
- [ ] Movement: Adicionar `SimplePDFAdminMixin`, `get_pdf_button_html` ao list_display
- [ ] Testar no admin (http://localhost:8000/admin/pharmacy/)

### Verificação Final

- [ ] Todos os admins têm mixin
- [ ] Todos têm `get_pdf_button_html` no list_display
- [ ] Todos os PDFs baixam sem erros
- [ ] Nomes de arquivo estão corretos
- [ ] PDFs abrem sem problemas

---

## 🐛 Troubleshooting Durante Integração

### Erro: "AttributeError: 'list' object has no attribute 'get_pdf_button_html'"

**Causa:** `get_pdf_button_html` não é uma coluna real do model

**Solução:** Adicionar ao `readonly_fields`:

```python
@admin.register(Invoice)
class InvoiceAdmin(SimplePDFAdminMixin, admin.ModelAdmin):
    list_display = [..., "get_pdf_button_html"]
    readonly_fields = [..., "get_pdf_button_html"]  # ← Adicionar
```

### Erro: "Module not found: tasks.generate_pdf"

**Causa:** Module não está instalado ou está com erro de importação

**Solução:**

```bash
# Verificar se arquivo existe
ls tasks/generate_pdf/__init__.py

# Testar import
python manage.py shell
>>> from tasks.generate_pdf import SimplePDFAdminMixin
# Deve funcionar sem erros
```

### Erro: "No generator found for model"

**Causa:** Gerador não está registrado em `pdf_registry.py`

**Solução:** Verificar se está em `_register_builtin_generators()`:

```python
# tasks/generate_pdf/pdf_registry.py
PDF_GENERATORS_REGISTRY.register(
    app_label="clinical",
    model_name="labresult",
    generator=generate_results_pdf,
    doc_type=DocumentType.LABORATORY_RESULT,
)
```

### Botão não aparece no admin

**Verificar:**

1. ✅ Mixin está primeiro: `class MyAdmin(SimplePDFAdminMixin, admin.ModelAdmin):`
2. ✅ `get_pdf_button_html` está em `list_display`
3. ✅ Gerador está registrado no registry
4. ✅ Sem erros de importação

```python
# Testar manualmente
from tasks.generate_pdf import PDF_GENERATORS_REGISTRY
gen = PDF_GENERATORS_REGISTRY.get("clinical", "labresult")
print(gen)  # Deve retornar uma função, não None
```

---

## 📊 Resumo de Mudanças

| App             | Models                         | Ação                    |
| --------------- | ------------------------------ | ----------------------- |
| clinical        | LabRequest, LabResult, Patient | ✅ Integrar agora       |
| nursing         | Procedure                      | ✅ Integrar agora       |
| billing         | Invoice, Receipt               | ✅ Integrar agora       |
| pharmacy        | Movement                       | ✅ Integrar agora       |
| payments        | Payment                        | ⏳ Criar gerador depois |
| human_resources | Employee, Payroll              | ⏳ Criar gerador depois |
| reception       | Appointment, Check             | ⏳ Criar gerador depois |
| accounting      | Transaction                    | ⏳ Criar gerador depois |

---

## 🎯 Próximo Passo

Depois de integrar em todas as apps:

1. **Criar geradores faltantes:**
   - Payment PDF
   - Employee PDF
   - Appointment PDF
   - etc.

2. **Adicionar API endpoint:**
   - `GET /api/pdf/{app}/{model}/{pk}/`

3. **Criar testes automatizados:**
   - Testar download de cada PDF
   - Validar conteúdo do PDF

4. **Documentar para usuários finais:**
   - Como gerar PDFs
   - Onde encontrar nos admins
   - Quais PDFs estão disponíveis

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
