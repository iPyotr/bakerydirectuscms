import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Акции" };

const promos = [
  {
    title: "2+1 на сдобные булочки",
    description: "Каждая третья булочка в подарок. Каждое воскресенье.",
    tag: "new" as const,
  },
  {
    title: "Кэшбэк 10% на первый заказ",
    description: "Зарегистрируйтесь через Яндекс ID и получите бонусы на следующий заказ.",
    tag: "hit" as const,
  },
  {
    title: "Счастливые часы 17:00–19:00",
    description: "Скидка 20% на выпечку дня. Каждый будний день.",
    tag: "sale" as const,
  },
];

export default function PromotionsPage() {
  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        Акции
      </h1>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {promos.map((p) => (
          <article key={p.title} className="bg-white rounded-[22px] p-6 shadow-card">
            <Badge tag={p.tag} />
            <h2 className="text-xl font-bold mt-4 leading-tight">{p.title}</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">{p.description}</p>
          </article>
        ))}
      </div>
    </Container>
  );
}
