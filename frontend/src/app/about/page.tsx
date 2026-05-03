import ReactMarkdown from "react-markdown";
import { Container } from "@/components/ui/container";
import { fetchGlobals } from "@/lib/api";

export const metadata = { title: "О компании" };
export const revalidate = 300;

export default async function AboutPage() {
  const g = await fetchGlobals();
  const hrEmail = g.emailHr ?? g.emailGeneral ?? g.email;

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        О компании
      </h1>
      <article className="prose prose-neutral max-w-[720px] text-[16px] leading-relaxed">
        {g.aboutShort && <p className="text-[18px]">{g.aboutShort}</p>}
        {g.aboutLong && <p className="mt-6 whitespace-pre-line text-ink-soft">{g.aboutLong}</p>}

        {g.productionMd && (
          <>
            <h2 className="mt-10 text-2xl font-bold" id="production">Производство</h2>
            <div className="mt-3">
              <ReactMarkdown>{g.productionMd}</ReactMarkdown>
            </div>
          </>
        )}

        {g.careersMd && (
          <>
            <h2 className="mt-8 text-2xl font-bold" id="jobs">Вакансии</h2>
            <div className="mt-3">
              <ReactMarkdown>{g.careersMd}</ReactMarkdown>
            </div>
            {hrEmail && (
              <p className="mt-3">
                Пишите на{" "}
                <a href={`mailto:${hrEmail}`} className="text-brand underline">
                  {hrEmail}
                </a>
                .
              </p>
            )}
          </>
        )}

        {(g.legalName || g.inn) && (
          <div className="mt-12 pt-6 border-t border-black/10 text-sm text-muted">
            {g.legalName && <div>{g.legalName}</div>}
            {g.inn && <div>ИНН {g.inn}</div>}
          </div>
        )}
      </article>
    </Container>
  );
}
