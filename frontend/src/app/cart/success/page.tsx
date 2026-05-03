import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata = { title: "Заказ принят" };

export default async function CartSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Container className="pt-10 md:pt-16 text-center">
      <div className="max-w-[520px] mx-auto py-8">
        <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight font-display mb-4">
          Заказ принят
        </h1>
        <p className="text-muted mb-3">
          Мы свяжемся с вами для подтверждения и сообщим, когда заказ будет готов.
        </p>
        {sp.order && (
          <p className="text-sm text-muted mb-6">
            Номер заказа: <span className="font-semibold">{sp.order}</span>
          </p>
        )}
        <Link href="/" className="text-brand underline font-semibold">
          На главную
        </Link>
      </div>
    </Container>
  );
}
