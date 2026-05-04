import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { CategoryCard } from "@/components/product/category-card";
import { fetchCategories, fetchProducts } from "@/lib/api";

export const metadata = { title: "Каталог" };
export const revalidate = 60;

export default async function CatalogPage() {
  const [categories, products] = await Promise.all([fetchCategories(), fetchProducts()]);

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-8">
        Каталог
      </h1>

      <section aria-label="Категории" className="mb-10 md:mb-14">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} variant="horizontal" />
          ))}
        </div>
      </section>

      {categories.map((category) => {
        const items = products.filter((p) => p.categorySlug === category.slug);
        if (items.length === 0) return null;
        return (
          <section
            key={category.id}
            aria-labelledby={`cat-${category.slug}`}
            className="mb-10 md:mb-14"
          >
            <div className="flex items-end justify-between mb-4 md:mb-6">
              <h2
                id={`cat-${category.slug}`}
                className="text-[24px] md:text-[36px] font-bold tracking-tight font-display leading-none"
              >
                {category.title}
              </h2>
              <Link
                href={`/catalog/${category.slug}`}
                className="text-sm md:text-base text-muted-soft hover:text-brand font-semibold"
              >
                Все {category.productsCount} →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        );
      })}
    </Container>
  );
}
