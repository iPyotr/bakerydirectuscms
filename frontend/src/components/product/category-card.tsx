import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { assetUrl, productsCount } from "@/lib/format";
import type { Category } from "@/types";

interface CategoryCardProps {
  category: Category;
  className?: string;
  variant?: "horizontal" | "vertical" | "slider";
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
        {category.sliderImage ? (
          <Image
            src={assetUrl(category.sliderImage, { width: 640, format: "webp" })}
            alt={category.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 70vw, 320px"
          />
        ) : (
          <Image
            src={assetUrl(category.image, { width: 640, format: "webp" })}
            alt={category.title}
            fill
            className="object-cover"
            sizes="320px"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <div className="text-lg font-bold leading-tight">{category.title}</div>
          <div className="text-xs opacity-80">{productsCount(category.productsCount)}</div>
        </div>
      </Link>
    );
  }

  if (variant === "vertical") {
    return (
      <Link
        href={`/catalog/${category.slug}`}
        className={cn(
          "bg-card rounded-[20px] p-3 flex flex-col items-center gap-2 text-center min-w-[120px]",
          "transition-transform hover:-translate-y-0.5",
          className,
        )}
      >
        <div className="relative w-16 h-16">
          <Image
            src={assetUrl(category.image, { width: 200, format: "webp" })}
            alt={category.title}
            fill
            sizes="80px"
            className="object-cover rounded-full"
          />
        </div>
        <div>
          <div className="text-[13px] font-bold leading-tight">{category.title}</div>
          <div className="text-[11px] text-muted mt-1">{productsCount(category.productsCount)}</div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/catalog/${category.slug}`}
      className={cn(
        "bg-card rounded-[22px] px-4 py-3 flex items-center gap-4 min-h-[120px]",
        "hover:bg-white hover:shadow-card transition-all",
        className,
      )}
    >
      <div className="relative w-[72px] h-[72px] shrink-0">
        <Image
          src={assetUrl(category.image, { width: 200, format: "webp" })}
          alt={category.title}
          fill
          sizes="80px"
          className="object-cover rounded-full"
        />
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-[17px] leading-tight">{category.title}</h3>
        <p className="text-muted text-[13px] mt-1">{productsCount(category.productsCount)}</p>
      </div>
    </Link>
  );
}
