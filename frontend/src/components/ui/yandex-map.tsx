import { cn } from "@/lib/cn";
import type { GeoLocation } from "@/types";

interface YandexMapProps {
  location?: GeoLocation;
  className?: string;
  title?: string;
}

export function YandexMap({ location, className, title = "Карта" }: YandexMapProps) {
  if (!location) {
    return (
      <div
        className={cn(
          "bg-card rounded-[22px] grid place-items-center text-muted min-h-[260px]",
          className,
        )}
      >
        Координаты не заданы
      </div>
    );
  }

  const { lat, lng, zoom = 16 } = location;
  const ll = `${lng.toFixed(6)},${lat.toFixed(6)}`;
  const pt = `${ll},pm2rdl`;
  const src = `https://yandex.ru/map-widget/v1/?ll=${encodeURIComponent(ll)}&z=${zoom}&pt=${encodeURIComponent(pt)}`;
  const href = `https://yandex.ru/maps/?ll=${encodeURIComponent(ll)}&z=${zoom}&pt=${encodeURIComponent(pt)}`;

  return (
    <div className={cn("relative rounded-[22px] overflow-hidden bg-card", className)}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        className="w-full h-full min-h-[260px] border-0"
        allow="geolocation"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-3 bottom-3 bg-white/95 backdrop-blur-sm hover:bg-white text-ink text-xs font-semibold px-3 py-2 rounded-full shadow-md"
      >
        Открыть в Яндекс.Картах
      </a>
    </div>
  );
}
