import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { AddToCart } from "./add-to-cart";
import { Badge } from "@/components/ui/badge";
import { fetchCategories, fetchProduct, fetchProducts } from "@/lib/api";
import { assetUrl, formatPrice } from "@/lib/format";

export const revalidate = 300;

export async function generateMetadata(
  props: PageProps<"/product/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await fetchProduct(slug);
  if (!product) return { title: "Товар не найден" };
  return {
    title: product.metaTitle ?? product.title,
    description: product.metaDescription ?? product.description,
    openGraph: product.ogImage ? { images: [product.ogImage] } : undefined,
  };
}

export default async function ProductPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  const product = await fetchProduct(slug);
  if (!product) notFound();

  const [categories, related] = await Promise.all([
    fetchCategories(),
    fetchProducts({ category: product.categorySlug, limit: 10 }),
  ]);
  const category = categories.find((c) => c.slug === product.categorySlug);

  return (
    <Container className="pt-6 md:pt-10">
      <nav className="text-sm text-muted mb-4 flex flex-wrap gap-x-2">
        <Link href="/catalog" className="hover:text-brand">
          Каталог
        </Link>
        <span>/</span>
        {category && (
          <>
            <Link href={`/catalog/${category.slug}`} className="hover:text-brand">
              {category.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
        <div className="relative aspect-square rounded-[24px] overflow-hidden bg-card">
          <Image
            src={assetUrl(product.image, { width: 1200, format: "webp" })}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
          {product.tag && (
            <div className="absolute left-4 top-4">
              <Badge tag={product.tag} />
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h1 className="text-[28px] md:text-[40px] font-bold tracking-tight font-display leading-tight">
            {product.title}
          </h1>
          <div className="mt-2 text-muted">{product.weight}</div>
          <div className="mt-6 flex items-baseline gap-3">
            <div className="text-[36px] font-extrabold tabular-nums">
              {formatPrice(product.price)}
            </div>
            {product.oldPrice && (
              <div className="text-lg text-muted line-through tabular-nums">
                {formatPrice(product.oldPrice)}
              </div>
            )}
          </div>
          {product.description && (
            <p className="mt-5 text-[15px] leading-relaxed text-ink-soft max-w-prose">
              {product.description}
            </p>
          )}
          <div className="mt-8">
            <AddToCart product={product} />
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-card rounded-[16px]">
              <dt className="text-muted mb-1">Самовывоз</dt>
              <dd className="font-semibold">Из пекарни на Гвардейской, 54</dd>
            </div>
            <div className="p-4 bg-card rounded-[16px]">
              <dt className="text-muted mb-1">Готовность</dt>
              <dd className="font-semibold">Сегодня, в течение дня</dd>
            </div>
          </dl>
        </div>
      </div>

      {related.length > 1 && (
        <section className="mt-16">
          <h2 className="text-[22px] md:text-[32px] font-bold tracking-tight font-display leading-none mb-5">
            С этим покупают
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {related
              .filter((p) => p.slug !== product.slug)
              .slice(0, 5)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </section>
      )}
    </Container>
  );
}
