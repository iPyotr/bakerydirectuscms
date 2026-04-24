import { Container } from "@/components/ui/container";

export const metadata = { title: "О компании" };

export default function AboutPage() {
  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        О компании
      </h1>
      <article className="prose prose-neutral max-w-[720px] text-[16px] leading-relaxed">
        <p>
          «Дело вкуса» — мультиформатная гастрономическая платформа в Казани: пекарня и
          кондитерская, горячая кулинария и собственное производство полуфабрикатов ручной лепки.
        </p>
        <p className="mt-4">
          Мы печём хлеб на собственной закваске, делаем сытную и сладкую выпечку по проверенным
          рецептам, готовим курицу гриль и шаурму, а также лепим пельмени, вареники и манты на
          собственном производстве.
        </p>
        <h2 className="mt-8 text-2xl font-bold" id="production">
          Производство
        </h2>
        <p className="mt-3">
          Ежедневная пекарня работает с 04:00, лепка полуфабрикатов — круглосуточно. Всё
          оборудование сертифицировано, процессы проходят ежедневный контроль качества.
        </p>
        <h2 className="mt-8 text-2xl font-bold" id="jobs">
          Вакансии
        </h2>
        <p className="mt-3">
          Мы всегда рады талантливым пекарям, кондитерам и продавцам. Пишите на{" "}
          <a href="mailto:hr@delovkusa.ru" className="text-brand underline">
            hr@delovkusa.ru
          </a>
          .
        </p>
      </article>
    </Container>
  );
}
