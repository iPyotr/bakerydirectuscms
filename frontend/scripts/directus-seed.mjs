#!/usr/bin/env node
/**
 * Directus seed — creates collections + fields + uploads images + inserts data.
 * Idempotent: safe to run multiple times, skips what already exists.
 *
 * Usage:
 *   DIRECTUS_URL=https://delovkusa.openlabio.ru/directus \
 *   DIRECTUS_ADMIN_TOKEN=... \
 *   pnpm seed
 *
 * Or put those vars in .env.local at repo root — the package.json script
 * preloads ../.env.local automatically via node --env-file-if-exists.
 */
import {
  createDirectus,
  rest,
  staticToken,
  createCollection,
  createField,
  createRelation,
  readCollections,
  readFieldsByCollection,
  readItems,
  createItems,
  updateCollection,
  updateSingleton,
  readSingleton,
  uploadFiles,
} from "@directus/sdk";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");

const DIRECTUS_URL = process.env.DIRECTUS_URL;
// Accept multiple common names (and a known typo in case-insensitive form).
const ADMIN_TOKEN =
  process.env.DIRECTUS_ADMIN_TOKEN ||
  process.env.ADMIN_TOKEN ||
  process.env.direstus_admin_token;

if (!DIRECTUS_URL || !ADMIN_TOKEN) {
  console.error(
    "[seed] Missing env vars. Required: DIRECTUS_URL, DIRECTUS_ADMIN_TOKEN",
  );
  process.exit(1);
}

const client = createDirectus(DIRECTUS_URL).with(staticToken(ADMIN_TOKEN)).with(rest());

async function login() {
  console.log(`[seed] Using static admin token against ${DIRECTUS_URL}`);
}

// --------------------- schema helpers ---------------------
async function getExistingCollections() {
  const collections = await client.request(readCollections());
  return new Set(collections.map((c) => c.collection));
}

async function getExistingFieldsFor(collection) {
  try {
    const fields = await client.request(readFieldsByCollection(collection));
    return new Set(fields.map((f) => f.field));
  } catch {
    return new Set();
  }
}

async function ensureCollection(definition, initialFields = []) {
  const existing = await getExistingCollections();
  if (existing.has(definition.collection)) {
    console.log(`[seed] collection ${definition.collection} exists, skipping create`);
    // Add any missing fields (for incremental schema changes).
    for (const f of initialFields) await ensureField(definition.collection, f);
    return;
  }
  // Create with full field set in a single POST — guarantees a UUID primary
  // key and correct field order.
  await client.request(
    createCollection({ ...definition, fields: initialFields }),
  );
  console.log(
    `[seed] ✓ created collection ${definition.collection} (${initialFields.length} fields)`,
  );
}

async function ensureField(collection, definition) {
  const existing = await getExistingFieldsFor(collection);
  if (existing.has(definition.field)) return;
  await client.request(createField(collection, definition));
  console.log(`[seed]   + field ${collection}.${definition.field}`);
}

// --------------------- schema definitions ---------------------
// Don't put sort_field / archive_field in initial meta — Directus would
// auto-create stub fields without our custom interface settings. We set them
// via updateCollection AFTER the real status/sort fields are in place.
const categoriesCollection = {
  collection: "categories",
  meta: { icon: "category", note: "Категории товаров" },
  schema: { name: "categories" },
};

const productsCollection = {
  collection: "products",
  meta: { icon: "bakery_dining", note: "Товары" },
  schema: { name: "products" },
};

const globalsCollection = {
  collection: "globals",
  meta: {
    icon: "business",
    note: "Глобальные настройки предприятия",
    singleton: true,
  },
  schema: { name: "globals" },
};

// UUID primary key — per AGENTS.md "UUID в качестве первичных ключей".
const idField = {
  field: "id",
  type: "uuid",
  meta: {
    hidden: true,
    readonly: true,
    interface: "input",
    special: ["uuid"],
  },
  schema: {
    is_primary_key: true,
    has_auto_increment: false,
    length: 36,
  },
};

const statusField = {
  field: "status",
  type: "string",
  meta: {
    width: "full",
    options: {
      choices: [
        { text: "Опубликовано", value: "published" },
        { text: "Черновик", value: "draft" },
        { text: "В архиве", value: "archived" },
      ],
    },
    interface: "select-dropdown",
    display: "labels",
    display_options: {
      showAsDot: true,
      choices: [
        { text: "Опубликовано", value: "published", foreground: "#FFFFFF", background: "#00C897" },
        { text: "Черновик", value: "draft", foreground: "#18222F", background: "#D3DAE4" },
        { text: "В архиве", value: "archived", foreground: "#FFFFFF", background: "#F7971C" },
      ],
    },
  },
  schema: { default_value: "draft", is_nullable: false },
};

const sortField = {
  field: "sort",
  type: "integer",
  meta: { width: "half", hidden: true, interface: "input", readonly: false },
  schema: {},
};

const categoryFields = [
  statusField,
  sortField,
  {
    field: "slug",
    type: "string",
    meta: { interface: "input", required: true, width: "half", note: "URL-идентификатор (bread, savory-pastry …)" },
    schema: { is_nullable: false, is_unique: true },
  },
  {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, width: "half", note: "Название категории" },
    schema: { is_nullable: false },
  },
  {
    field: "subtitle",
    type: "string",
    meta: { interface: "input", width: "full", note: "Подзаголовок" },
    schema: {},
  },
  {
    field: "image",
    type: "uuid",
    meta: {
      interface: "file-image",
      special: ["file"],
      width: "half",
      note: "Круглое фото для плитки",
    },
    schema: {},
  },
  {
    field: "slider_image",
    type: "uuid",
    meta: {
      interface: "file-image",
      special: ["file"],
      width: "half",
      note: "Широкое фото для слайдера",
    },
    schema: {},
  },
  {
    field: "products_count",
    type: "integer",
    meta: {
      interface: "input",
      width: "half",
      note: "Счётчик (для отображения в UI)",
      special: [],
    },
    schema: { default_value: 0 },
  },
];

const productFields = [
  statusField,
  sortField,
  {
    field: "slug",
    type: "string",
    meta: { interface: "input", required: true, width: "half" },
    schema: { is_nullable: false, is_unique: true },
  },
  {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, width: "half" },
    schema: { is_nullable: false },
  },
  {
    field: "category",
    type: "uuid",
    meta: {
      interface: "select-dropdown-m2o",
      special: ["m2o"],
      width: "half",
      options: { template: "{{title}}" },
    },
    schema: {},
  },
  {
    field: "price",
    type: "integer",
    meta: { interface: "input", width: "half", note: "₽" },
    schema: { default_value: 0, is_nullable: false },
  },
  {
    field: "old_price",
    type: "integer",
    meta: { interface: "input", width: "half", note: "Старая цена (для скидок)" },
    schema: {},
  },
  {
    field: "weight",
    type: "string",
    meta: { interface: "input", width: "half", note: "Например: 450 г" },
    schema: {},
  },
  {
    field: "tag",
    type: "string",
    meta: {
      interface: "select-dropdown",
      width: "half",
      options: {
        choices: [
          { text: "Хит", value: "hit" },
          { text: "Новинка", value: "new" },
          { text: "Скидка", value: "sale" },
          { text: "Веган", value: "veg" },
        ],
        allowNone: true,
      },
    },
    schema: {},
  },
  {
    field: "available",
    type: "boolean",
    meta: { interface: "boolean", width: "half", special: ["cast-boolean"] },
    schema: { default_value: true },
  },
  {
    field: "image",
    type: "uuid",
    meta: { interface: "file-image", special: ["file"], width: "half" },
    schema: {},
  },
  {
    field: "description",
    type: "text",
    meta: { interface: "input-multiline", width: "full" },
    schema: {},
  },
];

const globalsFields = [
  {
    field: "brand_name",
    type: "string",
    meta: { interface: "input", required: true, width: "half", note: "Название бренда" },
    schema: { is_nullable: false },
  },
  {
    field: "legal_name",
    type: "string",
    meta: { interface: "input", width: "half", note: "Юридическое название" },
    schema: {},
  },
  {
    field: "inn",
    type: "string",
    meta: { interface: "input", width: "half" },
    schema: {},
  },
  {
    field: "phone",
    type: "string",
    meta: { interface: "input", required: true, width: "half" },
    schema: { is_nullable: false },
  },
  {
    field: "email",
    type: "string",
    meta: { interface: "input", width: "half" },
    schema: {},
  },
  {
    field: "address",
    type: "string",
    meta: { interface: "input", width: "full", required: true },
    schema: { is_nullable: false },
  },
  {
    field: "address_short",
    type: "string",
    meta: { interface: "input", width: "half", note: "Короткая версия (для меню)" },
    schema: {},
  },
  {
    field: "working_hours",
    type: "string",
    meta: { interface: "input", width: "half" },
    schema: {},
  },
  {
    field: "about_short",
    type: "text",
    meta: { interface: "input-multiline", width: "full", note: "2-3 предложения для footer / SEO" },
    schema: {},
  },
  {
    field: "about_long",
    type: "text",
    meta: { interface: "input-rich-text-md", width: "full", note: "Полное описание для страницы «О компании»" },
    schema: {},
  },
  {
    field: "location",
    type: "json",
    meta: {
      interface: "input-code",
      width: "full",
      options: { language: "json" },
      note: 'Геокоординаты: {"lat":46.634,"lng":142.782,"zoom":16}',
    },
    schema: {},
  },
  {
    field: "social",
    type: "json",
    meta: {
      interface: "input-code",
      width: "full",
      options: { language: "json" },
      note: 'Ссылки: {"vk":"…","telegram":"…","instagram":"…"}',
    },
    schema: {},
  },
  {
    field: "app_links",
    type: "json",
    meta: {
      interface: "input-code",
      width: "full",
      options: { language: "json" },
      note: 'Мобильные приложения: {"appStore":"…","googlePlay":"…","ruStore":"…"}',
    },
    schema: {},
  },
];

// --------------------- seed data ---------------------
const categoriesData = [
  { slug: "bread", title: "Хлеб", subtitle: "Ремесленный каждый день", products_count: 1, sort: 1 },
  { slug: "savory-pastry", title: "Сытная выпечка", subtitle: "Пирожки, чебуреки, беляши", products_count: 8, sort: 2 },
  { slug: "sweet-pastry", title: "Сладкая выпечка", subtitle: "Сдоба с маком и творогом", products_count: 6, sort: 3 },
  { slug: "ready-meals", title: "Готовые блюда", subtitle: "Гриль, шаурма, обеды", products_count: 2, sort: 4 },
  { slug: "frozen", title: "Полуфабрикаты", subtitle: "Ручная лепка", products_count: 5, sort: 5 },
  { slug: "drinks", title: "Напитки", subtitle: "Соки, лимонады, чай", products_count: 1, sort: 6 },
];

const productsData = [
  { slug: "bread-loaf", title: "Хлеб «Домашний»", category: "bread", image: "bread-loaf", price: 65, weight: "450 г", tag: "hit", available: true, description: "Формовой хлеб на пшеничной муке первого сорта, без улучшителей и консервантов." },
  { slug: "echpochmak", title: "Эчпочмак (Самса)", category: "savory-pastry", image: "echpochmak", price: 75, weight: "120 г", available: true, description: "Треугольник с мясом и картофелем, запечённый в слоёном тесте." },
  { slug: "mini-pizza", title: "Мини-пицца «Школьная»", category: "savory-pastry", image: "mini-pizza", price: 95, weight: "120 г", available: true, description: "Любимая школьная пицца: томатный соус, колбаса, сыр." },
  { slug: "cheburek", title: "Чебурек с говядиной", category: "savory-pastry", image: "cheburek", price: 110, weight: "150 г", tag: "hit", available: true, description: "Тонкое тесто, сочная начинка из рубленой говядины с луком." },
  { slug: "belyash", title: "Беляш с мясом", category: "savory-pastry", image: "belyash", price: 85, weight: "130 г", available: true, description: "Жаренный во фритюре беляш с рубленой говядиной." },
  { slug: "big-closed-pie", title: "Большой закрытый пирог", category: "savory-pastry", image: "big-closed-pie", price: 520, weight: "900 г", available: true, description: "Большой семейный пирог с начинкой на выбор." },
  { slug: "fried-flatbread", title: "Жареная лепёшка", category: "savory-pastry", image: "fried-flatbread", price: 60, weight: "110 г", available: true },
  { slug: "savory-pies", title: "Пирожки несладкие", category: "savory-pastry", image: "savory-pies", price: 55, weight: "90 г", available: true, description: "Пирожки ассорти: картошка, капуста, яйцо с луком." },
  { slug: "tvorog-triangle", title: "Треугольный пирожок с творогом", category: "savory-pastry", image: "tvorog-triangle", price: 70, weight: "100 г", available: true, description: "Открытый треугольник с нежным творогом и сметанной заливкой." },
  { slug: "poppy-buns", title: "Сдобный узел с маком", category: "sweet-pastry", image: "poppy-buns", price: 55, weight: "120 г", tag: "new", available: true, description: "Мягкая сдоба с маковой начинкой, посыпанная сахарной пудрой." },
  { slug: "vatrushka", title: "Ватрушка с творогом", category: "sweet-pastry", image: "vatrushka", price: 70, weight: "100 г", available: true, description: "Сдоба с ванильным творогом и сахарной пудрой." },
  { slug: "poppy-roll", title: "Рулет с маком", category: "sweet-pastry", image: "poppy-roll", price: 140, weight: "300 г", available: true, description: "Сдобный рулет с маковой начинкой." },
  { slug: "figured-buns", title: "Фигурные булочки", category: "sweet-pastry", image: "figured-buns", price: 45, weight: "80 г", available: true, description: "Сдобные булочки-косички с ванилью." },
  { slug: "sweet-pie", title: "Сладкий пирожок", category: "sweet-pastry", image: "sweet-pie", price: 50, weight: "90 г", available: true, description: "Пирожок с яблочной или вишнёвой начинкой, сахарная пудра." },
  { slug: "plain-bun", title: "Булочка без начинки", category: "sweet-pastry", image: "plain-bun", price: 35, weight: "70 г", available: true, description: "Классическая сдобная булочка к чаю." },
  { slug: "grill-chicken", title: "Курица гриль", category: "ready-meals", image: "grill-chicken", price: 450, weight: "1.2 кг", tag: "hit", available: true, description: "Фермерская курица в фирменном маринаде. Подаётся горячей." },
  { slug: "shaurma", title: "Шаурма «Классик»", category: "ready-meals", image: "shaurma", price: 220, weight: "320 г", available: true, description: "Лаваш, курица гриль, овощи, фирменный соус." },
  { slug: "frozen-pelmeni", title: "Пельмени ручной лепки", category: "frozen", image: "frozen-pelmeni", price: 320, weight: "500 г", available: true, description: "Классические пельмени, начинка — свинина с говядиной. Ручная лепка." },
  { slug: "frozen-vareniki", title: "Вареники с вишней", category: "frozen", image: "frozen-vareniki", price: 280, weight: "500 г", tag: "new", available: true, description: "Сладкие вареники с вишневой начинкой без сахара." },
  { slug: "frozen-pies", title: "Замороженные пирожки", category: "frozen", image: "frozen-pies", price: 220, weight: "400 г", available: true, description: "Полуфабрикаты для выпечки дома: картофель, капуста, мясо." },
  { slug: "frozen-buns", title: "Замороженные булочки", category: "frozen", image: "frozen-buns", price: 180, weight: "360 г", available: true, description: "Сдоба в заморозке: дома осталось только разогреть." },
  { slug: "dough-balls", title: "Заготовки теста", category: "frozen", image: "dough-balls", price: 140, weight: "500 г", available: true, description: "Шарики дрожжевого теста на любой выпечки." },
  { slug: "drinks-set", title: "Лимонад «Тархун»", category: "drinks", image: "drinks", price: 120, weight: "0.5 л", available: true, description: "Натуральный лимонад без красителей." },
];

const globalsData = {
  brand_name: "Дело вкуса",
  legal_name: "ООО «Дело вкуса»",
  inn: "1650000000",
  phone: "+7 (843) 555-01-20",
  email: "hello@delovkusa.ru",
  address: "г. Казань, ул. Гвардейская, 54",
  address_short: "Казань, Гвардейская 54",
  working_hours: "Ежедневно 08:00 – 20:00",
  about_short:
    "Пекарня, кулинария и собственное производство в Казани. Свежая выпечка каждое утро, домашняя кухня и полуфабрикаты ручной лепки.",
  about_long:
    "«Дело вкуса» — мультиформатная гастрономическая платформа, объединяющая три направления: ремесленную пекарню и кондитерскую, горячую кулинарию (курица гриль, шаурма, готовые обеды) и собственное производство замороженных полуфабрикатов. Мы печём хлеб на собственной закваске, делаем сытную и сладкую выпечку по проверенным рецептам, готовим горячие блюда и лепим пельмени, вареники и манты вручную.",
  location: { lat: 46.634980, lng: 142.782579, zoom: 16 },
  social: {
    vk: "https://vk.com/delovkusa",
    telegram: "https://t.me/delovkusa",
    instagram: "https://instagram.com/delovkusa",
  },
  app_links: { appStore: "#", googlePlay: "#", ruStore: "#" },
};

// --------------------- file upload helper ---------------------
async function uploadIfMissing(localPath, folderLabel, mime = "image/webp") {
  if (!existsSync(localPath)) {
    console.warn(`[seed]   ! file not found: ${localPath}`);
    return null;
  }
  const filename = basename(localPath);
  // Check if already uploaded (by filename_download).
  try {
    const existing = await client.request(
      readItems("directus_files", {
        filter: { filename_download: { _eq: filename } },
        limit: 1,
        fields: ["id"],
      }),
    );
    if (existing.length > 0) return existing[0].id;
  } catch {
    // ignore — fall through to upload
  }
  const data = await readFile(localPath);
  const form = new FormData();
  const dotIdx = filename.lastIndexOf(".");
  const titleBase = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
  form.append("title", titleBase);
  // Do NOT append an empty "folder" string — Directus treats "" as invalid UUID.
  form.append(
    "file",
    new Blob([data], { type: mime }),
    filename,
  );
  const res = await client.request(uploadFiles(form));
  console.log(`[seed]     ↑ uploaded ${folderLabel}/${filename}`);
  return Array.isArray(res) ? res[0]?.id : res.id;
}

// --------------------- main ---------------------
async function main() {
  await login();

  // 1) Schema
  console.log("\n[seed] ==== SCHEMA ====");
  await ensureCollection(categoriesCollection, [idField, ...categoryFields]);
  await ensureCollection(productsCollection, [idField, ...productFields]);
  // globals is a singleton — Directus expects a regular auto-increment id,
  // no uuid needed.
  await ensureCollection(globalsCollection, globalsFields);

  // Wire sort/archive meta AFTER the fields exist so Directus doesn't try
  // to auto-create stub columns at collection-create time.
  for (const col of ["categories", "products"]) {
    try {
      await client.request(
        updateCollection(col, {
          meta: {
            sort_field: "sort",
            archive_field: "status",
            archive_value: "archived",
            unarchive_value: "published",
          },
        }),
      );
      console.log(`[seed]   set sort_field + archive_field on ${col}`);
    } catch (e) {
      console.warn(`[seed] could not update meta for ${col}:`, e?.errors?.[0]?.message ?? e);
    }
  }

  // Relation products.category -> categories.id
  try {
    await client.request(
      createRelation({
        collection: "products",
        field: "category",
        related_collection: "categories",
      }),
    );
    console.log("[seed] ✓ relation products.category → categories");
  } catch (e) {
    console.log("[seed] relation products.category exists, skipping");
  }

  // 2) Upload images
  console.log("\n[seed] ==== FILES ====");

  // Brand/logos (SVG + OG PNG-preview)
  const logos = [
    { path: "public/ico/brand-mark.svg", mime: "image/svg+xml" },
    { path: "public/ico/logo.svg", mime: "image/svg+xml" },
    { path: "public/ico/logo-exact.svg", mime: "image/svg+xml" },
    { path: "public/ico/logo-preview.png", mime: "image/png" },
  ];
  for (const l of logos) {
    const p = resolve(root, l.path);
    if (existsSync(p)) await uploadIfMissing(p, "logos", l.mime);
  }

  const categoryImageIds = {}; // slug -> { image, slider_image }
  for (const c of categoriesData) {
    categoryImageIds[c.slug] = {};
    const img = resolve(root, "public/categories", `${c.slug}.webp`);
    categoryImageIds[c.slug].image = await uploadIfMissing(img, "categories");
    const slider = resolve(root, "public/sliders", `${c.slug}.webp`);
    if (existsSync(slider)) {
      categoryImageIds[c.slug].slider_image = await uploadIfMissing(slider, "sliders");
    }
  }

  const productImageIds = {};
  for (const p of productsData) {
    const img = resolve(root, "public/products", `${p.image}.webp`);
    productImageIds[p.slug] = await uploadIfMissing(img, "products");
  }

  // 3) Categories
  console.log("\n[seed] ==== CATEGORIES ====");
  const existingCats = await client.request(
    readItems("categories", { fields: ["id", "slug"], limit: -1 }),
  );
  const catBySlug = new Map(existingCats.map((c) => [c.slug, c]));

  const newCats = categoriesData
    .filter((c) => !catBySlug.has(c.slug))
    .map((c) => ({
      ...c,
      status: "published",
      image: categoryImageIds[c.slug]?.image ?? null,
      slider_image: categoryImageIds[c.slug]?.slider_image ?? null,
    }));

  if (newCats.length) {
    const created = await client.request(createItems("categories", newCats));
    for (const c of created) catBySlug.set(c.slug, c);
    console.log(`[seed] ✓ inserted ${created.length} categories`);
  } else {
    console.log("[seed] categories already populated, skipping");
  }

  // 4) Products
  console.log("\n[seed] ==== PRODUCTS ====");
  const existingProducts = await client.request(
    readItems("products", { fields: ["slug"], limit: -1 }),
  );
  const existingProductSlugs = new Set(existingProducts.map((p) => p.slug));

  const newProducts = productsData
    .filter((p) => !existingProductSlugs.has(p.slug))
    .map((p, idx) => ({
      slug: p.slug,
      title: p.title,
      category: catBySlug.get(p.category)?.id ?? null,
      price: p.price,
      weight: p.weight,
      tag: p.tag ?? null,
      available: p.available,
      description: p.description ?? null,
      image: productImageIds[p.slug] ?? null,
      status: "published",
      sort: idx + 1,
    }));

  if (newProducts.length) {
    const created = await client.request(createItems("products", newProducts));
    console.log(`[seed] ✓ inserted ${created.length} products`);
  } else {
    console.log("[seed] products already populated, skipping");
  }

  // 5) Globals (singleton)
  console.log("\n[seed] ==== GLOBALS ====");
  try {
    const existing = await client.request(readSingleton("globals"));
    if (existing?.brand_name) {
      console.log("[seed] globals already populated, skipping");
    } else {
      throw new Error("empty singleton");
    }
  } catch {
    await client.request(updateSingleton("globals", globalsData));
    console.log("[seed] ✓ globals populated");
  }

  console.log("\n[seed] DONE ✨");
}

main().catch((err) => {
  console.error("[seed] ERROR:", err?.errors ?? err);
  process.exit(1);
});
