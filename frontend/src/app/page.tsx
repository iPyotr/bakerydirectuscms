import { Container } from "@/components/ui/container";
import { Hero } from "@/components/home/hero";
import { CategoriesGrid } from "@/components/home/categories-grid";
import { PopularProducts } from "@/components/home/popular-products";
import { Benefits } from "@/components/home/benefits";
import { CategorySliders } from "@/components/home/category-sliders";
import { fetchBenefits, fetchCategories, fetchHeroSlides, fetchPopularProducts } from "@/lib/api";

export const revalidate = 60;

export default async function HomePage() {
  const [categories, popular, heroSlides, benefits] = await Promise.all([
    fetchCategories(),
    fetchPopularProducts(),
    fetchHeroSlides(),
    fetchBenefits(),
  ]);

  return (
    <Container className="pt-4 md:pt-6">
      <Hero slides={heroSlides} />
      <div className="mt-6 md:mt-8">
        <CategoriesGrid categories={categories} />
      </div>
      <PopularProducts products={popular} />
      <CategorySliders categories={categories} />
      <Benefits items={benefits} />
    </Container>
  );
}
