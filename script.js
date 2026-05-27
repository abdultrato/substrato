(function () {
  document.documentElement.classList.add("js")

  const state = {
    scope: localStorage.getItem("substrato.scope") || "todos",
    query: "",
    advisor: localStorage.getItem("substrato.advisor") || "saude",
  }

  const configCards = [
    {
      icon: "UI",
      title: "Frontend activo",
      text: "Next.js 15, React 18, TypeScript, Tailwind CSS, App Router, build standalone e proxy para API, admin, PDFs, media e health checks.",
      meta: ["frontend-next", "schema.generated.json", "RBAC", "i18n"],
    },
    {
      icon: "API",
      title: "Backend e contrato",
      text: "Django 4.2 com Django REST Framework, drf-spectacular, schema OpenAPI e AutoForm que transforma endpoints em formulários gerados.",
      meta: ["Django", "DRF", "OpenAPI 3", "AutoForm"],
    },
    {
      icon: "OPS",
      title: "Operação",
      text: "PostgreSQL, Redis, Celery, filas default/exports/billing/operations, health checks live/ready, Prometheus, Grafana e OpenTelemetry.",
      meta: ["PostgreSQL", "Redis", "Celery", "Observabilidade"],
    },
    {
      icon: "CI",
      title: "Publicação",
      text: "GitHub Pages publica .pages-dist; build de imagens backend/frontend vai para GHCR; deploy staging/production é manual e validado por segredos.",
      meta: ["GitHub Pages", "GHCR", "ECS", "Node 24"],
    },
  ]

  const scopes = [
    {
      id: "todos",
      label: "Todos",
      summary: "Vista completa dos módulos expostos pela plataforma.",
    },
    {
      id: "saude",
      label: "Saúde",
      summary:
        "Atendimento clínico, laboratório, consultas, enfermagem, farmácia, faturação, pagamentos, banco de sangue, cirurgia e maternidade.",
    },
    {
      id: "educacao",
      label: "Educação",
      summary:
        "Cursos, turmas, docentes, estudantes, matrículas, presenças, notas, exames, trabalhos e conteúdos de aprendizagem.",
    },
    {
      id: "erp",
      label: "ERP/WMS",
      summary:
        "Compras, recebimentos, saldos, reservas, separação, expedição, transferências, inventário, recursos humanos e contabilidade.",
    },
    {
      id: "plataforma",
      label: "Plataforma",
      summary:
        "Tenancy, identidade, auditoria, monitorização, notificações, IA operacional, CI/CD, segurança e documentação técnica.",
    },
  ]

  const modules = [
    {
      scope: "saude",
      title: "Clínica e laboratório",
      badge: "CL",
      endpoints: 34,
      status: "Exposto",
      text: "Pacientes, exames, requisições, amostras, resultados e ficheiros de resultado médico.",
      terms: ["clinical", "patient", "labrequest", "resultitem"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/clinical",
    },
    {
      scope: "saude",
      title: "Receção e consultas",
      badge: "RC",
      endpoints: 37,
      status: "Exposto",
      text: "Check-ins, atendimentos, agenda médica, especialidades, médicos e feriados.",
      terms: ["reception", "consultations", "checkin", "consultation"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/consultations",
    },
    {
      scope: "saude",
      title: "Enfermagem e enfermaria",
      badge: "EN",
      endpoints: 34,
      status: "Workspace",
      text: "Procedimentos, sinais vitais, prescrições, evolução, camas, internamentos e requisições de material.",
      terms: ["nursing", "ward", "procedure", "vital signs"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/nursing",
    },
    {
      scope: "saude",
      title: "Farmácia",
      badge: "FM",
      endpoints: 25,
      status: "Exposto",
      text: "Produtos, lotes, movimentos de estoque, vendas, itens de venda e requisições de material.",
      terms: ["pharmacy", "lot", "inventory", "sale", "FEFO"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/pharmacy",
    },
    {
      scope: "saude",
      title: "Banco de sangue",
      badge: "BS",
      endpoints: 17,
      status: "Exposto",
      text: "Doações, unidades, armazenamento, manutenção, movimentos de estoque e transfusões.",
      terms: ["bloodbank", "donation", "transfusion", "storage"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/bloodbank",
    },
    {
      scope: "saude",
      title: "Faturação e pagamentos",
      badge: "FP",
      endpoints: 20,
      status: "Exposto",
      text: "Faturas, itens, histórico, pagamentos, recibos, transações e reconciliações.",
      terms: ["billing", "payments", "invoice", "receipt"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/billing",
    },
    {
      scope: "educacao",
      title: "Gestão académica",
      badge: "ED",
      endpoints: 18,
      status: "Workspace",
      text: "Estudantes, professores, cursos, turmas, matrículas, presença, notas e exames.",
      terms: ["education", "student", "teacher", "classroom", "grade"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/education",
    },
    {
      scope: "educacao",
      title: "Aprendizagem e avaliação",
      badge: "AV",
      endpoints: 8,
      status: "Exposto",
      text: "Trabalhos, submissões, tentativas de exame, testes aleatórios, conteúdos, bibliografia e competências.",
      terms: ["assignment", "submission", "random_test", "content"],
      link: "https://github.com/abdulltrato/substrato/tree/main/frontend-next/app/education",
    },
    {
      scope: "erp",
      title: "ERP e WMS",
      badge: "WM",
      endpoints: 24,
      status: "Workspace",
      text: "Armazéns, localizações, itens, lotes, saldos, compras, recebimentos, reservas, separação e expedição.",
      terms: ["warehouse", "wms", "purchase_order", "shipment", "stock"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/warehouse",
    },
    {
      scope: "erp",
      title: "Recursos humanos",
      badge: "RH",
      endpoints: 26,
      status: "Exposto",
      text: "Funcionários, cargos, agregados familiares, horários, faltas, férias, dispensas, horas extra e folha de pagamento.",
      terms: ["human_resources", "payroll", "employee", "folha"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/human_resources",
    },
    {
      scope: "erp",
      title: "Contabilidade",
      badge: "CT",
      endpoints: 8,
      status: "Exposto",
      text: "Contas, lançamentos, movimentos e conciliação financeira para suporte empresarial.",
      terms: ["accounting", "financialreconciliation", "entry"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/accounting",
    },
    {
      scope: "plataforma",
      title: "Tenancy e identidade",
      badge: "ID",
      endpoints: 20,
      status: "Exposto",
      text: "Clientes, planos, configurações, uso, feature flags, utilizadores, perfis e tokens de recuperação.",
      terms: ["tenants", "identity", "user", "featureflag"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps",
    },
    {
      scope: "plataforma",
      title: "Monitorização e auditoria",
      badge: "MO",
      endpoints: 9,
      status: "Operação",
      text: "Erros do sistema, auditoria de utilizador, telemetria, SLOs, Prometheus, Grafana e runbooks.",
      terms: ["monitoring", "audit", "slo", "prometheus", "grafana"],
      link: "https://github.com/abdulltrato/substrato/tree/main/docs",
    },
    {
      scope: "plataforma",
      title: "IA operacional",
      badge: "IA",
      endpoints: 7,
      status: "Exposto",
      text: "Sessões, investigações, tarefas operacionais e ferramentas para apoio à operação da plataforma.",
      terms: ["ai_assistant", "tools", "investigation", "task"],
      link: "https://github.com/abdulltrato/substrato/tree/main/apps/ai_assistant",
    },
  ]

  const flows = [
    {
      title: "Paciente até resultado",
      text: "Receção cria atendimento, clínica regista requisição, laboratório processa itens e o resultado fica disponível no prontuário e em PDF.",
    },
    {
      title: "Farmácia com FEFO",
      text: "Produtos e lotes alimentam movimentos de estoque; venda e requisição consomem saldo por validade quando há lotes disponíveis.",
    },
    {
      title: "Reposição até expedição",
      text: "Plano de reposição gera compra, recebimento cria saldo, pedido confirmado reserva estoque, separação orienta picking e expedição baixa o saldo.",
    },
    {
      title: "Ciclo académico",
      text: "Cursos, turmas, docentes e estudantes convergem em matrículas, presenças, notas, trabalhos, exames e progresso de cronograma.",
    },
    {
      title: "Folha de pagamento",
      text: "Recursos humanos agrega funcionário, cargo, horário, faltas, férias, horas extra e salário líquido no fluxo de folha.",
    },
    {
      title: "Operação governada",
      text: "CI roda qualidade backend/frontend, segurança e auditorias; deploy exige segredos válidos e imagens versionadas.",
    },
  ]

  const advisor = [
    {
      id: "saude",
      label: "Clínica ou laboratório",
      title: "Caminho recomendado para saúde",
      text: "Comece por receção, pacientes e catálogo clínico; depois ligue requisições, resultados, faturação, farmácia e enfermagem.",
      steps: ["Validar tenant e utilizadores", "Cadastrar pacientes e catálogos", "Testar requisição, resultado e fatura", "Activar PDFs e health checks"],
    },
    {
      id: "educacao",
      label: "Escola ou formação",
      title: "Caminho recomendado para educação",
      text: "O workspace de educação já separa perfis de professor, estudante e directoria. Priorize dados académicos antes de avaliações.",
      steps: ["Criar cursos, turmas e docentes", "Matricular estudantes", "Configurar presenças e notas", "Testar trabalhos, exames e cronograma"],
    },
    {
      id: "erp",
      label: "Estoque e armazém",
      title: "Caminho recomendado para ERP/WMS",
      text: "Use o fluxo operacional do WMS para evitar ajustes manuais: compra, recebimento, reserva, separação e expedição.",
      steps: ["Criar armazéns, localizações e itens", "Definir ponto de reposição", "Receber estoque por lote", "Confirmar pedido e expedir"],
    },
    {
      id: "plataforma",
      label: "SaaS e operação",
      title: "Caminho recomendado para plataforma",
      text: "Antes de produção, endureça tenancy, segredos, observabilidade, imagens, deploy e rollback.",
      steps: ["Fechar DJANGO_ALLOWED_HOSTS, CORS e CSRF", "Publicar imagens GHCR", "Validar health live/ready", "Executar gates e plano de rollback"],
    },
  ]

  const qs = (selector) => document.querySelector(selector)
  const qsa = (selector) => Array.from(document.querySelectorAll(selector))

  function normalize(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (text !== undefined) element.textContent = text
    return element
  }

  function renderConfig() {
    const target = qs("#config-grid")
    if (!target) return
    target.replaceChildren(
      ...configCards.map((item) => {
        const card = createElement("article", "card")
        const icon = createElement("span", "card__icon", item.icon)
        const title = createElement("h3", "", item.title)
        const text = createElement("p", "", item.text)
        const meta = createElement("ul", "meta-list")
        item.meta.forEach((label) => meta.append(createElement("li", "", label)))
        card.append(icon, title, text, meta)
        return card
      })
    )
  }

  function renderFilters() {
    const target = qs("#workspace-filters")
    if (!target) return
    target.replaceChildren(
      ...scopes.map((scope) => {
        const button = createElement("button", "filter-button", scope.label)
        button.type = "button"
        button.setAttribute("aria-pressed", String(scope.id === state.scope))
        button.dataset.scope = scope.id
        button.addEventListener("click", () => {
          state.scope = scope.id
          localStorage.setItem("substrato.scope", state.scope)
          renderFilters()
          renderModules()
        })
        return button
      })
    )
  }

  function moduleMatches(item) {
    const scopeMatches = state.scope === "todos" || item.scope === state.scope
    if (!scopeMatches) return false
    if (!state.query) return true
    const haystack = normalize([item.title, item.text, item.scope, item.status, item.terms.join(" ")].join(" "))
    return haystack.includes(normalize(state.query))
  }

  function renderModules() {
    const grid = qs("#module-grid")
    const summary = qs("#workspace-summary")
    if (!grid || !summary) return

    const filtered = modules.filter(moduleMatches)
    const currentScope = scopes.find((item) => item.id === state.scope) || scopes[0]
    const endpoints = filtered.reduce((total, item) => total + item.endpoints, 0)
    summary.innerHTML = ""
    const strong = createElement("strong", "", `${filtered.length} módulos visíveis`)
    const text = document.createTextNode(`, ${endpoints} endpoints mapeados nesta vista. ${currentScope.summary}`)
    summary.append(strong, text)

    if (!filtered.length) {
      const empty = createElement("div", "noscript", "Nenhum módulo corresponde à pesquisa atual.")
      grid.replaceChildren(empty)
      return
    }

    grid.replaceChildren(
      ...filtered.map((item) => {
        const card = createElement("article", "module-card")
        const top = createElement("div", "module-card__top")
        const left = createElement("div")
        left.append(createElement("span", "module-card__badge", item.badge), createElement("h3", "", item.title))
        top.append(left, createElement("span", "module-card__status", item.status))

        const text = createElement("p", "", item.text)
        const meta = createElement("div", "module-card__meta")
        meta.append(createElement("span", "module-card__tag", `${item.endpoints} endpoints`))
        item.terms.slice(0, 3).forEach((term) => meta.append(createElement("span", "module-card__tag", term)))

        const link = createElement("a", "", "Ver código")
        link.href = item.link
        link.rel = "noreferrer"
        card.append(top, text, meta, link)
        return card
      })
    )
  }

  function renderFlows() {
    const target = qs("#flow-list")
    if (!target) return
    target.replaceChildren(
      ...flows.map((flow, index) => {
        const card = createElement("article", "flow-card")
        card.append(createElement("span", "flow-card__index", String(index + 1)))
        const content = createElement("div")
        content.append(createElement("h3", "", flow.title), createElement("p", "", flow.text))
        card.append(content)
        return card
      })
    )
  }

  function renderAdvisorControls() {
    const target = qs("#advisor-controls")
    if (!target) return
    target.replaceChildren(
      ...advisor.map((item) => {
        const button = createElement("button", "advisor-option", item.label)
        button.type = "button"
        button.setAttribute("aria-pressed", String(item.id === state.advisor))
        button.addEventListener("click", () => {
          state.advisor = item.id
          localStorage.setItem("substrato.advisor", item.id)
          renderAdvisorControls()
          renderAdvisorResult()
        })
        return button
      })
    )
  }

  function renderAdvisorResult() {
    const target = qs("#advisor-result")
    if (!target) return
    const item = advisor.find((entry) => entry.id === state.advisor) || advisor[0]
    const title = createElement("h3", "", item.title)
    const text = createElement("p", "", item.text)
    const list = createElement("ol", "advisor__steps")
    item.steps.forEach((step) => list.append(createElement("li", "", step)))
    target.replaceChildren(title, text, list)
  }

  function setupSearch() {
    const input = qs("#module-search")
    if (!input) return
    input.addEventListener("input", () => {
      state.query = input.value.trim()
      renderModules()
    })
  }

  function setupTheme() {
    const savedTheme = localStorage.getItem("substrato.theme")
    if (savedTheme) document.documentElement.dataset.theme = savedTheme
    const button = qs("[data-theme-toggle]")
    if (!button) return
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"
      document.documentElement.dataset.theme = next
      localStorage.setItem("substrato.theme", next)
    })
  }

  function setupNavigation() {
    const toggle = qs(".nav-toggle")
    const links = qs("#nav-links")
    if (!toggle || !links) return
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open")
      toggle.setAttribute("aria-expanded", String(isOpen))
    })
    qsa("#nav-links a").forEach((link) => {
      link.addEventListener("click", () => {
        links.classList.remove("is-open")
        toggle.setAttribute("aria-expanded", "false")
      })
    })
  }

  function setupCopy() {
    const copyTargets = [
      {
        selector: "[data-copy-public-url]",
        url: "https://abdulltrato.github.io/substrato/",
        success: "URL copiada",
        reset: "Copiar URL pública",
      },
    ]

    copyTargets.forEach((target) => {
      const button = qs(target.selector)
      if (!button) return
      button.addEventListener("click", async () => {
        try {
          if (!navigator.clipboard) throw new Error("clipboard unavailable")
          await navigator.clipboard.writeText(target.url)
          button.textContent = target.success
          window.setTimeout(() => {
            button.textContent = target.reset
          }, 1800)
        } catch (_) {
          button.textContent = target.url
        }
      })
    })
  }

  function setupDate() {
    const target = qs("[data-current-date]")
    if (!target) return
    target.textContent = new Intl.DateTimeFormat("pt-MZ", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date("2026-05-27T00:00:00+02:00"))
  }

  function animateCounters() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    qsa("[data-count]").forEach((item) => {
      const target = Number(item.dataset.count || "0")
      const suffix = item.textContent && item.textContent.includes("+") ? "+" : ""
      let current = 0
      const increment = Math.max(1, Math.ceil(target / 38))
      const tick = () => {
        current = Math.min(target, current + increment)
        item.textContent = `${current}${suffix}`
        if (current < target) window.requestAnimationFrame(tick)
      }
      tick()
    })
  }

  function setupScrollReveal() {
    const elements = qsa(".reveal-on-scroll")
    if (!elements.length) return
    if (!("IntersectionObserver" in window)) {
      elements.forEach((item) => item.classList.add("is-visible"))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add("is-visible")
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    )

    elements.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 80, 240)}ms`
      observer.observe(item)
    })
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderConfig()
    renderFilters()
    renderModules()
    renderFlows()
    renderAdvisorControls()
    renderAdvisorResult()
    setupSearch()
    setupTheme()
    setupNavigation()
    setupCopy()
    setupDate()
    setupScrollReveal()
    animateCounters()
  })
})()
