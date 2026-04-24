import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function SearchIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function UserIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export function BagIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 7h15l-1.5 9h-12z" />
      <path d="M6 7 4.5 4H2" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

export function PinIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 21s-7-4.35-7-11a7 7 0 1 1 14 0c0 6.65-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function MenuIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

export function CloseIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

export function HomeIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

export function CatalogIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

export function TagIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M20.59 13.41 13.41 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

export function MailIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function PhoneIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2Z" />
    </svg>
  );
}

export function ClockIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function HeartIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

export function SparkleIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 3v6" />
      <path d="M12 15v6" />
      <path d="M3 12h6" />
      <path d="M15 12h6" />
      <path d="m5.5 5.5 4 4" />
      <path d="m14.5 14.5 4 4" />
      <path d="m18.5 5.5-4 4" />
      <path d="m9.5 14.5-4 4" />
    </svg>
  );
}

export function PickupIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 21V10l9-6 9 6v11" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

export function ChefIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 14a4 4 0 0 1-2-7.5A5 5 0 0 1 12 4a5 5 0 0 1 8 2.5A4 4 0 0 1 18 14Z" />
      <path d="M7 14v6h10v-6" />
    </svg>
  );
}

export function PlusIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function MinusIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function YandexMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#FC3F1D" />
      <path
        d="M17.8 9.4h-2.4c-2.2 0-3.6 1.6-3.6 3.8 0 2.4 1.4 3.5 3.3 3.8L11 24h3.1l4.3-7v7h2.6V9.4h-3.2Zm0 5.8h-1.2c-.9 0-1.5-.5-1.5-1.8 0-1.2.7-1.6 1.5-1.6h1.2v3.4Z"
        fill="#fff"
      />
    </svg>
  );
}

export function VkMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#0077FF" />
      <path
        d="M8 11h3c.2 0 .3.1.3.3.3 2.5 1 4.3 2.1 5.5.1.1.2 0 .2-.1V11.8c0-.5.3-.8.8-.8h1.8c.3 0 .6.3.6.6v4.7c0 .1.1.2.3.1 1.1-.8 2.1-2.5 2.8-5.2 0-.1.2-.2.3-.2h2.9c.3 0 .5.3.4.6-.6 2.3-1.5 3.9-2.5 5 0 .1-.1.2 0 .3 1.2 1.1 2.3 2.6 3 4.1.1.3-.1.5-.4.5h-2.8c-.2 0-.3-.1-.4-.2-.7-1.4-1.5-2.6-2.5-3.4-.1-.1-.3 0-.3.2v2.8c0 .4-.3.6-.6.6H14c-2.6 0-5-2.1-6-8.8 0-.4.2-.6.5-.6Z"
        fill="#fff"
      />
    </svg>
  );
}

export function MailRuMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#005FF9" />
      <path
        d="M16 9a7 7 0 1 0 6 10.5c.2-.3.6-.4.9-.1.3.3.3.7.1 1A8.5 8.5 0 1 1 24.5 15v1c0 1.5-.9 2.6-2.2 2.6-.9 0-1.8-.5-2.2-1.4a3.5 3.5 0 1 1-.4-4.7.8.8 0 0 1 1.3.6V16c0 .5.3.8.8.8s.8-.3.8-.8v-1c0-3.9-3.1-6-5.6-6Zm0 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="#fff"
      />
    </svg>
  );
}
