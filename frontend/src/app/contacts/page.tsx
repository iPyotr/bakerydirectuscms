import { Container } from "@/components/ui/container";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icon";
import { YandexMap } from "@/components/ui/yandex-map";
import { fetchGlobals } from "@/lib/api";

export const metadata = { title: "Контакты" };

export default async function ContactsPage() {
  const globals = await fetchGlobals();

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        Контакты
      </h1>
      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white rounded-[22px] p-6 shadow-card space-y-4">
          <h2 className="text-xl font-bold">Пекарня «Дело вкуса»</h2>
          <div className="flex items-start gap-3">
            <PinIcon className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">{globals.address}</div>
              <div className="text-sm text-muted">Самовывоз, зона ожидания</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PhoneIcon />
            <a href={`tel:${globals.phone.replace(/[^+\d]/g, "")}`} className="font-semibold">
              {globals.phone}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <MailIcon />
            <a href="mailto:hello@delovkusa.ru" className="font-semibold">
              hello@delovkusa.ru
            </a>
          </div>
          <div className="flex items-center gap-3">
            <ClockIcon />
            <span>{globals.workingHours}</span>
          </div>
        </section>
        <YandexMap
          location={globals.location}
          title={`Пекарня «${globals.brandName}» на Яндекс.Картах`}
          className="aspect-[4/3] md:aspect-auto"
        />
      </div>
    </Container>
  );
}
