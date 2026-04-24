import { Container } from "@/components/ui/container";
import { SsoButtons } from "@/components/auth/sso-buttons";

export const metadata = { title: "Профиль" };

export default function ProfilePage() {
  return (
    <Container className="pt-10 md:pt-16">
      <div className="max-w-[460px] mx-auto bg-panel rounded-[24px] p-6 md:p-8 shadow-[0_14px_40px_rgba(75,50,20,.08)]">
        <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight font-display leading-tight">
          Вход в «Дело вкуса»
        </h1>
        <p className="text-muted mt-2 mb-6">
          Быстрый вход через соцсети — без паролей и спама. Накапливайте кэшбэк и получайте
          персональные предложения.
        </p>
        <SsoButtons redirect="/profile" />
        <p className="mt-4 text-xs text-muted leading-relaxed">
          Нажимая «Войти», вы соглашаетесь с условиями и политикой обработки персональных данных.
        </p>
      </div>
    </Container>
  );
}
