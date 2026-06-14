// Setas de rolagem: adiciona botões de seta (↑ ↓ ← →) nas bordas de regiões
// roláveis, como atalho para percorrer a rolagem com a barra nativa oculta.
//
// Os botões vivem numa camada `position: fixed` anexada ao <body>, posicionada
// por coordenadas do viewport (getBoundingClientRect). Assim NÃO modificamos o
// DOM gerido pelo React (nenhum wrapper é inserido nas subárvores), o que evita
// conflitos de reconciliação. O mesmo algoritmo é replicado em JS puro para o
// Django admin (substrato-scroll-arrows.js).

export type ScrollArrowsController = { destroy: () => void }

type Dir = "left" | "right" | "up" | "down"
type Buttons = Record<Dir, HTMLButtonElement>

type SafeViewport = {
  top: number
  right: number
  bottom: number
  left: number
}

const ARROW_SIZE = 28
const EDGE_GAP = 8
const SCROLL_THRESHOLD = 4
// Pressionar e segurar: tempo até iniciar a rolagem contínua e a velocidade (px/frame).
const HOLD_DELAY = 500
const CONTINUOUS_STEP = 10
const CHROME_GAP = 8
const OVERLAY_Z = 2147483000
const STYLE_ID = "substrato-scroll-arrows-style"
const HIDDEN_ATTR = "data-substrato-scrollbars-hidden"

const ARROW_GLYPH: Record<Dir, string> = {
  left: "‹",
  right: "›",
  up: "↑",
  down: "↓",
}

function isScrollable(el: Element, axis: "x" | "y"): boolean {
  const style = getComputedStyle(el)
  const overflow = axis === "x" ? style.overflowX : style.overflowY
  if (!/(auto|scroll)/.test(overflow)) return false
  const amount =
    axis === "x" ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight
  return amount > SCROLL_THRESHOLD
}

function ensureScrollbarStyle(doc: Document): HTMLStyleElement {
  const existing = doc.getElementById(STYLE_ID)
  if (existing instanceof HTMLStyleElement) return existing

  const style = doc.createElement("style")
  style.id = STYLE_ID
  style.dataset.substratoOwned = "true"
  style.textContent = `
[${HIDDEN_ATTR}] {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

[${HIDDEN_ATTR}]::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
`
  doc.head.appendChild(style)
  return style
}

export function initScrollArrows(opts: {
  selector: string
  doc?: Document
}): ScrollArrowsController {
  const doc = opts.doc || document
  const win = doc.defaultView || window
  if (!doc.body) return { destroy: () => {} }

  const style = ensureScrollbarStyle(doc)
  const overlay = doc.createElement("div")
  overlay.setAttribute("data-substrato-scroll-arrows", "")
  overlay.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${OVERLAY_Z};`
  doc.body.appendChild(overlay)

  const tracked = new Map<Element, Buttons>()
  const hiddenScrollbars = new Set<Element>()
  let rafId = 0

  function makeButton(dir: Dir, target: Element): HTMLButtonElement {
    const btn = doc.createElement("button")
    btn.type = "button"
    btn.setAttribute("aria-label", `Rolar ${dir}`)
    btn.tabIndex = -1
    btn.textContent = ARROW_GLYPH[dir]
    btn.style.cssText = [
      "position:fixed",
      "display:none",
      "align-items:center",
      "justify-content:center",
      `width:${ARROW_SIZE}px`,
      `height:${ARROW_SIZE}px`,
      "padding:0",
      "border-radius:999px",
      "border:1px solid hsl(var(--border-hsl, 214 22% 86%) / 0.72)",
      "background:hsl(var(--card-hsl, 222 38% 11%) / 0.86)",
      "color:hsl(var(--foreground-hsl, 210 40% 96%) / 0.92)",
      "font-size:16px",
      "font-weight:600",
      "line-height:1",
      "cursor:pointer",
      "pointer-events:auto",
      "opacity:0.82",
      "box-shadow:0 2px 8px rgba(15,23,42,0.14)",
      "backdrop-filter:blur(8px)",
      "-webkit-backdrop-filter:blur(8px)",
      "transition:opacity 120ms ease, transform 120ms ease, background-color 120ms ease",
    ].join(";")
    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "1"
      btn.style.transform = "scale(1.04)"
    })
    btn.addEventListener("mouseleave", () => {
      btn.style.opacity = "0.82"
      btn.style.transform = "scale(1)"
    })

    // Toque/clique curto: avança uma "página". Pressionar e segurar (>0.5s):
    // rola levemente de forma contínua na direção da seta até soltar ou chegar ao fim.
    const axis: "x" | "y" = dir === "left" || dir === "right" ? "x" : "y"
    const sign = dir === "left" || dir === "up" ? -1 : 1
    let holdTimer: ReturnType<typeof setTimeout> | 0 = 0
    let rafScroll = 0
    let didContinuous = false

    function pageStep() {
      const stepX = Math.max(80, Math.round(target.clientWidth * 0.8))
      const stepY = Math.max(80, Math.round(target.clientHeight * 0.8))
      const delta =
        dir === "left"
          ? { left: -stepX }
          : dir === "right"
            ? { left: stepX }
            : dir === "up"
              ? { top: -stepY }
              : { top: stepY }
      target.scrollBy({ ...delta, behavior: "smooth" })
    }

    function continuousTick() {
      const before = axis === "x" ? target.scrollLeft : target.scrollTop
      if (axis === "x") target.scrollLeft = before + sign * CONTINUOUS_STEP
      else target.scrollTop = before + sign * CONTINUOUS_STEP
      const after = axis === "x" ? target.scrollLeft : target.scrollTop
      // Chegou ao fim (não houve movimento): para.
      if (after === before) {
        rafScroll = 0
        return
      }
      rafScroll = win.requestAnimationFrame(continuousTick)
    }

    function endPress() {
      if (holdTimer) {
        clearTimeout(holdTimer)
        holdTimer = 0
      }
      if (rafScroll) {
        win.cancelAnimationFrame(rafScroll)
        rafScroll = 0
      }
    }

    btn.addEventListener("pointerdown", (event) => {
      event.preventDefault()
      event.stopPropagation()
      didContinuous = false
      try {
        btn.setPointerCapture(event.pointerId)
      } catch {
        // ignore
      }
      holdTimer = setTimeout(() => {
        holdTimer = 0
        didContinuous = true
        if (!rafScroll) rafScroll = win.requestAnimationFrame(continuousTick)
      }, HOLD_DELAY)
    })
    btn.addEventListener("pointerup", endPress)
    btn.addEventListener("pointercancel", endPress)
    btn.addEventListener("pointerleave", endPress)
    btn.addEventListener("click", (event) => {
      event.preventDefault()
      event.stopPropagation()
      // Se a rolagem contínua já tratou o gesto, não dá o salto de página extra.
      if (didContinuous) {
        didContinuous = false
        return
      }
      pageStep()
    })
    overlay.appendChild(btn)
    return btn
  }

  function ensureTracked(el: Element): Buttons {
    let buttons = tracked.get(el)
    if (!buttons) {
      buttons = {
        left: makeButton("left", el),
        right: makeButton("right", el),
        up: makeButton("up", el),
        down: makeButton("down", el),
      }
      tracked.set(el, buttons)
    }
    return buttons
  }

  function hideNativeScrollbar(el: Element) {
    if (hiddenScrollbars.has(el)) return
    el.setAttribute(HIDDEN_ATTR, "")
    hiddenScrollbars.add(el)
  }

  function place(btn: HTMLButtonElement, show: boolean, left: number, top: number) {
    if (!show) {
      btn.style.display = "none"
      return
    }
    btn.style.display = "flex"
    btn.style.left = `${Math.round(left)}px`
    btn.style.top = `${Math.round(top)}px`
  }

  function getSafeViewport(): SafeViewport {
    const safe: SafeViewport = {
      top: CHROME_GAP,
      right: win.innerWidth - CHROME_GAP,
      bottom: win.innerHeight - CHROME_GAP,
      left: CHROME_GAP,
    }
    const chrome = doc.querySelectorAll(
      "body > header, body > footer, header, footer, .main-header, .main-footer, [data-substrato-fixed-header], [data-substrato-fixed-footer]"
    )

    for (const node of Array.from(chrome)) {
      if (!(node instanceof win.HTMLElement) || node === overlay) continue
      const nodeStyle = win.getComputedStyle(node)
      if (nodeStyle.display === "none" || nodeStyle.visibility === "hidden") continue
      if (nodeStyle.position !== "fixed" && nodeStyle.position !== "sticky") continue

      const rect = node.getBoundingClientRect()
      const intersectsViewport =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < win.innerHeight &&
        rect.right > 0 &&
        rect.left < win.innerWidth
      if (!intersectsViewport) continue

      if (rect.top <= CHROME_GAP && rect.bottom < win.innerHeight * 0.5) {
        safe.top = Math.max(safe.top, rect.bottom + CHROME_GAP)
      }
      if (rect.bottom >= win.innerHeight - CHROME_GAP && rect.top > win.innerHeight * 0.5) {
        safe.bottom = Math.min(safe.bottom, rect.top - CHROME_GAP)
      }
    }

    return safe
  }

  function clamp(value: number, min: number, max: number): number {
    if (max < min) return min
    return Math.min(Math.max(value, min), max)
  }

  function update() {
    rafId = 0
    const winW = win.innerWidth
    const winH = win.innerHeight
    const safeViewport = getSafeViewport()
    // Exclui regiões que gerem as próprias setas (ex.: o nav do sidebar, que tem
    // setas internas para não colapsar ao passar o cursor por cima delas).
    const targets = Array.from(doc.querySelectorAll(opts.selector)).filter(
      (el) => !el.closest("[data-no-scroll-arrows]")
    )
    const present = new Set(targets)

    // Limpa botões de alvos que saíram do DOM.
    for (const [el, buttons] of tracked) {
      if (!present.has(el) || !el.isConnected) {
        for (const dir of Object.keys(buttons) as Dir[]) buttons[dir].remove()
        el.removeAttribute(HIDDEN_ATTR)
        hiddenScrollbars.delete(el)
        tracked.delete(el)
      }
    }

    for (const el of targets) {
      hideNativeScrollbar(el)

      const rect = el.getBoundingClientRect()
      const visible = {
        top: Math.max(rect.top, safeViewport.top),
        right: Math.min(rect.right, safeViewport.right),
        bottom: Math.min(rect.bottom, safeViewport.bottom),
        left: Math.max(rect.left, safeViewport.left),
      }
      const visibleWidth = visible.right - visible.left
      const visibleHeight = visible.bottom - visible.top
      const onScreen =
        visibleWidth > ARROW_SIZE + EDGE_GAP * 2 &&
        visibleHeight > ARROW_SIZE + EDGE_GAP * 2 &&
        rect.bottom > 0 &&
        rect.top < winH &&
        rect.right > 0 &&
        rect.left < winW
      const buttons = ensureTracked(el)
      if (!onScreen) {
        for (const dir of Object.keys(buttons) as Dir[]) buttons[dir].style.display = "none"
        continue
      }

      const canX = isScrollable(el, "x")
      const canY = isScrollable(el, "y")
      const maxX = el.scrollWidth - el.clientWidth
      const maxY = el.scrollHeight - el.clientHeight
      const minX = visible.left + EDGE_GAP
      const maxButtonX = visible.right - EDGE_GAP - ARROW_SIZE
      const minY = visible.top + EDGE_GAP
      const maxButtonY = visible.bottom - EDGE_GAP - ARROW_SIZE
      const midY = clamp(rect.top + rect.height / 2 - ARROW_SIZE / 2, minY, maxButtonY)
      const midX = clamp(rect.left + rect.width / 2 - ARROW_SIZE / 2, minX, maxButtonX)

      place(buttons.left, canX && el.scrollLeft > SCROLL_THRESHOLD, minX, midY)
      place(
        buttons.right,
        canX && el.scrollLeft < maxX - SCROLL_THRESHOLD,
        maxButtonX,
        midY
      )
      place(buttons.up, canY && el.scrollTop > SCROLL_THRESHOLD, midX, minY)
      place(
        buttons.down,
        canY && el.scrollTop < maxY - SCROLL_THRESHOLD,
        midX,
        maxButtonY
      )
    }
  }

  function schedule() {
    if (rafId) return
    rafId = win.requestAnimationFrame(update)
  }

  const mo = new MutationObserver(schedule)
  mo.observe(doc.body, { childList: true, subtree: true })

  doc.addEventListener("scroll", schedule, true)
  win.addEventListener("resize", schedule)
  win.addEventListener("orientationchange", schedule)

  schedule()

  return {
    destroy() {
      if (rafId) win.cancelAnimationFrame(rafId)
      mo.disconnect()
      doc.removeEventListener("scroll", schedule, true)
      win.removeEventListener("resize", schedule)
      win.removeEventListener("orientationchange", schedule)
      overlay.remove()
      if (style.dataset.substratoOwned === "true") style.remove()
      for (const el of hiddenScrollbars) el.removeAttribute(HIDDEN_ATTR)
      tracked.clear()
      hiddenScrollbars.clear()
    },
  }
}
