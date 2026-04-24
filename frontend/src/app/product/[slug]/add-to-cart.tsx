"use client";

import { useCart } from "@/stores/cart";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, BagIcon, MinusIcon, PlusIcon } from "@/components/ui/icon";
import type { Product } from "@/types";

export function AddToCart({ product }: { product: Product }) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);
  const line = lines.find((l) => l.product.id === product.id);

  if (!line) {
    return (
      <Button size="xl" leftIcon={<BagIcon size={22} />} onClick={() => add(product)}>
        Добавить в корзину
        <ArrowRightIcon size={20} />
      </Button>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 h-16 rounded-[20px] bg-gold text-gold-ink px-3 shadow-[0_10px_18px_rgba(239,194,83,.28)]">
      <button
        type="button"
        aria-label="Убрать один"
        onClick={() => setQuantity(product.id, line.quantity - 1)}
        className="grid place-items-center w-12 h-12 rounded-full hover:bg-gold-dark"
      >
        <MinusIcon size={22} />
      </button>
      <span className="min-w-[60px] text-center text-xl font-extrabold tabular-nums">
        {line.quantity} шт
      </span>
      <button
        type="button"
        aria-label="Добавить один"
        onClick={() => add(product)}
        className="grid place-items-center w-12 h-12 rounded-full hover:bg-gold-dark"
      >
        <PlusIcon size={22} />
      </button>
    </div>
  );
}
