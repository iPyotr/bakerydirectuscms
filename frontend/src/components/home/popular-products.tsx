import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { ArrowRightIcon } from "@/components/ui/icon";
import type { Product } from "@/types";

export function PopularProducts({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="popular-heading" className="mt-10 md:mt-16">
      <div className="flex items-end justify-between mb-5 md:mb-6">
        <h2
          id="popular-heading"
          className="text-[28px] md:text-[56px] font-bold tracking-tight font-display leading-none"
        >
          Популярное
        </h2>
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-sm md:text-lg font-semibold text-muted-soft hover:text-brand"
        >
          Смотреть все
          <ArrowRightIcon size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
