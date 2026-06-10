# Patch — Aproximar frases do header da logo

Este patch ajusta o espaço horizontal entre a logo e as frases institucionais do cabeçalho dos PDFs.

## Contexto visual

No PDF de exemplo `relatorio_atividades_daily_workspaces.pdf`, o texto do header começa longe da logo e sobra pouco espaço até o QR Code no canto superior direito. A linha de contacto fica muito próxima do QR e pode perder legibilidade.

Objetivo: mover as frases institucionais para mais perto da logo, libertando largura útil à direita.

---

## Alteração recomendada

Trocar o espaçamento:

```python
text_x = logo_x + logo_w + 0.4 * cm
```

por:

```python
text_x = logo_x + logo_w + 0.12 * cm
```

Isto aproxima o texto da logo em aproximadamente **0.28 cm**, criando mais espaço para o texto antes do QR Code.

---

## 1. Aplicar em `tasks/generate_pdf/pdf_base.py`

Localizar dentro de `draw_header`:

```python
    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = page_h - 0.62 * cm
```

Substituir por:

```python
    # Mantém as frases institucionais próximas da logo para ganhar espaço
    # antes do QR Code no canto superior direito.
    text_x = logo_x + logo_w + 0.12 * cm
    text_top_y = page_h - 0.62 * cm
```

---

## 2. Aplicar em `tasks/generate_pdf/institutional_pdf_design.py`

Localizar dentro de `draw_institutional_header`:

```python
    text_x = logo_x + logo_w + 0.4 * cm
    text_top_y = page_h - 0.62 * cm
```

Substituir por:

```python
    # Mantém as frases institucionais próximas da logo para ganhar espaço
    # antes do QR Code no canto superior direito.
    text_x = logo_x + logo_w + 0.12 * cm
    text_top_y = page_h - 0.62 * cm
```

---

## 3. Ajuste opcional se ainda faltar espaço

Se a linha de contacto continuar muito próxima do QR Code, reduzir levemente o tamanho da fonte apenas no contacto:

```python
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE - 1)
    canvas_obj.drawString(
        text_x,
        text_top_y - 1.24 * cm,
        "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com",
    )
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
```

No design institucional, usar:

```python
    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE - 1)
    canvas_obj.drawString(
        text_x,
        text_top_y - 1.24 * cm,
        "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com",
    )
    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
```

---

## 4. Ajuste opcional mais limpo

Se o QR estiver demasiado grande para A5, manter o QR no canto mas reduzir de:

```python
PDF_CORNER_QR_SIZE = 1.85 * cm
```

para:

```python
PDF_CORNER_QR_SIZE = 1.70 * cm
```

Mas a primeira tentativa deve ser apenas aproximar as frases da logo.

---

## 5. Verificação visual

Depois de aplicar, gerar novamente:

```text
relatorio_atividades_daily_workspaces.pdf
```

Confirmar:

- [ ] texto institucional começa mais perto da logo;
- [ ] linha de contacto tem mais espaço antes do QR;
- [ ] QR continua no quadrante superior direito;
- [ ] linha azul do header continua alinhada;
- [ ] corpo do relatório não sobe nem desce de forma indesejada.
