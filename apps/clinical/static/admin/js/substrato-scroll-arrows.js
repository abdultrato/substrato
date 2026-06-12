/*
  Setas de rolagem para o Django admin (Jazzmin/AdminLTE).

  Adiciona botões de seta (↑ ↓ ← →) nas bordas das regiões roláveis — área de
  conteúdo (vertical) e tabelas largas (horizontal) — como atalho para percorrer
  a rolagem com a barra nativa oculta. Espelha a lógica de
  frontend-next/lib/ui/scrollArrows.ts.
*/
(function () {
  "use strict";

  var SELECTOR = ".content-wrapper, .table-responsive, .module, .card-body, #content-main";
  var ARROW_SIZE = 28;
  var EDGE_GAP = 8;
  var THRESHOLD = 4;
  var CHROME_GAP = 8;
  var STYLE_ID = "substrato-scroll-arrows-style";
  var HIDDEN_ATTR = "data-substrato-scrollbars-hidden";
  var GLYPH = { left: "‹", right: "›", up: "↑", down: "↓" };

  function isScrollable(el, axis) {
    var style = getComputedStyle(el);
    var overflow = axis === "x" ? style.overflowX : style.overflowY;
    if (!/(auto|scroll)/.test(overflow)) return false;
    var amount = axis === "x" ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    return amount > THRESHOLD;
  }

  function ensureScrollbarStyle() {
    var existing = document.getElementById(STYLE_ID);
    if (existing) return existing;

    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent =
      "[" + HIDDEN_ATTR + "]{" +
      "-ms-overflow-style:none!important;" +
      "scrollbar-width:none!important;" +
      "}" +
      "[" + HIDDEN_ATTR + "]::-webkit-scrollbar{" +
      "width:0!important;" +
      "height:0!important;" +
      "display:none!important;" +
      "}";
    document.head.appendChild(style);
    return style;
  }

  function init() {
    if (!document.body) return;
    ensureScrollbarStyle();

    var overlay = document.createElement("div");
    overlay.setAttribute("data-substrato-scroll-arrows", "");
    overlay.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2147483000;";
    document.body.appendChild(overlay);

    var tracked = new Map();
    var hiddenScrollbars = new Set();
    var rafId = 0;

    function makeButton(dir, target) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.tabIndex = -1;
      btn.setAttribute("aria-label", "Rolar " + dir);
      btn.textContent = GLYPH[dir];
      btn.style.cssText = [
        "position:fixed",
        "display:none",
        "align-items:center",
        "justify-content:center",
        "width:" + ARROW_SIZE + "px",
        "height:" + ARROW_SIZE + "px",
        "padding:0",
        "border-radius:999px",
        "border:1px solid rgba(148,163,184,0.32)",
        "background:rgba(15,23,42,0.78)",
        "color:rgba(248,250,252,0.92)",
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
      ].join(";");
      btn.addEventListener("mouseenter", function () {
        btn.style.opacity = "1";
        btn.style.transform = "scale(1.04)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.opacity = "0.82";
        btn.style.transform = "scale(1)";
      });
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var stepX = Math.max(80, Math.round(target.clientWidth * 0.8));
        var stepY = Math.max(80, Math.round(target.clientHeight * 0.8));
        var opt = { behavior: "smooth" };
        if (dir === "left") opt.left = -stepX;
        else if (dir === "right") opt.left = stepX;
        else if (dir === "up") opt.top = -stepY;
        else opt.top = stepY;
        target.scrollBy(opt);
      });
      overlay.appendChild(btn);
      return btn;
    }

    function ensureTracked(el) {
      var buttons = tracked.get(el);
      if (!buttons) {
        buttons = {
          left: makeButton("left", el),
          right: makeButton("right", el),
          up: makeButton("up", el),
          down: makeButton("down", el),
        };
        tracked.set(el, buttons);
      }
      return buttons;
    }

    function hideNativeScrollbar(el) {
      if (hiddenScrollbars.has(el)) return;
      el.setAttribute(HIDDEN_ATTR, "");
      hiddenScrollbars.add(el);
    }

    function place(btn, show, left, top) {
      if (!show) {
        btn.style.display = "none";
        return;
      }
      btn.style.display = "flex";
      btn.style.left = Math.round(left) + "px";
      btn.style.top = Math.round(top) + "px";
    }

    function getSafeViewport() {
      var safe = {
        top: CHROME_GAP,
        right: window.innerWidth - CHROME_GAP,
        bottom: window.innerHeight - CHROME_GAP,
        left: CHROME_GAP,
      };
      var chrome = document.querySelectorAll(
        "body > header, body > footer, header, footer, .main-header, .main-footer, [data-substrato-fixed-header], [data-substrato-fixed-footer]"
      );

      Array.prototype.forEach.call(chrome, function (node) {
        if (!(node instanceof HTMLElement) || node === overlay) return;
        var nodeStyle = getComputedStyle(node);
        if (nodeStyle.display === "none" || nodeStyle.visibility === "hidden") return;
        if (nodeStyle.position !== "fixed" && nodeStyle.position !== "sticky") return;

        var rect = node.getBoundingClientRect();
        var intersectsViewport =
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.top < window.innerHeight &&
          rect.right > 0 &&
          rect.left < window.innerWidth;
        if (!intersectsViewport) return;

        if (rect.top <= CHROME_GAP && rect.bottom < window.innerHeight * 0.5) {
          safe.top = Math.max(safe.top, rect.bottom + CHROME_GAP);
        }
        if (rect.bottom >= window.innerHeight - CHROME_GAP && rect.top > window.innerHeight * 0.5) {
          safe.bottom = Math.min(safe.bottom, rect.top - CHROME_GAP);
        }
      });

      return safe;
    }

    function clamp(value, min, max) {
      if (max < min) return min;
      return Math.min(Math.max(value, min), max);
    }

    function update() {
      rafId = 0;
      var winW = window.innerWidth;
      var winH = window.innerHeight;
      var safeViewport = getSafeViewport();
      var targets = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
      var present = new Set(targets);

      tracked.forEach(function (buttons, el) {
        if (!present.has(el) || !el.isConnected) {
          ["left", "right", "up", "down"].forEach(function (d) { buttons[d].remove(); });
          el.removeAttribute(HIDDEN_ATTR);
          hiddenScrollbars.delete(el);
          tracked.delete(el);
        }
      });

      targets.forEach(function (el) {
        hideNativeScrollbar(el);

        var rect = el.getBoundingClientRect();
        var visible = {
          top: Math.max(rect.top, safeViewport.top),
          right: Math.min(rect.right, safeViewport.right),
          bottom: Math.min(rect.bottom, safeViewport.bottom),
          left: Math.max(rect.left, safeViewport.left),
        };
        var visibleWidth = visible.right - visible.left;
        var visibleHeight = visible.bottom - visible.top;
        var onScreen =
          visibleWidth > ARROW_SIZE + EDGE_GAP * 2 &&
          visibleHeight > ARROW_SIZE + EDGE_GAP * 2 &&
          rect.bottom > 0 && rect.top < winH &&
          rect.right > 0 && rect.left < winW;
        var buttons = ensureTracked(el);
        if (!onScreen) {
          ["left", "right", "up", "down"].forEach(function (d) { buttons[d].style.display = "none"; });
          return;
        }
        var canX = isScrollable(el, "x");
        var canY = isScrollable(el, "y");
        var maxX = el.scrollWidth - el.clientWidth;
        var maxY = el.scrollHeight - el.clientHeight;
        var minX = visible.left + EDGE_GAP;
        var maxButtonX = visible.right - EDGE_GAP - ARROW_SIZE;
        var minY = visible.top + EDGE_GAP;
        var maxButtonY = visible.bottom - EDGE_GAP - ARROW_SIZE;
        var midY = clamp(rect.top + rect.height / 2 - ARROW_SIZE / 2, minY, maxButtonY);
        var midX = clamp(rect.left + rect.width / 2 - ARROW_SIZE / 2, minX, maxButtonX);

        place(buttons.left, canX && el.scrollLeft > THRESHOLD, minX, midY);
        place(buttons.right, canX && el.scrollLeft < maxX - THRESHOLD, maxButtonX, midY);
        place(buttons.up, canY && el.scrollTop > THRESHOLD, midX, minY);
        place(buttons.down, canY && el.scrollTop < maxY - THRESHOLD, midX, maxButtonY);
      });
    }

    function schedule() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    }

    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
