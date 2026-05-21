# IA - Base de Conhecimento Editável e Busca Semântica

## Objectivo
Transformar a camada de perguntas previstas da IA numa base operacional editável, capaz de responder perguntas comuns, sugerir correcções de escrita e reconhecer intenções mesmo quando o utilizador não usa os termos exactos do sistema.

Esta fase cobre os passos 1 e 2 do próximo ciclo evolutivo:

1. Base de conhecimento editável no banco.
2. Busca semântica realista, local e determinística, combinada com fuzzy matching.

## Princípios
1. A IA deve responder primeiro com entradas aprovadas e editáveis pelo sistema.
2. O catálogo interno continua como fallback seguro quando não existirem entradas no banco.
3. Entradas do banco podem substituir entradas internas usando a mesma chave (`slug`).
4. A pesquisa deve tolerar erros ortográficos, sinónimos e termos equivalentes do domínio.
5. O resultado deve continuar auditável, com fonte, confiança e sugestões seguintes.
6. Nenhuma resposta desta camada deve consultar dados operacionais sensíveis; dados reais continuam a passar pelas ferramentas com RBAC.

## Estrutura Implementada

### Modelo
`AiKnowledgeEntry`

Campos principais:

- `slug`: chave única por tenant.
- `title`: título administrativo da entrada.
- `category`: categoria funcional, por exemplo `crud`, `analytics`, `seguranca`.
- `module_key`: módulo relacionado, por exemplo `clinical`, `pharmacy`, `education`.
- `status`: `draft`, `active` ou `archived`.
- `source`: `custom`, `system_override` ou `imported`.
- `priority`: desempate e ordenação de relevância.
- `questions_pt` e `questions_en`: perguntas canónicas.
- `aliases_pt` e `aliases_en`: formas alternativas de perguntar.
- `semantic_terms`: termos de intenção, domínio e sinónimos.
- `answer_pt` e `answer_en`: respostas aprovadas.
- `follow_ups_pt` e `follow_ups_en`: próximas perguntas sugeridas.
- `tags`: etiquetas livres de classificação.
- `metadata`: extensão futura sem alterar schema.

### Administração
O Django Admin passa a permitir gerir entradas da base de conhecimento por tenant, estado, origem, categoria e módulo.

### Motor de Pesquisa
O motor `KnowledgeBaseTool` passa a juntar:

1. Entradas activas do banco para o tenant actual.
2. Catálogo interno de perguntas previstas.
3. Substituição de fallback quando uma entrada do banco usa o mesmo `slug` de uma entrada interna.

A pontuação combina:

- igualdade exacta;
- pergunta contida no texto;
- similaridade textual;
- sobreposição de tokens;
- similaridade compacta sem espaços;
- expansão semântica por conceitos do domínio;
- pequeno reforço quando `active_module` coincide com `module_key`.

## Exemplos de Uso

### Entrada Personalizada
```json
{
  "slug": "protocolo-visita",
  "title": "Protocolo de visita",
  "category": "operacao",
  "module_key": "reception",
  "questions_pt": ["Qual é o protocolo de visita?"],
  "aliases_pt": ["Como funciona a visita?", "horario de visita", "posso receber visita"],
  "semantic_terms": ["visita", "acompanhante", "recepcao", "familia"],
  "answer_pt": "O protocolo de visita deve seguir as regras definidas pela unidade. Confirme o horário e as restrições activas antes de orientar o visitante.",
  "follow_ups_pt": ["Como registar entrada pela recepção?", "Quais visitantes entraram hoje?"]
}
```

### Substituição de Entrada Interna
Para substituir uma resposta interna, criar uma entrada activa com o mesmo `slug` da entrada interna, por exemplo `ai-capabilities`.

## Critérios de Aceitação

1. O admin consegue criar, editar, arquivar e pesquisar entradas de conhecimento.
2. A IA responde usando entrada do banco quando houver correspondência forte.
3. A IA sugere `Quis dizer...?` quando a pergunta estiver próxima, mas não exacta.
4. Uma pergunta com sinónimo, como `como meto um doente novo`, encontra a intenção de criação de paciente.
5. Perguntas operacionais de dados, como `quantos pacientes existem`, continuam a ir para SQL/exploração de dados, não para o catálogo.
6. O resultado expõe fonte `AI editable knowledge base` quando a resposta vem do banco.

## Próximas Fases

1. Registar perguntas não entendidas para revisão humana.
2. Criar painel de treino da IA no frontend.
3. Adicionar métricas de acerto por categoria e módulo.
4. Permitir aprovação de sugestões aprendidas a partir do uso real.
5. Evoluir para embeddings externos ou vector store quando houver contrato de privacidade e custo aprovado.
