import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-gold-ink hover:bg-gold-dark shadow-[0_10px_18px_rgba(239,194,83,.28)]",
  secondary: "bg-white text-ink hover:bg-stage",
  ghost: "bg-transparent text-ink hover:bg-black/5",
  outline: "bg-transparent text-ink border border-black/15 hover:bg-black/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-[14px]",
  md: "h-11 px-5 text-sm rounded-[16px]",
  lg: "h-13 px-7 text-[15px] rounded-[18px]",
  xl: "h-16 px-8 text-base rounded-[20px]",
};

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-3 font-extrabold leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
