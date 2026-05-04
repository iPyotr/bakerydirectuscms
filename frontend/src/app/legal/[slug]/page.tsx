import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Container } from "@/components/ui/container";
import { fetchLegalPage } from "@/lib/api";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchLegalPage(slug);
  if (!page) return {};
  return { title: page.title };
}

export default async function LegalPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchLegalPage(slug);
  if (!page) notFound();

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        {page.title}
      </h1>
      <article className="prose prose-neutral max-w-[720px] text-[16px] leading-relaxed">
        <ReactMarkdown>{page.bodyMd}</ReactMarkdown>
      </article>
    </Container>
  );
}
