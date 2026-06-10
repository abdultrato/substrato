# Patch Corrigido — Compactar logo e aproximar header

Este patch corrige a orientação anterior sobre o header dos PDFs.

## Problema real

No PDF gerado, o espaço excessivo à direita da logo não vem apenas do `text_x`.

A causa principal é que a caixa reservada para a logo está demasiado larga:

```python
logo_w, logo_h = 2.4 * cm, 1.5 * cm
```

A imagem visível da logo ocupa menos largura do que a caixa. Por isso o texto institucional começa longe, mesmo quando o `text_x` é reduzido.

## Objectivo visual

O header deve ficar assim:

```text
[LOGO] CLÍNICA DE DIAGNÓSTICOS E SAÚDE                         [QR]
       Laboratório de Análises Clínicas
       Pemba - Cabo Delgado, Moçambique
       Tel/WhatsApp: ... | Email: ...
```

Com pouco espaço entre a logo e as frases.

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
    # Caixa compacta: a logo visível é estreita; 2.4 cm criava espaço vazio
    # artificial entre a marca e as frases do header.
    logo_w, logo_h = 1.15 * cm, 1.5 * cm
    logo_x = left_margin
    logo_y = page_h - 0.25 * cm - logo_h
```

Depois localizar:

```python
    text_x = logo_x + logo_w + 0.4 * cm
```

ou, se já tiver sido alterado:

```python
    text_x = logo_x + logo_w + 0.12 * cm
```

Substituir por:

```python
    # Texto quase colado à caixa compacta da logo.
    text_x = logo_x + logo_w + 0.08 * cm
```

---

## 2. Aplicar em `tasks/generate_pdf/institutional_pdf_design.py`

Dentro de `draw_institutional_header`, localizar:

```python
    logo_w, logo_h = 2.4 * cm, 1.5 * cm
    logo_x = left_margin
    logo_y = page_h - 0.25 * cm - logo_h
```

Substituir por:

```python
    # Caixa compacta: a logo visível é estreita; 2.4 cm criava espaço vazio
    # artificial entre a marca e as frases do header.
    logo_w, logo_h = 1.15 * cm, 1.5 * cm
    logo_x = left_margin
    logo_y = page_h - 0.25 * cm - logo_h
```

Depois localizar:

```python
    text_x = logo_x + logo_w + 0.4 * cm
```

ou:

```python
    text_x = logo_x + logo_w + 0.12 * cm
```

Substituir por:

```python
    # Texto quase colado à caixa compacta da logo.
    text_x = logo_x + logo_w + 0.08 * cm
```

---

## 3. Ajuste fino se ainda houver espaço

Se ainda sobrar espaço à direita da logo, usar:

```python
logo_w = 1.00 * cm
text_x = logo_x + logo_w + 0.06 * cm
```

Se o texto encostar demais na logo, usar:

```python
logo_w = 1.25 * cm
text_x = logo_x + logo_w + 0.10 * cm
```

---

## 4. Atenção ao QR Code

Não mexer no QR agora. O QR está correcto no quadrante superior direito.

A melhoria desejada é apenas compactar o bloco esquerdo do header.

---

## 5. Verificação visual

Depois de aplicar, gerar novamente o PDF de actividades.

Confirmar:

- [ ] a logo continua visível e proporcional;
- [ ] o texto começa logo após a marca;
- [ ] não existe grande espaço vazio entre logo e texto;
- [ ] a linha de contacto ganha espaço antes do QR;
- [ ] o QR continua no topo direito;
- [ ] a linha azul continua alinhada.

---

## 6. Motivo da correção

A recomendação anterior mexia principalmente no afastamento do texto. Isso não resolvia bem porque a largura reservada à logo continuava artificialmente grande.

A correção definitiva é:

```python
logo_w, logo_h = 1.15 * cm, 1.5 * cm
text_x = logo_x + logo_w + 0.08 * cm
```
