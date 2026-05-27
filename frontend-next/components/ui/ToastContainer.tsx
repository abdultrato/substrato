"use client";

import { useEffect, useState } from "react";
import { subscribe } from "@/lib/toast";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration);
    });

    return unsubscribe;
  }, []);

  function accent(type: ToastType) {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200";
      case "error":
        return "border-rose-500/30 bg-rose-500/10 text-rose-950 dark:text-rose-200";
      case "warning":
        return "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-200";
      default:
        return "border-border bg-card/90 text-foreground";
    }
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 rounded-2xl border px-3 py-2 shadow-lg backdrop-blur-[2px] text-sm animate-fade-in ${accent(t.type)}`}
        >
          <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-70" />
          <span className="leading-snug">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
