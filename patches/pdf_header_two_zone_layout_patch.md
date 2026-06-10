# Patch Definitivo — Header PDF em duas zonas

Este patch substitui as tentativas anteriores de ajustar manualmente `logo_w`, `logo_h` e `text_x`.

## Problema visual

Nos PDFs de actividades, o header fica com espaço morto entre a logo e as frases institucionais.

O problema aparece porque a logo, o texto e o QR são posicionados como elementos soltos. O texto começa com base numa largura teórica da logo, não numa área de layout bem definida.

## Solução

Dividir o header em duas zonas fixas:

```text
┌──────────────────────────── zona esquerda ────────────────────────────┐┌─ zona direita ─┐
│ [LOGO]  CLÍNICA DE DIAGNÓSTICOS E SAÚDE                               ││      QR        │
│         Laboratório de Análises Clínicas                               ││                │
│         Pemba - Cabo Delgado, Moçambique                               ││                │
│         Tel/WhatsApp: +258 ... | Email: ...                            ││                │
└────────────────────────────────────────────────────────────────────────┘└────────────────┘
```

A zona esquerda contém logo + texto. A zona direita fica reservada apenas para o QR Code.

---

## Princípios

1. O QR Code tem uma zona fixa à direita.
2. A logo tem uma zona compacta à esquerda.
3. O texto começa imediatamente após a zona visual da logo.
4. A linha de contacto deve respeitar o limite antes do QR.
5. Não se deve calcular o texto com `logo_x + logo_w + gap` se `logo_w` for uma caixa artificial.
6. O header passa a funcionar como layout, não como elementos soltos.

---

## Constantes recomendadas

Adicionar perto das constantes de PDF:

```python
PDF_HEADER_QR_ZONE_WIDTH = 2.05 * cm
PDF_HEADER_LOGO_ZONE_WIDTH = 1.25 * cm
PDF_HEADER_LOGO_HEIGHT = 1.62 * cm
PDF_HEADER_TEXT_GAP = 0.10 * cm
PDF_HEADER_RIGHT_SAFE_GAP = 0.18 * cm
PDF_HEADER_CONTACT_FONT_DELTA = 1
```

Se o QR estiver com `PDF_CORNER_QR_SIZE = 1.85 * cm`, a zona de QR com `2.05 cm` dá pequena folga.

---

## Função auxiliar recomendada

Adicionar:

```python
def _header_zones(doc):
    page_w, page_h = doc.pagesize
    left_margin = getattr(doc, "leftMargin", PDF_MARGIN)
    top_margin = getattr(doc, "topMargin", PDF_HEADER_TOP_MARGIN)

    qr_zone_right = page_w
    qr_zone_left = page_w - PDF_HEADER_QR_ZONE_WIDTH

    left_zone_x = left_margin
    left_zone_right = qr_zone_left - PDF_HEADER_RIGHT_SAFE_GAP
    left_zone_width = left_zone_right - left_zone_x

    logo_x = left_zone_x
    logo_w = PDF_HEADER_LOGO_ZONE_WIDTH
    logo_h = PDF_HEADER_LOGO_HEIGHT
    logo_y = page_h - 0.18 * cm - logo_h

    text_x = logo_x + PDF_HEADER_LOGO_ZONE_WIDTH + PDF_HEADER_TEXT_GAP
    text_right = left_zone_right
    text_width = text_right - text_x

    y_line = page_h - top_margin + 0.05 * cm

    return {
        "page_w": page_w,
        "page_h": page_h,
        "left_margin": left_margin,
        "qr_zone_left": qr_zone_left,
        "qr_zone_right": qr_zone_right,
        "left_zone_x": left_zone_x,
        "left_zone_right": left_zone_right,
        "left_zone_width": left_zone_width,
        "logo_x": logo_x,
        "logo_y": logo_y,
        "logo_w": logo_w,
        "logo_h": logo_h,
        "text_x": text_x,
        "text_right": text_right,
        "text_width": text_width,
        "y_line": y_line,
    }
```

---

## Aplicar em `tasks/generate_pdf/pdf_base.py`

### 1. Substituir cálculo manual do header

Dentro de `draw_header`, substituir este padrão:

```python
    page_w, page_h = doc.pagesize

    left_margin = getattr(doc, "leftMargin", PDF_MARGIN)
    right_margin = getattr(doc, "rightMargin", PDF_MARGIN)
    top_margin = getattr(doc, "topMargin", PDF_HEADER_TOP_MARGIN)

    logo = _safe_image_reader(LOGO_PATH)

    logo_w, logo_h = 2.4 * cm, 1.5 * cm
    logo_x = left_margin
    logo_y = page_h - 0.25 * cm - logo_h
```

por:

```python
    zones = _header_zones(doc)
    page_w = zones["page_w"]
    page_h = zones["page_h"]
    left_margin = zones["left_margin"]
    logo_x = zones["logo_x"]
    logo_y = zones["logo_y"]
    logo_w = zones["logo_w"]
    logo_h = zones["logo_h"]
    text_x = zones["text_x"]
    text_right = zones["text_right"]
    text_width = zones["text_width"]
    y_line = zones["y_line"]

    logo = _safe_image_reader(LOGO_PATH)
```

### 2. Remover cálculo antigo de texto

Remover linhas como:

```python
    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = page_h - 0.62 * cm
```

Substituir por:

```python
    text_top_y = page_h - 0.62 * cm
```

### 3. Desenhar texto com limite de zona

Para evitar o contacto entrar na zona do QR, trocar o `drawString` do contacto por `drawRightString` ou reduzir fonte.

Opção simples:

```python
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE - PDF_HEADER_CONTACT_FONT_DELTA)
    canvas_obj.drawString(
        text_x,
        text_top_y - 1.24 * cm,
        "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com",
    )
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
```

Opção mais segura com corte visual:

```python
    contact = "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com"
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE - PDF_HEADER_CONTACT_FONT_DELTA)
    while canvas_obj.stringWidth(contact, FONT, PDF_BODY_FONT_SIZE - PDF_HEADER_CONTACT_FONT_DELTA) > text_width and len(contact) > 20:
        contact = contact[:-4].rstrip() + "..."
    canvas_obj.drawString(text_x, text_top_y - 1.24 * cm, contact)
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
```

### 4. Linha inferior

Trocar:

```python
canvas_obj.line(left_margin, y_line, page_w - right_margin, y_line)
```

por:

```python
canvas_obj.line(left_margin, y_line, page_w - PDF_MARGIN, y_line)
```

---

## Aplicar em `tasks/generate_pdf/institutional_pdf_design.py`

Aplicar a mesma lógica com nomes institucionais:

- `FONT` vira `FONT_INST`;
- `PDF_BODY_FONT_SIZE` permanece;
- `_safe_image_reader_transparent(LOGO_PATH)` permanece;
- `draw_institutional_header` deve usar `_header_zones` ou uma função equivalente `_institutional_header_zones`.

Se quiser evitar duplicação futura, pode mover `_header_zones` para um helper comum depois.

---

## Versão recomendada do desenho do header

A lógica final dentro do header deve ficar conceitualmente assim:

```python
def draw_header(canvas_obj, doc):
    canvas_obj.saveState()

    zones = _header_zones(doc)
    logo = _safe_image_reader(LOGO_PATH)

    if logo:
        canvas_obj.drawImage(
            logo,
            zones["logo_x"],
            zones["logo_y"],
            width=zones["logo_w"],
            height=zones["logo_h"],
            preserveAspectRatio=True,
            anchor="nw",
            mask="auto",
        )

    text_x = zones["text_x"]
    text_top_y = zones["page_h"] - 0.62 * cm

    canvas_obj.setFont(FONT_BOLD, PDF_TITLE_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y, "CLÍNICA DE DIAGNÓSTICOS E SAÚDE")

    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
    canvas_obj.drawString(text_x, text_top_y - 0.48 * cm, "Laboratório de Análises Clínicas")
    canvas_obj.drawString(text_x, text_top_y - 0.88 * cm, "Pemba - Cabo Delgado, Moçambique")

    contact = "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com"
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE - PDF_HEADER_CONTACT_FONT_DELTA)
    while canvas_obj.stringWidth(contact, FONT, PDF_BODY_FONT_SIZE - PDF_HEADER_CONTACT_FONT_DELTA) > zones["text_width"] and len(contact) > 20:
        contact = contact[:-4].rstrip() + "..."
    canvas_obj.drawString(text_x, text_top_y - 1.24 * cm, contact)

    draw_overflow_qr(canvas_obj, doc)

    canvas_obj.setStrokeColor(colors.darkblue)
    canvas_obj.setLineWidth(1)
    canvas_obj.line(zones["left_margin"], zones["y_line"], zones["page_w"] - PDF_MARGIN, zones["y_line"])

    canvas_obj.restoreState()
```

---

## Por que esta solução é melhor

A solução anterior tentava corrigir um layout quebrado com números manuais.

Esta solução define zonas claras:

- zona esquerda: logo + texto;
- zona direita: QR;
- limite seguro entre texto e QR;
- largura útil calculada;
- linha de contacto protegida contra sobreposição.

Assim o header deixa de depender da largura visual imprevisível da logo.

---

## Verificação visual

Gerar novamente:

```text
relatorio_atividades_daily_invoices.pdf
relatorio_atividades_daily_workspaces.pdf
```

Confirmar:

- [ ] logo e texto parecem pertencer ao mesmo bloco;
- [ ] texto foi puxado para a esquerda;
- [ ] QR continua isolado à direita;
- [ ] contacto não entra no QR;
- [ ] a linha azul continua completa;
- [ ] o corpo do documento não foi deslocado.
