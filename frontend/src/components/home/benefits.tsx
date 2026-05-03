import type { ComponentType } from "react";
import { ChefIcon, HeartIcon, PickupIcon, SparkleIcon } from "@/components/ui/icon";
import type { Benefit, BenefitIcon } from "@/types";

const ICON_MAP: Record<BenefitIcon, ComponentType<{ size?: number }>> = {
  sparkle: SparkleIcon,
  chef: ChefIcon,
  heart: HeartIcon,
  pickup: PickupIcon,
};

export function Benefits({ items }: { items: Benefit[] }) {
  if (!items.length) return null;

  return (
    <section className="mt-12 md:mt-20 bg-[#f3efea] rounded-[22px] md:rounded-[28px] p-5 md:p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        {items.map((b, idx) => {
          const Icon = ICON_MAP[b.icon] ?? SparkleIcon;
          return (
            <div
              key={b.id}
              className={`flex items-center gap-4 px-3 md:px-6 py-4 md:py-2 ${idx < items.length - 1 ? "md:border-r border-black/10" : ""} ${idx % 2 === 0 ? "md:border-r border-r" : ""} ${idx < 2 ? "border-b md:border-b-0" : ""} border-black/10 md:border-b-0`}
            >
              <div className="grid place-items-center w-12 h-12 md:w-14 md:h-14 rounded-full border-[2.5px] border-ink shrink-0">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[14px] md:text-[16px] font-bold leading-tight">{b.title}</h3>
                {b.description && (
                  <p className="text-[12px] md:text-[13px] text-muted leading-snug mt-1">
                    {b.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
