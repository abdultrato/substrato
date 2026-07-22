"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Contentor de rolagem horizontal para os cartões de uma coluna do kanban.
 * Reproduz o padrão das setas do sub-nav de módulos do cabeçalho (ChevronLeft/
 * ChevronRight sobre um scroller com overflow-x e barra escondida), mas aqui a
 * navegar cartões em vez de módulos. As setas só aparecem quando há conteúdo
 * fora de vista para esse lado.
 */
export default function ColumnCardScroller({ children }: { children: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    const mo = typeof MutationObserver !== "undefined" ? new MutationObserver(update) : null;
    mo?.observe(el, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = Math.max(160, Math.floor(el.clientWidth * 0.8));
    el.scrollBy({ left: direction === "right" ? distance : -distance, behavior: "smooth" });
    window.setTimeout(update, 260);
  }, [update]);

  const btn = "absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg border border-border/80 bg-background/90 text-foreground-2 shadow-sm backdrop-blur transition hover:border-primary/35 hover:bg-primary/8 hover:text-primary";

  return (
    <div className="relative">
      {canLeft ? (
        <button type="button" onClick={() => scroll("left")} aria-label="Cartões anteriores" title="Cartões anteriores" className={`${btn} left-1`}>
          <ChevronLeft size={15} />
        </button>
      ) : null}
      <div
        ref={scrollerRef}
        className="flex items-stretch gap-1.5 overflow-x-auto scroll-smooth bg-background/25 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      {canRight ? (
        <button type="button" onClick={() => scroll("right")} aria-label="Próximos cartões" title="Próximos cartões" className={`${btn} right-1`}>
          <ChevronRight size={15} />
        </button>
      ) : null}
    </div>
  );
}
