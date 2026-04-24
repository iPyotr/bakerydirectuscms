"use client";

import { MailRuMark, VkMark, YandexMark } from "@/components/ui/icon";

const providers = [
  {
    id: "yandex",
    label: "Войти через Яндекс",
    mark: <YandexMark />,
    bg: "bg-[#fc3f1d] text-white hover:bg-[#e53815]",
  },
  {
    id: "vk",
    label: "Войти через VK ID",
    mark: <VkMark />,
    bg: "bg-[#0077ff] text-white hover:bg-[#0062d1]",
  },
  {
    id: "mailru",
    label: "Войти через Mail.ru",
    mark: <MailRuMark />,
    bg: "bg-[#005ff9] text-white hover:bg-[#0051d6]",
  },
];

export function SsoButtons({ redirect = "/" }: { redirect?: string }) {
  const handleLogin = (providerId: string) => {
    window.location.href = `/api/auth/login/${providerId}?redirect=${encodeURIComponent(redirect)}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleLogin(p.id)}
          className={`h-12 rounded-[16px] px-5 inline-flex items-center justify-center gap-3 font-semibold text-[15px] transition-colors ${p.bg}`}
        >
          {p.mark}
          {p.label}
        </button>
      ))}
    </div>
  );
}
