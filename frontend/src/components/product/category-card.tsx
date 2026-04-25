import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { assetUrl, productsCount } from "@/lib/format";
import { ArrowRightIcon } from "@/components/ui/icon";
import type { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
  className?: string;
  variant?: "horizontal" | "vertical" | "slider";
}

/**
 * Pick the best master image for a category. We prefer the wide slider master
 * (1920×900) for any "filled" variant — it crops nicely at any aspect ratio
 * and looks natural across hero / horizontal / vertical card sizes.
 */
function backgroundFor(category: Category) {
  return category.sliderImage ?? category.image;
}

export function CategoryCard({ category, className, variant = "horizontal" }: CategoryCardProps) {
  if (variant === "slider") {
    return (
      <Link
        href={`/catalog/${category.slug}`}
        className={cn(
          "relative block min-w-[280px] h-[170px] rounded-[20px] overflow-hidden shadow-[0_10px_24px_rgba(70,45,20,.08)] group",
          className,
        )}
      >
        <Image
          src={assetUrl(backgroundFor(category), { width: 640, format: "webp" })}
          alt={category.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 70vw, 320px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="text-lg font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            {category.title}
          </div>
          <div className="text-xs opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
            {productsCount(category.productsCount)}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "vertical") {
    // Mobile-scroll variant — narrow photo tile (no white frame, photo edge-to-edge).
    return (
      <Link
        href={`/catalog/${category.slug}`}
        className={cn(
          "relative block w-[120px] h-[150px] rounded-[18px] overflow-hidden shrink-0 shadow-[0_8px_18px_rgba(70,45,20,.08)] group",
          className,
        )}
      >
        <Image
          src={assetUrl(backgroundFor(category), { width: 320, format: "webp" })}
          alt={category.title}
          fill
          sizes="160px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/0" />
        <div className="absolute inset-x-0 bottom-0 p-2.5 text-white">
          <div className="text-[13px] font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
            {category.title}
          </div>
          <div className="text-[11px] opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] mt-0.5">
            {productsCount(category.productsCount)}
          </div>
        </div>
      </Link>
    );
  }

  // horizontal — большая полноценная фото-плитка для grid на главной/каталоге.
  return (
    <Link
      href={`/catalog/${category.slug}`}
      className={cn(
        "relative block aspect-[5/3] md:aspect-[16/10] rounded-[22px] overflow-hidden",
        "shadow-[0_10px_24px_rgba(70,45,20,.10)] group transition-transform hover:-translate-y-0.5",
        className,
      )}
    >
      <Image
        src={assetUrl(backgroundFor(category), { width: 720, format: "webp" })}
        alt={category.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      {/* Bottom-up gradient — dark + warm, держит читаемость на любом фото */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/0" />
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 flex items-end justify-between gap-3 text-white">
        <div className="min-w-0">
          <h3 className="text-[18px] md:text-[22px] font-extrabold leading-tight tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
            {category.title}
          </h3>
          <p className="mt-1 text-[12px] md:text-[13px] font-medium opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            {productsCount(category.productsCount)}
          </p>
        </div>
        <span
          className="grid place-items-center w-9 h-9 rounded-full bg-gold/95 text-gold-ink shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-gold"
          aria-hidden
        >
          <ArrowRightIcon size={18} />
        </span>
      </div>
    </Link>
  );
}
