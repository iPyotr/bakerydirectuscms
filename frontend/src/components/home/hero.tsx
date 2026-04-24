"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ArrowRightIcon } from "@/components/ui/icon";
import type { HeroSlide } from "@/types";

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6500);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <section className="relative overflow-hidden rounded-[24px] md:rounded-[28px] min-h-[380px] md:min-h-[460px] bg-[#22170f]">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            priority={i === 0}
            sizes="(max-width: 768px) 100vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/10 md:from-black/85 md:via-black/50 md:to-transparent" />
        </div>
      ))}

      <div className="relative z-10 px-6 py-14 md:px-16 md:py-20 max-w-[640px] text-white">
        <h1 className="text-[34px] md:text-[64px] leading-[0.98] font-bold tracking-tight font-display">
          {slides[index].title}
          <span className="block mt-2 md:mt-3 italic font-medium text-gold font-script text-[36px] md:text-[70px] tracking-wide">
            {slides[index].accent}
          </span>
        </h1>
        <p className="mt-5 md:mt-7 text-[14px] md:text-[20px] leading-relaxed max-w-[480px] text-white/90">
          {slides[index].description}
        </p>
        <Link
          href={slides[index].cta.href}
          className="mt-7 md:mt-9 inline-flex items-center gap-3 h-12 md:h-16 px-6 md:px-8 rounded-[18px] md:rounded-[20px] bg-gold hover:bg-gold-dark text-gold-ink font-extrabold text-[14px] md:text-[16px] shadow-[0_10px_18px_rgba(239,194,83,.35)] transition-colors"
        >
          {slides[index].cta.label}
          <ArrowRightIcon size={20} />
        </Link>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 bottom-5 md:bottom-7 z-10 flex gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Слайд ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-2.5 rounded-full transition-all border border-white/30",
              i === index ? "w-8 bg-white" : "w-2.5 bg-white/25",
            )}
          />
        ))}
      </div>
    </section>
  );
}
