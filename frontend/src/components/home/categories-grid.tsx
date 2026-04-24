import Link from "next/link";
import { CategoryCard } from "@/components/product/category-card";
import { ArrowRightIcon } from "@/components/ui/icon";
import type { Category } from "@/types";

export function CategoriesGrid({ categories }: { categories: Category[] }) {
  return (
    <section aria-labelledby="categories-heading">
      <div className="flex items-end justify-between mb-4 md:mb-6">
        <h2 id="categories-heading" className="sr-only">
          Категории
        </h2>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
        {categories.map((c) => (
          <CategoryCard key={c.id} category={c} variant="horizontal" />
        ))}
      </div>

      {/* Mobile horizontal scroll */}
      <div className="md:hidden -mx-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 px-4 pb-2 min-w-max">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} variant="vertical" />
          ))}
        </div>
      </div>

      <div className="mt-5 md:hidden">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-soft hover:text-brand"
        >
          Все категории
          <ArrowRightIcon size={16} />
        </Link>
      </div>
    </section>
  );
}
