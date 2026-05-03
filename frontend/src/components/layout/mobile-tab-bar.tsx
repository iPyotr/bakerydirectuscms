"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/stores/cart";
import { cn } from "@/lib/cn";
import {
  BagIcon,
  CatalogIcon,
  HomeIcon,
  TagIcon,
  UserIcon,
} from "@/components/ui/icon";
import { Counter } from "@/components/ui/badge";
import type { NavIcon, NavMenuItem } from "@/types";
import type { ComponentType } from "react";

const ICON_MAP: Record<NavIcon, ComponentType<{ size?: number }>> = {
  home: HomeIcon,
  catalog: CatalogIcon,
  cart: BagIcon,
  promo: TagIcon,
  profile: UserIcon,
  none: HomeIcon,
};

export function MobileTabBar({ items }: { items: NavMenuItem[] }) {
  const pathname = usePathname();
  const totalItems = useCart((s) => s.totalItems());
  if (!items.length) return null;

  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[560px] bg-white rounded-[22px] shadow-[0_-6px_20px_rgba(70,45,20,.08),0_2px_0_rgba(0,0,0,.02)] flex justify-between gap-1 px-2 py-2">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? HomeIcon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-1.5 rounded-[14px] transition-colors text-[11px] font-medium leading-none",
                active ? "text-brand font-bold" : "text-ink-soft hover:text-brand",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={24} />
                {item.icon === "cart" && (
                  <Counter count={totalItems} className="-top-2 -right-2" />
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
