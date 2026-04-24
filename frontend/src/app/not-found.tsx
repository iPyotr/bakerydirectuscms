import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <Container className="pt-16 md:pt-24">
      <div className="max-w-[520px] mx-auto text-center">
        <div className="text-[80px] md:text-[120px] font-extrabold tracking-tight text-gold leading-none font-display">
          404
        </div>
        <h1 className="text-[24px] md:text-[32px] font-bold mt-4">Страница не найдена</h1>
        <p className="text-muted mt-3 mb-8">
          Возможно, вы ошиблись адресом или страница временно недоступна.
        </p>
        <Button size="lg">
          <Link href="/" className="inline-flex items-center gap-3">
            На главную
            <ArrowRightIcon size={18} />
          </Link>
        </Button>
      </div>
    </Container>
  );
}
