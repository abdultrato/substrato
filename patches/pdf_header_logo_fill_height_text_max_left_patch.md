# Patch — Logo ocupa altura disponível e texto vai ao máximo para a esquerda

Este patch substitui a abordagem anterior de apenas reduzir `text_x` ou reduzir agressivamente a caixa da logo.

## Problema visual observado

Nos PDFs de actividades, por exemplo `relatorio_atividades_daily_invoices.pdf`, existe demasiado espaço vazio entre a logo e as frases institucionais.

O problema não é apenas o afastamento `text_x`. A causa é a relação entre:

- a caixa reservada para a logo;
- a proporção real da imagem;
- o `preserveAspectRatio=True`;
- o ponto inicial do texto calculado a partir de uma largura teórica, não da largura visual útil.

## Objetivo

Deixar a logo ocupar o máximo de altura útil do header e puxar o texto para a esquerda tanto quanto possível, mantendo uma pequena folga visual.

Resultado esperado:

```text
[LOGO VISÍVEL] CLÍNICA DE DIAGNÓSTICOS E SAÚDE                 [QR]
              Laboratório de Análises Clínicas
              Pemba - Cabo Delgado, Moçambique
              Tel/WhatsApp: ... | Email: ...
```

---

## Regra recomendada

Usar uma caixa de logo mais natural:

```python
logo_h = 1.62 * cm
logo_w = 1.25 * cm
```

E posicionar o texto por um limite compacto:

```python
text_x = logo_x + 1.35 * cm
```

Em vez de:

```python
text_x = logo_x + logo_w + 0.4 * cm
```

ou mesmo:

```python
text_x = logo_x + logo_w + 0.12 * cm
```

Isto evita depender da largura teórica da imagem e fixa o início do texto quase no limite visual da logo.

---

## 1. Aplicar em `tasks/generate_pdf/pdf_base.py`

Dentro de `draw_header`, localizar:

```python
    logo_w, logo_h = 2.4 * cm, 1.5 * cm
    logo_x = left_margin
    logo_y = page_h - 0.25 * cm - logo_h
```

Substituir por:

```python
    # A logo deve ocupar bem a altura do header, mas sem reservar uma largura
    # artificialmente grande. Como preserveAspectRatio mantém a proporção real,
    # usamos uma caixa compacta e puxamos o texto pelo limite visual da marca.
    logo_w, logo_h = 1.25 * cm, 1.62 * cm
    logo_x = left_margin
    logo_y = page_h - 0.18 * cm - logo_h
```

Depois localizar:

```python
    text_x = logo_x + logo_w + 0.4 * cm
```

ou qualquer variação recente como:

```python
    text_x = logo_x + logo_w + 0.12 * cm
```

ou:

```python
    text_x = logo_x + logo_w + 0.08 * cm
```

Substituir por:

```python
    # Começa quase no limite visual da logo, sem depender da largura teórica da imagem.
    text_x = logo_x + 1.35 * cm
```

---

## 2. Aplicar em `tasks/generate_pdf/institutional_pdf_design.py`

Dentro de `draw_institutional_header`, aplicar a mesma alteração.

Substituir:

```python
    logo_w, logo_h = 2.4 * cm, 1.5 * cm
    logo_x = left_margin
    logo_y = page_h - 0.25 * cm - logo_h
```

por:

```python
    # A logo deve ocupar bem a altura do header, mas sem reservar uma largura
    # artificialmente grande. Como preserveAspectRatio mantém a proporção real,
    # usamos uma caixa compacta e puxamos o texto pelo limite visual da marca.
    logo_w, logo_h = 1.25 * cm, 1.62 * cm
    logo_x = left_margin
    logo_y = page_h - 0.18 * cm - logo_h
```

E substituir `text_x` por:

```python
    # Começa quase no limite visual da logo, sem depender da largura teórica da imagem.
    text_x = logo_x + 1.35 * cm
```

---

## 3. Ajuste fino recomendado

Se ainda parecer haver espaço à direita da logo, usar:

```python
text_x = logo_x + 1.25 * cm
```

Se o texto encostar demais na logo, usar:

```python
text_x = logo_x + 1.45 * cm
```

Manter:

```python
logo_w, logo_h = 1.25 * cm, 1.62 * cm
```

como primeira tentativa.

---

## 4. QR Code

Não mexer no QR Code neste patch. O QR está no local certo: quadrante superior direito, quase a transbordar.

---

## 5. Linha de contacto

Se a linha de contacto ainda ficar perto demais do QR, reduzir apenas essa linha em 1 ponto:

### `pdf_base.py`

```python
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE - 1)
    canvas_obj.drawString(
        text_x,
        text_top_y - 1.24 * cm,
        "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com",
    )
    canvas_obj.setFont(FONT, PDF_BODY_FONT_SIZE)
```

### `institutional_pdf_design.py`

```python
    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE - 1)
    canvas_obj.drawString(
        text_x,
        text_top_y - 1.24 * cm,
        "Tel/WhatsApp: +258 84 777 8476 | Email: substratosys@gmail.com",
    )
    canvas_obj.setFont(FONT_INST, PDF_BODY_FONT_SIZE)
```

Mas primeiro testar apenas a mudança de `logo_w/logo_h/text_x`.

---

## 6. Verificação visual

Gerar novamente PDFs como:

```text
relatorio_atividades_daily_invoices.pdf
relatorio_atividades_daily_workspaces.pdf
```

Confirmar:

- [ ] a logo ocupa melhor a altura do header;
- [ ] o texto começa o mais à esquerda possível;
- [ ] não há espaço morto grande entre logo e texto;
- [ ] o QR continua no topo direito;
- [ ] a linha de contacto tem mais área útil;
- [ ] a linha azul não sobrepõe a logo;
- [ ] o corpo do relatório mantém a mesma posição.

---

## 7. Recomendação final

A configuração inicial mais equilibrada é:

```python
logo_w, logo_h = 1.25 * cm, 1.62 * cm
text_x = logo_x + 1.35 * cm
```

A lógica é: **a imagem ocupa a altura que couber; o texto não espera a largura teórica da caixa, mas começa próximo do limite visual da marca**.
