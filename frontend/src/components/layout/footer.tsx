import Link from "next/link";
import Image from "next/image";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icon";
import type { Category, Globals } from "@/types";

const columns = [
  {
    title: "Покупателям",
    links: [
      { label: "Каталог", href: "/catalog" },
      { label: "Акции", href: "/promotions" },
      { label: "Доставка и самовывоз", href: "/contacts" },
      { label: "Программа лояльности", href: "/loyalty" },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О нас", href: "/about" },
      { label: "Производство", href: "/about#production" },
      { label: "Оптовым клиентам", href: "/contacts#b2b" },
      { label: "Вакансии", href: "/about#jobs" },
    ],
  },
];

export function Footer({
  categories,
  globals,
}: {
  categories: Category[];
  globals: Globals;
}) {

  return (
    <footer className="hidden md:block mt-16 md:mt-24 bg-[#1b1714] text-[#efe4d0] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(239,194,83,.14),transparent_55%)] pointer-events-none" />
      <div className="relative mx-auto w-full max-w-[1460px] px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10">
          <div className="col-span-2 lg:col-span-2">
            <Image
              src="/ico/brand-mark.svg"
              alt="Дело вкуса"
              width={220}
              height={26}
              className="h-7 md:h-8 w-auto mb-5"
            />
            <p className="text-[#d3c7b0] text-sm leading-relaxed max-w-sm">
              Пекарня, кулинария и собственное производство в Казани с 2013 года. Свежая выпечка
              каждое утро, домашняя кухня и полуфабрикаты ручной лепки.
            </p>
            <div className="mt-5 flex flex-col gap-2 text-sm">
              <a
                href={`tel:${globals.phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-2 text-white hover:text-gold transition-colors"
              >
                <PhoneIcon size={18} />
                {globals.phone}
              </a>
              <span className="inline-flex items-start gap-2 text-[#d3c7b0]">
                <PinIcon size={18} className="mt-0.5 shrink-0" />
                {globals.address}
              </span>
              <span className="inline-flex items-center gap-2 text-[#d3c7b0]">
                <ClockIcon size={18} />
                {globals.workingHours}
              </span>
              <a
                href="mailto:hello@delovkusa.ru"
                className="inline-flex items-center gap-2 text-[#d3c7b0] hover:text-gold transition-colors"
              >
                <MailIcon size={18} />
                hello@delovkusa.ru
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">
              Каталог
            </h4>
            <ul className="flex flex-col gap-2 text-sm">
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/catalog/${c.slug}`} className="hover:text-gold transition-colors">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-gold transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-gold font-semibold mb-4 text-sm uppercase tracking-wider">
              Соцсети
            </h4>
            <ul className="flex flex-col gap-2 text-sm">
              {globals.social?.vk && (
                <li>
                  <a href={globals.social.vk} className="hover:text-gold transition-colors">
                    ВКонтакте
                  </a>
                </li>
              )}
              {globals.social?.telegram && (
                <li>
                  <a href={globals.social.telegram} className="hover:text-gold transition-colors">
                    Telegram
                  </a>
                </li>
              )}
              {globals.social?.instagram && (
                <li>
                  <a href={globals.social.instagram} className="hover:text-gold transition-colors">
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#b6a98d]">
          <span>© {new Date().getFullYear()} «Дело вкуса». Все права защищены.</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/terms" className="hover:text-gold transition-colors">
              Публичная оферта
            </Link>
            <Link href="/legal/privacy" className="hover:text-gold transition-colors">
              Политика конфиденциальности
            </Link>
            <span className="opacity-60">МИР · Visa · Mastercard · СБП</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
