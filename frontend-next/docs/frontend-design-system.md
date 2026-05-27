# Frontend Design System — `frontend-next`

## Objetivo

Criar consistência visual, acessibilidade e uma base escalável para o frontend Next.js.

## Tokens principais

- `--background-hsl`, `--foreground-hsl`, `--foreground-2-hsl`
- `--card-hsl`, `--card-foreground-hsl`
- `--border-hsl`, `--muted-hsl`, `--muted-2-hsl`
- `--primary-hsl`, `--primary-hover-hsl`, `--primary-soft-hsl`
- `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- `--font-sans`, `--font-display`
- `--ui-text-size`, `--ui-text-size-relaxed`, `--ui-title-size`

## Tipografia

- Use `font-sans` para corpo de texto e `font-display` para títulos.
- Tamanhos de heading devem escalar de forma responsiva com `clamp()`.
- Mantenha `line-height: 1.45` para conteúdo e `1.2` para títulos.
- Use `text-foreground` e `text-muted-foreground` para contraste claro e hierarquia.

## Espaçamento e layout

- Componentes principais devem ter bordas arredondadas consistentes com `rounded-lg` e `rounded-2xl`.
- Cards e seções usam `border`, `bg-card`, `shadow-sm` para profundidade suave.
- Utilize grades fluidas (`auto-fit`/`minmax`) em painéis e containers.

## Acessibilidade e interações

- Defina foco visível em `a`, `button`, `input`, `select`, `textarea`.
- Use `focus-visible` com `box-shadow` e `ring` para acessibilidade sem interromper usuários de mouse.
- Garanta que as cores de texto em botões e avisos atinjam pelo menos contraste AA.
- Mantenha `aria-label` em botões de ícone e `role`/`aria-*` em componentes interativos.

## Componentes reutilizáveis

- `Button`:
  - `primary`, `secondary`, `danger`, `ghost`
  - `fullWidth`, `loading`
- `Card`:
  - `rounded-2xl`, `border-border`, `bg-card`, `shadow-sm`
- `TextInput`, `TextAreaInput`, `SelectInput`, `CheckboxInput`, `RadioGroup`
  - bordas suaves, foco alto contraste, placeholders suaves.
- `Pagination` e `Modal`:
  - foco claro, estados `hover` e `disabled` consistentes.

## Melhoria aplicada

- Ajuste global de box-sizing e herança de fonte.
- Tipografia responsiva para `h1`, `h2`, `h3`.
- Foco visível forte e consistente em elementos interativos.
- Suporte acessível para `<abbr>` e `fieldset` reset.

## Próximos passos

1. Padronizar `Button` e `Card` em componentes utilitários compartilhados.
2. Criar um catálogo de componentes em Storybook ou MDX.
3. Auditar contraste de cores com Lighthouse/axe.
4. Implementar lazy loading para imagens e componentes pesados.
5. Remover estilos globais duplicados e migrar para classes de componente onde possível.
