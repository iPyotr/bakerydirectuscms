"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/stores/cart";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, MinusIcon } from "@/components/ui/icon";
import { assetUrl, formatPrice } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
  compact?: boolean;
}

export function ProductCard({ product, className, compact = false }: ProductCardProps) {
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQuantity = useCart((s) => s.setQuantity);
  const line = lines.find((l) => l.product.id === product.id);
  const inCart = Boolean(line);

  return (
    <article
      className={cn(
        "group bg-white rounded-[18px] overflow-hidden shadow-[0_10px_20px_rgba(70,45,20,.05)] transition-transform hover:-translate-y-0.5",
        className,
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className={cn(
          "relative block w-full overflow-hidden bg-gradient-to-br from-[#624223] via-[#27180f] to-[#915d2e]",
          compact ? "aspect-[4/3]" : "aspect-[4/3] md:aspect-[5/4]",
        )}
      >
        <Image
          src={assetUrl(product.image, { width: 480, format: "webp" })}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 20vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.tag && (
          <div className="absolute left-2.5 top-2.5">
            <Badge tag={product.tag} />
          </div>
        )}
      </Link>
      <div className={cn("p-4 flex flex-col gap-2.5", compact && "p-3 gap-1.5")}>
        <Link
          href={`/product/${product.slug}`}
          className={cn(
            "font-bold leading-tight min-h-[42px] hover:text-brand transition-colors line-clamp-2",
            compact ? "text-[13px] min-h-[34px]" : "text-[16px]",
          )}
        >
          {product.title}
        </Link>
        <div className={cn("text-muted", compact ? "text-[12px]" : "text-[14px]")}>
          {product.weight}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div
            className={cn(
              "font-extrabold tabular-nums whitespace-nowrap",
              compact ? "text-[17px]" : "text-[18px] md:text-[22px]",
            )}
          >
            {formatPrice(product.price)}
          </div>
          {!inCart ? (
            <button
              type="button"
              aria-label={`Добавить ${product.title} в корзину`}
              onClick={(e) => {
                e.preventDefault();
                add(product);
              }}
              className={cn(
                "grid place-items-center rounded-full bg-gold text-gold-ink hover:bg-gold-dark transition-colors shadow-[0_6px_12px_rgba(239,194,83,.28)] shrink-0",
                compact ? "w-9 h-9" : "w-9 h-9 md:w-11 md:h-11",
              )}
            >
              <PlusIcon size={compact ? 18 : 20} />
            </button>
          ) : (
            <div
              className={cn(
                "inline-flex items-center rounded-full bg-gold text-gold-ink overflow-hidden shrink-0",
                compact ? "h-9" : "h-9 md:h-11",
              )}
            >
              <button
                type="button"
                aria-label="Убрать один"
                onClick={(e) => {
                  e.preventDefault();
                  setQuantity(product.id, (line?.quantity ?? 1) - 1);
                }}
                className={cn(
                  "grid place-items-center hover:bg-gold-dark h-full",
                  compact ? "w-8" : "w-8 md:w-11",
                )}
              >
                <MinusIcon size={compact ? 16 : 18} />
              </button>
              <span className="px-1.5 min-w-6 md:min-w-7 text-center font-bold tabular-nums text-[14px] md:text-[16px]">
                {line?.quantity}
              </span>
              <button
                type="button"
                aria-label="Добавить один"
                onClick={(e) => {
                  e.preventDefault();
                  add(product);
                }}
                className={cn(
                  "grid place-items-center hover:bg-gold-dark h-full",
                  compact ? "w-8" : "w-8 md:w-11",
                )}
              >
                <PlusIcon size={compact ? 16 : 18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
