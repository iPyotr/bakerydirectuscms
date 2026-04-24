"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useCart } from "@/stores/cart";
import { formatPrice } from "@/lib/format";
import {
  BagIcon,
  MenuIcon,
  PinIcon,
  SearchIcon,
  UserIcon,
  CloseIcon,
} from "@/components/ui/icon";
import { Counter } from "@/components/ui/badge";
import { SsoButtons } from "@/components/auth/sso-buttons";
import type { Category, Globals } from "@/types";

interface HeaderProps {
  categories: Category[];
  globals: Globals;
}

const navLinks = [
  { href: "/catalog", label: "Каталог" },
  { href: "/about", label: "О компании" },
  { href: "/contacts", label: "Контакты" },
  { href: "/promotions", label: "Акции" },
];

export function Header({ categories, globals }: HeaderProps) {
  const totalItems = useCart((s) => s.totalItems());
  const totalPrice = useCart((s) => s.totalPrice());
  const [showAuth, setShowAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setHidden(false);
      else if (y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 6) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-transform duration-300",
          hidden ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <div className="mx-auto w-full max-w-[1460px] px-3 md:px-6 pt-3">
          <div className="bg-panel rounded-[24px] shadow-[0_14px_30px_rgba(75,50,20,0.08)] px-4 md:px-6 py-3 md:py-4 flex items-center gap-4">
            {/* Mobile / tablet menu button */}
            <button
              type="button"
              aria-label="Открыть меню"
              onClick={() => setMenuOpen(true)}
              className="lg:hidden grid place-items-center w-10 h-10 -ml-1 text-ink"
            >
              <MenuIcon size={28} />
            </button>

            {/* Logo (wordmark) */}
            <Link href="/" aria-label="Дело вкуса" className="inline-flex items-center select-none">
              <Image
                src="/ico/brand-mark.svg"
                alt="Дело вкуса"
                width={200}
                height={24}
                priority
                className="h-6 md:h-8 w-auto"
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-6 xl:gap-10 ml-4 xl:ml-6 text-[15px] font-medium text-ink-soft whitespace-nowrap">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-brand transition-colors">
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Location */}
            <div className="hidden xl:flex items-start gap-2 ml-auto text-[14px] font-semibold text-ink whitespace-nowrap">
              <PinIcon size={20} className="shrink-0 mt-0.5" />
              <div className="leading-tight">
                {globals.address}
                <small className="block text-muted text-[13px] font-medium mt-0.5">
                  {globals.workingHours}
                </small>
              </div>
            </div>

            {/* Actions */}
            <div className="ml-auto xl:ml-0 flex items-center gap-2 md:gap-3">
              <button
                type="button"
                aria-label="Поиск"
                className="hidden md:grid place-items-center w-11 h-11 rounded-full hover:bg-black/5 transition-colors"
              >
                <SearchIcon size={24} />
              </button>
              <button
                type="button"
                aria-label="Профиль"
                onClick={() => setShowAuth(true)}
                className="hidden md:grid place-items-center w-11 h-11 rounded-full hover:bg-black/5 transition-colors"
              >
                <UserIcon size={24} />
              </button>

              <Link
                href="/cart"
                aria-label="Корзина"
                className={cn(
                  "hidden md:inline-flex items-center gap-3 h-[52px] rounded-[18px] px-4",
                  "bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,.04),0_6px_12px_rgba(0,0,0,.03)]",
                  "font-bold text-[15px]",
                )}
              >
                <span className="relative grid place-items-center">
                  <BagIcon size={26} />
                  <Counter count={totalItems} />
                </span>
                <span className="tabular-nums whitespace-nowrap">
                  {totalItems > 0 ? formatPrice(totalPrice) : "Корзина"}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Auth sheet */}
      {showAuth && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-end md:place-items-center"
          onClick={() => setShowAuth(false)}
        >
          <div
            className="w-full md:max-w-[420px] bg-panel rounded-t-[28px] md:rounded-[28px] p-6 m-0 md:m-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Вход в «Дело вкуса»</h2>
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setShowAuth(false)}
                className="grid place-items-center w-10 h-10 rounded-full hover:bg-black/5"
              >
                <CloseIcon />
              </button>
            </div>
            <p className="text-sm text-muted mb-5">
              Быстрый вход через социальные сервисы. Без паролей и спама.
            </p>
            <SsoButtons redirect="/" />
            <p className="mt-4 text-xs text-muted leading-relaxed">
              Нажимая «Войти», вы соглашаетесь с условиями и политикой обработки персональных
              данных.
            </p>
          </div>
        </div>
      )}

      {/* Mobile / tablet menu drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 h-full w-[85%] max-w-[360px] bg-panel p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <Image
                src="/ico/brand-mark.svg"
                alt="Дело вкуса"
                width={180}
                height={22}
                className="h-6 w-auto"
              />
              <button
                type="button"
                aria-label="Закрыть"
                onClick={() => setMenuOpen(false)}
                className="grid place-items-center w-10 h-10 rounded-full hover:bg-black/5"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 px-3 rounded-[14px] hover:bg-black/5 text-[17px] font-semibold"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-5 pt-5 border-t border-black/10">
              <h4 className="text-xs uppercase tracking-wider text-muted mb-3 px-3">Категории</h4>
              <nav className="flex flex-col gap-1">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/catalog/${category.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className="py-2.5 px-3 rounded-[12px] hover:bg-black/5 text-[15px]"
                  >
                    {category.title}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="mt-6 pt-5 border-t border-black/10 flex items-start gap-2 px-2">
              <PinIcon size={18} className="text-muted mt-0.5" />
              <div className="text-[13px] leading-snug">
                {globals.address}
                <div className="text-muted">{globals.workingHours}</div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
