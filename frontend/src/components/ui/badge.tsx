"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { ProductTag } from "@/types";

const styles: Record<ProductTag, string> = {
  hit: "bg-success text-white",
  new: "bg-danger text-white",
  sale: "bg-gold text-gold-ink",
  veg: "bg-success text-white",
};

const labels: Record<ProductTag, string> = {
  hit: "Хит",
  new: "Новинка",
  sale: "Скидка",
  veg: "Веган",
};

export function Badge({ tag, className }: { tag: ProductTag; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-[10px] text-[13px] font-bold leading-none",
        styles[tag],
        className,
      )}
    >
      {labels[tag]}
    </span>
  );
}

export function Counter({ count, className }: { count: number; className?: string }) {
  // Cart is persisted in localStorage via Zustand — hydrate on client only
  // to avoid SSR / client mismatch on initial render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count <= 0) return null;
  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 min-w-[20px] h-5 px-1 grid place-items-center rounded-full bg-danger-strong text-white text-[11px] font-bold shadow-[0_3px_8px_rgba(234,52,52,.35)]",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
