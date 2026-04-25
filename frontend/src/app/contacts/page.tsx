import Image from "next/image";
import { Container } from "@/components/ui/container";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icon";
import { YandexMap } from "@/components/ui/yandex-map";
import { fetchGlobals, fetchLocations } from "@/lib/api";
import { assetUrl } from "@/lib/format";

export const metadata = { title: "Контакты" };
export const revalidate = 300;

export default async function ContactsPage() {
  const [globals, locations] = await Promise.all([fetchGlobals(), fetchLocations()]);

  // Use the first location if any are configured, otherwise fall back to
  // singleton globals (one-shop scenario).
  const primary = locations[0];
  const title = primary?.title ?? `Пекарня «${globals.brandName}»`;
  const address = primary?.address ?? globals.address;
  const phone = primary?.phone ?? globals.phone;
  const workingHours = primary?.workingHours ?? globals.workingHours;
  const location = primary?.location ?? globals.location;
  const image = primary?.image;

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        Контакты
      </h1>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-white rounded-[22px] overflow-hidden shadow-card flex flex-col">
          {image && (
            <div className="relative aspect-[16/9] w-full">
              <Image
                src={assetUrl(image, { width: 1200, format: "webp" })}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          )}
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold">{title}</h2>
            <div className="flex items-start gap-3">
              <PinIcon className="shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{address}</div>
                <div className="text-sm text-muted">Самовывоз, зона ожидания</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PhoneIcon />
              <a
                href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                className="font-semibold"
              >
                {phone}
              </a>
            </div>
            {globals.email && (
              <div className="flex items-center gap-3">
                <MailIcon />
                <a href={`mailto:${globals.email}`} className="font-semibold">
                  {globals.email}
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <ClockIcon />
              <span>{workingHours}</span>
            </div>
          </div>
        </section>

        <YandexMap
          location={location}
          title={`${title} на Яндекс.Картах`}
          className="aspect-[4/3] md:aspect-auto"
        />
      </div>

      {/* If multiple locations are configured, list the rest below. */}
      {locations.length > 1 && (
        <section className="mt-12">
          <h2 className="text-[24px] md:text-[32px] font-bold tracking-tight font-display leading-none mb-6">
            Другие точки
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.slice(1).map((loc) => (
              <article
                key={loc.id}
                className="bg-white rounded-[20px] p-5 shadow-card"
              >
                <h3 className="font-bold text-[17px]">{loc.title}</h3>
                <div className="mt-3 flex items-start gap-2 text-sm">
                  <PinIcon size={18} className="shrink-0 mt-0.5 text-muted" />
                  <span>{loc.address}</span>
                </div>
                {loc.phone && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <PhoneIcon size={18} className="text-muted" />
                    <a href={`tel:${loc.phone.replace(/[^+\d]/g, "")}`}>{loc.phone}</a>
                  </div>
                )}
                {loc.workingHours && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <ClockIcon size={18} className="text-muted" />
                    <span>{loc.workingHours}</span>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
