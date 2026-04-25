const pageData = {
  project: {
    name: "Substrato",
    tagline: "Infraestrutura digital unificada para operações de saúde",
    heroTitle: "Do atendimento ao pagamento: tudo em um único fluxo.",
    heroSubtitle:
      "Substrato integra recepção, laboratório, enfermagem, farmácia, faturação e pagamentos com rastreabilidade, auditoria e dados para decisão.",
    heroBullets: [
      "Multitenant para operar várias unidades com isolamento por cliente.",
      "Fluxo completo com menos retrabalho e menos fuga de receita.",
      "Base pronta para escalar em cloud ou infraestrutura local."
    ],
    heroMediaCaption:
      "Visão real de interface: operação mais rápida, padrão único e maior controlo.",
    overview:
      "Substrato é uma plataforma clínica e laboratorial que conecta toda a jornada da unidade de saúde em uma base única. O foco comercial é simples: reduzir caos operacional, aumentar previsibilidade e acelerar crescimento com confiança.",
    painPoints: [
      "Processos fragmentados entre setores.",
      "Resultados e faturação sem padrão de rastreio.",
      "Retrabalho e perda de tempo no atendimento.",
      "Dificuldade para auditar quem fez o que e quando."
    ],
    differentials: [
      "Fluxo ponta a ponta em uma só plataforma.",
      "Perfis e permissões por função (RBAC).",
      "Documentos padronizados e histórico auditável.",
      "Deploy moderno com stack robusta (Django, DRF, Next.js, Celery)."
    ],
    modules: [
      {
        title: "Recepção",
        description: "Cadastro, check-in, requisições e abertura de faturas."
      },
      {
        title: "Laboratório",
        description: "Controlo de exames, resultados e validação de laudos."
      },
      {
        title: "Enfermagem",
        description: "Procedimentos, sinais vitais e fluxo de enfermaria."
      },
      {
        title: "Farmácia",
        description: "Estoque, lotes, movimentações e vendas."
      },
      {
        title: "Faturação e Pagamentos",
        description: "Itens, IVA por item, conciliação e recibos."
      },
      {
        title: "Analytics e Monitoramento",
        description: "Indicadores operacionais, auditoria e visão executiva."
      }
    ],
    offers: [
      {
        title: "Piloto Comercial",
        description:
          "Setup rápido para provar valor com seu fluxo real e indicadores de ganho."
      },
      {
        title: "Implementação Completa",
        description:
          "Configuração por setor, treinamento da equipa e entrada em produção."
      },
      {
        title: "Suporte e Evolução",
        description:
          "Acompanhamento contínuo, ajustes de processo e crescimento com segurança."
      }
    ],
    process: [
      "Diagnóstico do fluxo atual",
      "Demo orientada ao negócio",
      "Piloto com dados reais",
      "Go-live com suporte"
    ],
    metrics: [
      { label: "módulos integrados", value: 9, suffix: "+" },
      { label: "fluxo operacional", value: 1, suffix: " único" },
      { label: "níveis de controlo", value: 3, suffix: "" },
      { label: "foco em crescimento", value: 100, suffix: "%" }
    ],
    contactTitle: "Vamos transformar seu projeto em uma máquina de captação de clientes?",
    contactSubtitle:
      "Entre em contacto para demo comercial, proposta e plano de implementação."
  },
  owner: {
    name: "Abdul Daniel Trato",
    role: "Fundador(a) do Substrato e estrategista de operações digitais em saúde",
    city: "Maputo, Moçambique",
    professionalHighlights: [
      "Construção de produto com foco em operação real de clínicas e laboratórios.",
      "Visão técnica em arquitetura escalável e integração entre módulos.",
      "Atuação consultiva para reduzir gargalos e acelerar receita."
    ],
    personalHighlights: [
      "Perfil orientado a pessoas, escuta ativa e parceria de longo prazo.",
      "Compromisso com impacto local, qualidade de atendimento e confiança.",
      "Interesse contínuo em tecnologia aplicada à saúde e educação de equipas."
    ],
    email: "substratosys@gmail.com",
    whatsappText: "+258 84 777 8476",
    whatsappLink: "https://wa.me/258847778476",
    professionalProfile: "https://abdulltrato.github.io/substrato/",
    linkedin: "https://www.linkedin.com/abdul-daniel-trato",
    github: "https://www.github.com/abdulltrato/substrato"
  }
};

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

function appendList(containerId, items) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    container.appendChild(li);
  });
}

function renderMetrics() {
  const metricsGrid = document.getElementById("metricsGrid");
  if (!metricsGrid) return;

  metricsGrid.innerHTML = "";
  pageData.project.metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = "metric-card reveal";

    const value = document.createElement("p");
    value.className = "metric-value";
    value.dataset.target = String(metric.value);
    value.dataset.suffix = metric.suffix;
    value.textContent = `0${metric.suffix}`;

    const label = document.createElement("p");
    label.className = "metric-label";
    label.textContent = metric.label;

    card.appendChild(value);
    card.appendChild(label);
    metricsGrid.appendChild(card);
  });
}

function renderCards() {
  const modulesGrid = document.getElementById("modulesGrid");
  const offersGrid = document.getElementById("offersGrid");
  const processTimeline = document.getElementById("processTimeline");

  if (modulesGrid) {
    modulesGrid.innerHTML = "";
    pageData.project.modules.forEach((item) => {
      const card = document.createElement("article");
      card.className = "info-card reveal";
      card.innerHTML = `<h3>${item.title}</h3><p>${item.description}</p>`;
      modulesGrid.appendChild(card);
    });
  }

  if (offersGrid) {
    offersGrid.innerHTML = "";
    pageData.project.offers.forEach((item) => {
      const card = document.createElement("article");
      card.className = "info-card reveal";
      card.innerHTML = `<h3>${item.title}</h3><p>${item.description}</p>`;
      offersGrid.appendChild(card);
    });
  }

  if (processTimeline) {
    processTimeline.innerHTML = "";
    pageData.project.process.forEach((step, index) => {
      const item = document.createElement("article");
      item.className = "timeline-step reveal";
      item.innerHTML = `<span class="step-index">${index + 1}</span><p>${step}</p>`;
      processTimeline.appendChild(item);
    });
  }
}

function animateCounters() {
  const counters = document.querySelectorAll(".metric-value");
  const duration = 1100;

  counters.forEach((counter) => {
    if (counter.dataset.animated === "true") return;

    const end = Number(counter.dataset.target || 0);
    const suffix = counter.dataset.suffix || "";
    const start = performance.now();
    counter.dataset.animated = "true";

    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.round(end * eased);
      counter.textContent = `${current}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  });
}

function setupReveal() {
  const revealElements = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.16 }
  );

  revealElements.forEach((el) => observer.observe(el));
}

function setupCounterTrigger() {
  const metricsGrid = document.getElementById("metricsGrid");
  if (!metricsGrid) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounters();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(metricsGrid);
}

function setupMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const siteNav = document.getElementById("siteNav");

  if (!menuToggle || !siteNav) return;

  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function hydratePage() {
  const { project, owner } = pageData;

  setText("projectTagline", project.tagline);
  setText("heroTitle", `${project.name}: ${project.heroTitle}`);
  setText("heroSubtitle", project.heroSubtitle);
  setText("heroMediaCaption", project.heroMediaCaption);
  setText("projectOverview", project.overview);
  setText("ownerName", owner.name);
  setText("ownerRole", owner.role);
  setText("ownerCity", owner.city);
  setText("contactTitle", project.contactTitle);
  setText("contactSubtitle", project.contactSubtitle);
  setText(
    "footerText",
    `${project.name} | Perfil profissional e pessoal | ${new Date().getFullYear()}`
  );

  appendList("heroBullets", project.heroBullets);
  appendList("painPointsList", project.painPoints);
  appendList("differentialsList", project.differentials);
  appendList("professionalHighlights", owner.professionalHighlights);
  appendList("personalHighlights", owner.personalHighlights);

  renderMetrics();
  renderCards();

  const mailto = `mailto:${owner.email}`;
  const ctaPrimary = document.getElementById("ctaPrimary");
  const contactEmail = document.getElementById("contactEmail");
  const contactEmailText = document.getElementById("contactEmailText");
  const contactWhatsApp = document.getElementById("contactWhatsApp");
  const contactWhatsAppText = document.getElementById("contactWhatsAppText");
  const contactProfessionalProfile = document.getElementById("contactProfessionalProfile");
  const contactLinkedin = document.getElementById("contactLinkedin");
  const contactGithub = document.getElementById("contactGithub");

  if (ctaPrimary) ctaPrimary.href = owner.whatsappLink;
  if (contactEmail) contactEmail.href = mailto;
  if (contactEmailText) {
    contactEmailText.href = mailto;
    contactEmailText.textContent = owner.email;
  }
  if (contactWhatsApp) contactWhatsApp.href = owner.whatsappLink;
  if (contactWhatsAppText) {
    contactWhatsAppText.href = owner.whatsappLink;
    contactWhatsAppText.textContent = owner.whatsappText;
  }
  if (contactProfessionalProfile) contactProfessionalProfile.href = owner.professionalProfile;
  if (contactLinkedin) contactLinkedin.href = owner.linkedin;
  if (contactGithub) contactGithub.href = owner.github;

  setupReveal();
  setupCounterTrigger();
  setupMenu();
}

document.addEventListener("DOMContentLoaded", hydratePage);
