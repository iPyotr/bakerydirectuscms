import { Container } from "@/components/ui/container";
import { fetchGlobals } from "@/lib/api";

export const metadata = { title: "О компании" };
export const revalidate = 300;

export default async function AboutPage() {
  const globals = await fetchGlobals();

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        О компании
      </h1>
      <article className="prose prose-neutral max-w-[720px] text-[16px] leading-relaxed">
        {globals.aboutShort && <p className="text-[18px]">{globals.aboutShort}</p>}
        {globals.aboutLong && (
          <p className="mt-6 whitespace-pre-line text-ink-soft">{globals.aboutLong}</p>
        )}

        <h2 className="mt-10 text-2xl font-bold" id="production">
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
          <a href={`mailto:${globals.email ?? "hr@delovkusa.ru"}`} className="text-brand underline">
            {globals.email ?? "hr@delovkusa.ru"}
          </a>
          .
        </p>

        {(globals.legalName || globals.inn) && (
          <div className="mt-12 pt-6 border-t border-black/10 text-sm text-muted">
            {globals.legalName && <div>{globals.legalName}</div>}
            {globals.inn && <div>ИНН {globals.inn}</div>}
          </div>
        )}
      </article>
    </Container>
  );
}
