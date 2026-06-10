# Patch — QR e código de barras nos cantos do PDF institucional

Este patch orientado deve ser aplicado em:

```text
tasks/generate_pdf/institutional_pdf_design.py
```

Motivo: faturas e outros PDFs financeiros usam o design institucional, não apenas `pdf_base.py`.

---

## Objetivo visual

Todos os PDFs institucionais devem ter:

1. **QR Code** no quadrante superior direito, quase a transbordar pela borda superior/direita.
2. **Código de barras Code128** no quadrante inferior direito, vertical, quase a transbordar pela borda inferior/direita.

---

## 1. Atualizar docstring inicial

Trocar as linhas:

```text
- QR Code verificável (topo direito)
- Código de barras no header com dados essenciais
```

por:

```text
- QR Code verificável no quadrante superior direito, quase a transbordar
- Código de barras vertical no quadrante inferior direito, quase a transbordar
```

---

## 2. Adicionar constantes de posicionamento

Depois de:

```python
PDF_BODY_LEADING = 12
PDF_TITLE_LEADING = 13
```

adicionar:

```python
# Elementos máquina-legíveis nas extremidades da página.
# Mantêm-se fora da área útil do texto para não comprometer o layout.
PDF_CORNER_BLEED_INSET = 0.03 * cm
PDF_CORNER_QR_SIZE = 1.85 * cm
PDF_CORNER_BARCODE_HEIGHT = 0.40 * cm
PDF_CORNER_BARCODE_WIDTH = 0.28
```

---

## 3. Atualizar `draw_institutional_corner_barcode`

Substituir a função actual por:

```python
def draw_institutional_corner_barcode(canvas_obj, doc) -> None:
    """Código de barras vertical no quadrante inferior direito, quase a
    transbordar pela margem direita e inferior da página.

    A origem fica colada ao canto inferior direito; a rotação de 90° faz o
    comprimento subir pela lateral direita sem ocupar o corpo do documento.
    """
    value = getattr(doc, "barcode_value", None)
    payload = _sanitize_institutional_barcode(value)
    if not payload:
        return

    page_w, _page_h = doc.pagesize
    try:
        bar = code128.Code128(
            payload,
            barHeight=PDF_CORNER_BARCODE_HEIGHT,
            barWidth=PDF_CORNER_BARCODE_WIDTH,
        )
        bar.humanReadable = False

        canvas_obj.saveState()
        canvas_obj.translate(page_w - PDF_CORNER_BLEED_INSET, PDF_CORNER_BLEED_INSET)
        canvas_obj.rotate(90)
        bar.drawOn(canvas_obj, 0, 0)
        canvas_obj.restoreState()
    except Exception as err:
        logger.warning("Falha ao desenhar código de barras de canto.", exc_info=err)
```

---

## 4. Atualizar QR Code em `draw_institutional_header`

Substituir o bloco actual:

```python
    # QR Code topo direito (enquadrado na banda do header)
    qr_x = None
    if hasattr(doc, "qr_url") and doc.qr_url:
        qr = generate_institutional_qr_code(doc.qr_url)
        if qr:
            qr_size = 1.7 * cm
            qr_x = page_w - right_margin - qr_size
            qr_y = page_h - 0.25 * cm - qr_size
            canvas_obj.drawImage(qr, qr_x, qr_y, qr_size, qr_size, mask="auto")
```

por:

```python
    # QR Code no quadrante superior direito, quase a transbordar pela borda.
    if hasattr(doc, "qr_url") and doc.qr_url:
        qr = generate_institutional_qr_code(doc.qr_url)
        if qr:
            qr_size = PDF_CORNER_QR_SIZE
            qr_x = page_w - qr_size - PDF_CORNER_BLEED_INSET
            qr_y = page_h - qr_size - PDF_CORNER_BLEED_INSET
            canvas_obj.drawImage(qr, qr_x, qr_y, qr_size, qr_size, mask="auto")
```

---

## 5. Garantir que faturas tenham QR

Em `tasks/generate_pdf/invoice_pdf_generator.py`, após definir `doc.barcode_value`, adicionar:

```python
    try:
        doc.qr_url = link_invoice or getattr(invoice, "custom_id", "") or doc.barcode_value
    except Exception:
        doc.qr_url = getattr(doc, "barcode_value", None)
```

Atenção: se `link_invoice` só for montado depois, mover a atribuição de `doc.qr_url` para depois do bloco que calcula `link_invoice`.

---

## 6. Verificação local

Executar:

```bash
python manage.py check
python -m pytest tasks/generate_pdf -q
ruff check tasks/generate_pdf/pdf_base.py tasks/generate_pdf/institutional_pdf_design.py tasks/generate_pdf/invoice_pdf_generator.py
```

Depois gerar manualmente:

- PDF de requisição;
- PDF de resultado/laudo;
- PDF de fatura;
- PDF de recibo, se existir.

---

## Estado

`pdf_base.py` já foi actualizado diretamente no commit:

```text
b476edb653c4a7d1a14064af28f045e036831696
```

Este patch fica para aplicar ao motor institucional usado por faturas e outros documentos financeiros.
