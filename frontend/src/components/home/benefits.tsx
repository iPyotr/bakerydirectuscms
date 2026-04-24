import { ChefIcon, HeartIcon, PickupIcon, SparkleIcon } from "@/components/ui/icon";

const items = [
  {
    Icon: SparkleIcon,
    title: "Натуральные ингредиенты",
    description: "Только отборные продукты без искусственных добавок",
  },
  {
    Icon: ChefIcon,
    title: "Свежая выпечка каждый день",
    description: "Ремесленный подход и круглосуточная пекарня",
  },
  {
    Icon: HeartIcon,
    title: "Готовим с душой",
    description: "Для вас и вашей семьи — как дома, только вкуснее",
  },
  {
    Icon: PickupIcon,
    title: "Удобный самовывоз",
    description: "Быстро, без очередей, с бесконтактной оплатой",
  },
];

export function Benefits() {
  return (
    <section className="mt-12 md:mt-20 bg-[#f3efea] rounded-[22px] md:rounded-[28px] p-5 md:p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        {items.map(({ Icon, title, description }, idx) => (
          <div
            key={title}
            className={`flex items-center gap-4 px-3 md:px-6 py-4 md:py-2 ${idx < items.length - 1 ? "md:border-r border-black/10" : ""} ${idx % 2 === 0 ? "md:border-r border-r" : ""} ${idx < 2 ? "border-b md:border-b-0" : ""} border-black/10 md:border-b-0`}
          >
            <div className="grid place-items-center w-12 h-12 md:w-14 md:h-14 rounded-full border-[2.5px] border-ink shrink-0">
              <Icon size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] md:text-[16px] font-bold leading-tight">{title}</h3>
              <p className="text-[12px] md:text-[13px] text-muted leading-snug mt-1">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
