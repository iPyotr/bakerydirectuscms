import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { fetchPromotions } from "@/lib/api";
import { assetUrl } from "@/lib/format";

export const metadata = { title: "Акции" };
export const revalidate = 300;

export default async function PromotionsPage() {
  const promos = await fetchPromotions();

  if (!promos.length) {
    return (
      <Container className="pt-6 md:pt-10">
        <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
          Акции
        </h1>
        <p className="text-muted">Сейчас активных акций нет. Загляните позже.</p>
      </Container>
    );
  }

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        Акции
      </h1>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {promos.map((p) => (
          <article key={p.id} className="bg-white rounded-[22px] p-6 shadow-card">
            {p.image && (
              <div className="relative aspect-[16/9] -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-[22px]">
                <Image
                  src={assetUrl(p.image, { width: 800, format: "webp" })}
                  alt={p.title}
                  fill
                  sizes="(max-width:768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
            )}
            {p.tag && <Badge tag={p.tag} />}
            <h2 className="text-xl font-bold mt-4 leading-tight">{p.title}</h2>
            {p.description && (
              <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-line">
                {p.description}
              </p>
            )}
            {p.discountPercent != null && (
              <div className="mt-3 inline-block bg-brand text-white px-3 py-1 rounded-full text-sm font-bold">
                −{p.discountPercent}%
              </div>
            )}
          </article>
        ))}
      </div>
    </Container>
  );
}
