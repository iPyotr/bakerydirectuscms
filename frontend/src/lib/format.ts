const priceFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});

export function formatPrice(value: number): string {
  return `${priceFormatter.format(value)} ₽`;
}

export function formatCount(value: number, forms: [string, string, string]): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${value} ${forms[2]}`;
  if (mod10 === 1) return `${value} ${forms[0]}`;
  if (mod10 >= 2 && mod10 <= 4) return `${value} ${forms[1]}`;
  return `${value} ${forms[2]}`;
}

export const productsCount = (n: number) => formatCount(n, ["товар", "товара", "товаров"]);
