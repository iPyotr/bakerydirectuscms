"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { MinusIcon, PlusIcon, CloseIcon, ArrowRightIcon, BagIcon } from "@/components/ui/icon";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/stores/cart";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const totalPrice = useCart((s) => s.totalPrice());
  const clear = useCart((s) => s.clear);

  if (lines.length === 0) {
    return (
      <Container className="pt-10 md:pt-16">
        <div className="max-w-[520px] mx-auto text-center py-16">
          <div className="w-20 h-20 mx-auto grid place-items-center rounded-full bg-card mb-5">
            <BagIcon size={32} />
          </div>
          <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight font-display">
            Ваша корзина пуста
          </h1>
          <p className="text-muted mt-3 mb-8">
            Выберите что-то вкусное из каталога — соберём заказ к вашему приходу.
          </p>
          <Button size="lg" leftIcon={<BagIcon size={20} />}>
            <Link href="/catalog" className="inline-flex items-center gap-3">
              В каталог
              <ArrowRightIcon size={18} />
            </Link>
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="pt-6 md:pt-10">
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none">
          Корзина
        </h1>
        <button
          type="button"
          onClick={clear}
          className="text-sm text-muted hover:text-danger transition-colors"
        >
          Очистить
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 md:gap-8">
        <ul className="flex flex-col gap-3">
          {lines.map(({ product, quantity }) => (
            <li
              key={product.id}
              className="flex items-center gap-4 bg-white rounded-[18px] p-3 md:p-4 shadow-card"
            >
              <Link
                href={`/product/${product.slug}`}
                className="relative w-20 h-20 md:w-24 md:h-24 rounded-[14px] overflow-hidden shrink-0 bg-card"
              >
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${product.slug}`}
                  className="font-bold leading-tight line-clamp-2 hover:text-brand"
                >
                  {product.title}
                </Link>
                <div className="text-[13px] text-muted mt-1">{product.weight}</div>
                <div className="mt-2 font-extrabold tabular-nums text-[17px]">
                  {formatPrice(product.price * quantity)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center bg-card rounded-full h-10">
                  <button
                    type="button"
                    aria-label="Минус"
                    onClick={() => setQuantity(product.id, quantity - 1)}
                    className="grid place-items-center w-9 h-10"
                  >
                    <MinusIcon size={18} />
                  </button>
                  <span className="w-7 text-center font-bold tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Плюс"
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    className="grid place-items-center w-9 h-10"
                  >
                    <PlusIcon size={18} />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Удалить"
                  onClick={() => remove(product.id)}
                  className="hidden md:grid place-items-center w-10 h-10 rounded-full hover:bg-black/5 text-muted"
                >
                  <CloseIcon size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="bg-white rounded-[22px] p-5 md:p-6 shadow-card h-max sticky top-24">
          <h2 className="text-xl font-bold mb-5">Ваш заказ</h2>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted">Сумма</span>
            <span className="font-semibold tabular-nums">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted">Самовывоз</span>
            <span className="font-semibold text-success">Бесплатно</span>
          </div>
          <div className="border-t border-black/10 mt-4 pt-4 flex justify-between items-baseline">
            <span className="font-bold">Итого</span>
            <span className="text-[24px] font-extrabold tabular-nums">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <Button size="xl" className="w-full mt-6">
            Оформить заказ
            <ArrowRightIcon size={20} />
          </Button>
          <p className="text-xs text-muted mt-3">
            Нажимая «Оформить заказ», вы соглашаетесь с условиями обработки персональных данных.
          </p>
        </aside>
      </div>
    </Container>
  );
}
