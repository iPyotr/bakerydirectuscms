import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { fetchCategories, fetchProducts } from "@/lib/api";

export const revalidate = 300;

export async function generateStaticParams() {
  const categories = await fetchCategories();
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(
  props: PageProps<"/catalog/[category]">,
): Promise<Metadata> {
  const { category: slug } = await props.params;
  const categories = await fetchCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return { title: "Категория" };
  return {
    title: category.metaTitle ?? category.title,
    description: category.metaDescription,
    openGraph: category.ogImage ? { images: [category.ogImage] } : undefined,
  };
}

export default async function CategoryPage(props: PageProps<"/catalog/[category]">) {
  const { category: slug } = await props.params;
  const categories = await fetchCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const products = await fetchProducts({ category: slug });

  return (
    <Container className="pt-6 md:pt-10">
      <nav className="text-sm text-muted mb-3">
        <Link href="/catalog" className="hover:text-brand">
          Каталог
        </Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{category.title}</span>
      </nav>
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none">
        {category.title}
      </h1>
      {category.subtitle && <p className="text-muted mt-2">{category.subtitle}</p>}

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="mt-10 p-8 text-center rounded-[20px] bg-card text-muted">
          В этой категории пока нет товаров.
        </div>
      )}
    </Container>
  );
}
