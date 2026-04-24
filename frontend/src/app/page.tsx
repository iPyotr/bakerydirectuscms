import { Container } from "@/components/ui/container";
import { Hero } from "@/components/home/hero";
import { CategoriesGrid } from "@/components/home/categories-grid";
import { PopularProducts } from "@/components/home/popular-products";
import { Benefits } from "@/components/home/benefits";
import { CategorySliders } from "@/components/home/category-sliders";
import { fetchCategories, fetchHeroSlides, fetchPopularProducts } from "@/lib/api";

export const revalidate = 300;

export default async function HomePage() {
  const [categories, popular, heroSlides] = await Promise.all([
    fetchCategories(),
    fetchPopularProducts(),
    fetchHeroSlides(),
  ]);

  return (
    <Container className="pt-4 md:pt-6">
      <Hero slides={heroSlides} />
      <div className="mt-6 md:mt-8">
        <CategoriesGrid categories={categories} />
      </div>
      <PopularProducts products={popular} />
      <CategorySliders categories={categories} />
      <Benefits />
    </Container>
  );
}
