import { CategoryCard } from "@/components/product/category-card";
import type { Category } from "@/types";

export function CategorySliders({ categories }: { categories: Category[] }) {
  const sliderCats = categories.filter((c) => c.sliderImage);
  if (sliderCats.length === 0) return null;

  return (
    <section aria-labelledby="slider-cats" className="mt-10 md:mt-16">
      <h2
        id="slider-cats"
        className="text-[22px] md:text-[36px] font-bold tracking-tight font-display leading-none mb-4 md:mb-6"
      >
        Загляните в любимое
      </h2>
      <div className="-mx-4 md:-mx-0 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 md:gap-4 px-4 md:px-0 pb-2 min-w-max md:min-w-0 md:grid md:grid-cols-3 xl:grid-cols-5">
          {sliderCats.map((c) => (
            <CategoryCard key={c.id} category={c} variant="slider" />
          ))}
        </div>
      </div>
    </section>
  );
}
