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
  createFlow,
  createOperation,
  createPermission,
  createPolicy,
  createRelation,
  createRole,
  deleteFlow,
  deletePermission,
  readCollections,
  readFieldsByCollection,
  readFlows,
  readItems,
  readPermissions,
  readPolicies,
  readRoles,
  createItems,
  updateCollection,
  updateFlow,
  updateItem,
  updatePermission,
  updatePolicy,
  updateRole,
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

// Source of truth for "popular products" home block. NULL = excluded.
const POPULARITY_RANKS = {
  "bread-loaf": 1,
  "echpochmak": 2,
  "poppy-buns": 3,
  "frozen-pelmeni": 4,
  "mini-pizza": 5,
};

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cache of existing fields by collection, populated once per collection.
const fieldCache = new Map();

async function ensureField(collection, definition) {
  let existing = fieldCache.get(collection);
  if (!existing) {
    existing = await getExistingFieldsFor(collection);
    fieldCache.set(collection, existing);
  }
  if (existing.has(definition.field)) return;
  await client.request(createField(collection, definition));
  existing.add(definition.field);
  console.log(`[seed]   + field ${collection}.${definition.field}`);
  // Respect Directus rate limit (100 req/s default; retry window ~250ms).
  await sleep(250);
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
    field: "popularity_rank",
    type: "integer",
    meta: { interface: "input", width: "half", note: "Чем меньше — тем выше в «Популярном». NULL = не показывать" },
    schema: {},
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
  // ----- NEW: SEO + slogans -----
  {
    field: "tagline_main",
    type: "string",
    meta: { interface: "input", width: "half", note: "Главный слоган (используется в OG, заголовках)" },
    schema: {},
  },
  {
    field: "tagline_accent",
    type: "string",
    meta: { interface: "input", width: "half", note: "Акцентная часть слогана (italic в OG)" },
    schema: {},
  },
  {
    field: "meta_title",
    type: "string",
    meta: { interface: "input", width: "full", note: "Default <title> сайта" },
    schema: {},
  },
  {
    field: "meta_description",
    type: "text",
    meta: { interface: "input-multiline", width: "full", note: "Default meta description (до 160)" },
    schema: {},
  },
  {
    field: "seo_keywords",
    type: "json",
    meta: { interface: "tags", width: "full", note: "SEO keywords" },
    schema: {},
  },
  {
    field: "theme_color",
    type: "string",
    meta: { interface: "select-color", width: "half", note: "manifest theme_color" },
    schema: { default_value: "#d62929" },
  },
  {
    field: "background_color",
    type: "string",
    meta: { interface: "select-color", width: "half", note: "manifest background_color" },
    schema: { default_value: "#eae6e1" },
  },
  {
    field: "payment_methods",
    type: "json",
    meta: { interface: "tags", width: "full", note: "МИР, Visa, Mastercard, СБП, ..." },
    schema: {},
  },
  {
    field: "opens_at",
    type: "string",
    meta: { interface: "input", width: "half", note: "Время открытия HH:MM (для JSON-LD)" },
    schema: { default_value: "08:00" },
  },
  {
    field: "closes_at",
    type: "string",
    meta: { interface: "input", width: "half", note: "Время закрытия HH:MM" },
    schema: { default_value: "20:00" },
  },
  // ----- NEW: contact roles -----
  {
    field: "email_general",
    type: "string",
    meta: { interface: "input", width: "half", note: "Общий email (заменит legacy email)" },
    schema: {},
  },
  {
    field: "email_hr",
    type: "string",
    meta: { interface: "input", width: "half", note: "HR / вакансии" },
    schema: {},
  },
  {
    field: "email_b2b",
    type: "string",
    meta: { interface: "input", width: "half", note: "B2B / опт" },
    schema: {},
  },
  // ----- NEW: about-page sections -----
  {
    field: "production_md",
    type: "text",
    meta: { interface: "input-rich-text-md", width: "full", note: "Секция «Производство» на /about" },
    schema: {},
  },
  {
    field: "careers_md",
    type: "text",
    meta: { interface: "input-rich-text-md", width: "full", note: "Секция «Вакансии» на /about" },
    schema: {},
  },
];

// --------------------- seed data ---------------------
const categoriesData = [
  { slug: "bread", title: "Хлеб", subtitle: "Ремесленный каждый день", sort: 1 },
  { slug: "savory-pastry", title: "Сытная выпечка", subtitle: "Пирожки, чебуреки, беляши", sort: 2 },
  { slug: "sweet-pastry", title: "Сладкая выпечка", subtitle: "Сдоба с маком и творогом", sort: 3 },
  { slug: "ready-meals", title: "Готовые блюда", subtitle: "Гриль, шаурма, обеды", sort: 4 },
  { slug: "frozen", title: "Полуфабрикаты", subtitle: "Ручная лепка", sort: 5 },
  { slug: "drinks", title: "Напитки", subtitle: "Соки, лимонады, чай", sort: 6 },
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
  { slug: "drinks-set", title: "Лимонад «Тархун»", category: "drinks", image: "drinks-set", price: 120, weight: "0.5 л", available: true, description: "Натуральный лимонад без красителей." },
];

const globalsData = {
  brand_name: "Дело вкуса",
  legal_name: "ООО «Дело вкуса»",
  inn: "1650000000",
  about_short:
    "Пекарня, кулинария и собственное производство в Казани. Свежая выпечка каждое утро, домашняя кухня и полуфабрикаты ручной лепки.",
  about_long:
    "«Дело вкуса» — мультиформатная гастрономическая платформа, объединяющая три направления: ремесленную пекарню и кондитерскую, горячую кулинарию (курица гриль, шаурма, готовые обеды) и собственное производство замороженных полуфабрикатов. Мы печём хлеб на собственной закваске, делаем сытную и сладкую выпечку по проверенным рецептам, готовим горячие блюда и лепим пельмени, вареники и манты вручную.",
  social: {
    vk: "https://vk.com/delovkusa",
    telegram: "https://t.me/delovkusa",
    instagram: "https://instagram.com/delovkusa",
  },
  app_links: { appStore: "#", googlePlay: "#", ruStore: "#" },
  tagline_main: "Свежая выпечка",
  tagline_accent: "каждый день",
  meta_title: "Дело вкуса — свежая выпечка каждый день",
  meta_description:
    "Ремесленная пекарня и собственное производство в Корсакове: хлеб, сытная и сладкая выпечка, курица гриль, шаурма и полуфабрикаты ручной лепки.",
  seo_keywords: [
    "пекарня корсаков",
    "свежая выпечка",
    "хлеб корсаков",
    "курица гриль",
    "шаурма корсаков",
    "пельмени ручной лепки",
    "самовывоз выпечка",
    "дело вкуса",
  ],
  theme_color: "#d62929",
  background_color: "#eae6e1",
  payment_methods: ["МИР", "Visa", "Mastercard", "СБП"],
  opens_at: "08:00",
  closes_at: "20:00",
  email_general: "hello@delovkusa.ru",
  email_hr: "hr@delovkusa.ru",
  email_b2b: "b2b@delovkusa.ru",
  production_md:
    "Ежедневная пекарня работает с 04:00, лепка полуфабрикатов — круглосуточно. Всё оборудование сертифицировано, процессы проходят ежедневный контроль качества.",
  careers_md:
    "Мы всегда рады талантливым пекарям, кондитерам и продавцам. Пишите нам — расскажем об открытых позициях.",
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

// --------------------- NEW COLLECTIONS: hero_slides, promotions, locations, orders, order_items ---------------------

const heroSlidesCollection = {
  collection: "hero_slides",
  meta: { icon: "slideshow", note: "Слайды на главной странице", collection: "hero_slides" },
  schema: { name: "hero_slides" },
};
const heroSlideFields = [
  statusField,
  sortField,
  {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, width: "half", note: "Основной заголовок" },
    schema: { is_nullable: false },
  },
  {
    field: "accent",
    type: "string",
    meta: { interface: "input", width: "half", note: "Акцент (выделяется другим цветом)" },
    schema: {},
  },
  {
    field: "description",
    type: "text",
    meta: { interface: "input-multiline", width: "full" },
    schema: {},
  },
  {
    field: "image",
    type: "uuid",
    meta: { interface: "file-image", special: ["file"], width: "half" },
    schema: {},
  },
  {
    field: "cta_label",
    type: "string",
    meta: { interface: "input", width: "half", note: "Текст кнопки" },
    schema: {},
  },
  {
    field: "cta_href",
    type: "string",
    meta: { interface: "input", width: "half", note: "URL кнопки (относительный: /catalog/bread)" },
    schema: {},
  },
  {
    field: "active_from",
    type: "timestamp",
    meta: { interface: "datetime", width: "half" },
    schema: {},
  },
  {
    field: "active_until",
    type: "timestamp",
    meta: { interface: "datetime", width: "half" },
    schema: {},
  },
];

const promotionsCollection = {
  collection: "promotions",
  meta: { icon: "local_offer", note: "Акции и спецпредложения", collection: "promotions" },
  schema: { name: "promotions" },
};
const promotionFields = [
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
        ],
      },
    },
    schema: {},
  },
  {
    field: "description",
    type: "text",
    meta: { interface: "input-rich-text-md", width: "full" },
    schema: {},
  },
  {
    field: "image",
    type: "uuid",
    meta: { interface: "file-image", special: ["file"], width: "half" },
    schema: {},
  },
  {
    field: "discount_percent",
    type: "integer",
    meta: { interface: "input", width: "half", note: "Процент скидки (опционально)" },
    schema: {},
  },
  {
    field: "active_from",
    type: "timestamp",
    meta: { interface: "datetime", width: "half" },
    schema: {},
  },
  {
    field: "active_until",
    type: "timestamp",
    meta: { interface: "datetime", width: "half" },
    schema: {},
  },
];

const locationsCollection = {
  collection: "locations",
  meta: { icon: "store", note: "Точки продаж", collection: "locations" },
  schema: { name: "locations" },
};
const locationFields = [
  statusField,
  sortField,
  {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, width: "half" },
    schema: { is_nullable: false },
  },
  {
    field: "address",
    type: "string",
    meta: { interface: "input", required: true, width: "full" },
    schema: { is_nullable: false },
  },
  {
    field: "phone",
    type: "string",
    meta: { interface: "input", width: "half" },
    schema: {},
  },
  {
    field: "working_hours",
    type: "string",
    meta: { interface: "input", width: "half" },
    schema: {},
  },
  {
    field: "image",
    type: "uuid",
    meta: { interface: "file-image", special: ["file"], width: "half" },
    schema: {},
  },
  {
    field: "location",
    type: "json",
    meta: {
      interface: "input-code",
      width: "full",
      options: { language: "json" },
      note: '{"lat":46.634,"lng":142.782,"zoom":16}',
    },
    schema: {},
  },
];

const navMenuItemsCollection = {
  collection: "nav_menu_items",
  meta: { icon: "menu", note: "Пункты меню (header/footer/mobile)", collection: "nav_menu_items" },
  schema: { name: "nav_menu_items" },
};
const navMenuLocations = [
  { text: "Header (десктоп + мобильное меню)", value: "header" },
  { text: "Footer — Покупателям", value: "footer-customers" },
  { text: "Footer — Компания", value: "footer-company" },
  { text: "Mobile tab bar", value: "mobile-tab" },
];
const navMenuIcons = [
  { text: "Главная", value: "home" },
  { text: "Каталог", value: "catalog" },
  { text: "Корзина", value: "cart" },
  { text: "Акции", value: "promo" },
  { text: "Профиль", value: "profile" },
  { text: "(нет)", value: "none" },
];
const navMenuFields = [
  statusField,
  sortField,
  {
    field: "location",
    type: "string",
    meta: {
      interface: "select-dropdown", required: true, width: "half",
      options: { choices: navMenuLocations },
    },
    schema: { is_nullable: false },
  },
  {
    field: "label",
    type: "string",
    meta: { interface: "input", required: true, width: "half" },
    schema: { is_nullable: false },
  },
  {
    field: "href",
    type: "string",
    meta: { interface: "input", required: true, width: "half", note: "Внутренняя или внешняя ссылка" },
    schema: { is_nullable: false },
  },
  {
    field: "icon",
    type: "string",
    meta: {
      interface: "select-dropdown", width: "half",
      options: { choices: navMenuIcons, allowNone: true },
      note: "Только для location='mobile-tab'",
    },
    schema: { default_value: "none" },
  },
];

const benefitsCollection = {
  collection: "benefits",
  meta: { icon: "star", note: "Преимущества на главной", collection: "benefits" },
  schema: { name: "benefits" },
};
const benefitIcons = [
  { text: "Sparkle (звёздочки)", value: "sparkle" },
  { text: "Chef (повар)", value: "chef" },
  { text: "Heart (сердце)", value: "heart" },
  { text: "Pickup (самовывоз)", value: "pickup" },
];
const benefitFields = [
  statusField,
  sortField,
  {
    field: "icon",
    type: "string",
    meta: { interface: "select-dropdown", width: "half", required: true, options: { choices: benefitIcons } },
    schema: { is_nullable: false },
  },
  {
    field: "title",
    type: "string",
    meta: { interface: "input", width: "half", required: true },
    schema: { is_nullable: false },
  },
  {
    field: "description",
    type: "text",
    meta: { interface: "input-multiline", width: "full" },
    schema: {},
  },
];

const legalPagesCollection = {
  collection: "legal_pages",
  meta: { icon: "gavel", note: "Юридические страницы", collection: "legal_pages" },
  schema: { name: "legal_pages" },
};
const legalPageFields = [
  statusField,
  sortField,
  {
    field: "slug",
    type: "string",
    meta: { interface: "input", required: true, width: "half", note: "URL: /legal/{slug}" },
    schema: { is_nullable: false, is_unique: true },
  },
  {
    field: "title",
    type: "string",
    meta: { interface: "input", required: true, width: "half" },
    schema: { is_nullable: false },
  },
  {
    field: "body_md",
    type: "text",
    meta: { interface: "input-rich-text-md", width: "full", required: true },
    schema: { is_nullable: false },
  },
  {
    field: "show_in_footer",
    type: "boolean",
    meta: { interface: "boolean", width: "half", special: ["cast-boolean"] },
    schema: { default_value: true },
  },
];

const orderStatusField = {
  field: "status",
  type: "string",
  meta: {
    width: "half",
    interface: "select-dropdown",
    display: "labels",
    options: {
      choices: [
        { text: "Черновик", value: "draft" },
        { text: "Оформлен", value: "submitted" },
        { text: "Подтверждён", value: "confirmed" },
        { text: "Готовится", value: "preparing" },
        { text: "Готов к выдаче", value: "ready" },
        { text: "Выдан", value: "collected" },
        { text: "Отменён", value: "cancelled" },
      ],
    },
    display_options: {
      showAsDot: true,
      choices: [
        { text: "Черновик", value: "draft", background: "#A2B5CD" },
        { text: "Оформлен", value: "submitted", background: "#2F80ED" },
        { text: "Подтверждён", value: "confirmed", background: "#6D47D9" },
        { text: "Готовится", value: "preparing", background: "#EFC253" },
        { text: "Готов к выдаче", value: "ready", background: "#27AE60" },
        { text: "Выдан", value: "collected", background: "#7EAD5C" },
        { text: "Отменён", value: "cancelled", background: "#E53935" },
      ],
    },
  },
  schema: { default_value: "draft", is_nullable: false },
};

const ordersCollection = {
  collection: "orders",
  meta: {
    icon: "receipt_long",
    note: "Заказы клиентов",
    collection: "orders",
    sort_field: "order_number",
    archive_field: "status",
    archive_value: "cancelled",
    unarchive_value: "submitted",
  },
  schema: { name: "orders" },
};
const orderFields = [
  orderStatusField,
  {
    field: "order_number",
    type: "integer",
    meta: {
      interface: "input",
      width: "half",
      readonly: true,
      note: "Автонумерация (человекочитаемый id для клиента)",
      special: [],
    },
    schema: { has_auto_increment: true, is_nullable: false, is_unique: true },
  },
  {
    field: "user",
    type: "uuid",
    meta: {
      interface: "select-dropdown-m2o",
      special: ["m2o"],
      width: "half",
      options: { template: "{{first_name}} {{last_name}} ({{email}})" },
      note: "Залогиненный клиент (может быть пусто для гостевых заказов)",
    },
    schema: {},
  },
  {
    field: "contact_name",
    type: "string",
    meta: { interface: "input", width: "half" },
    schema: {},
  },
  {
    field: "contact_phone",
    type: "string",
    meta: { interface: "input", width: "half", required: true },
    schema: { is_nullable: false },
  },
  {
    field: "pickup_time",
    type: "timestamp",
    meta: { interface: "datetime", width: "half", note: "Желаемое время самовывоза" },
    schema: {},
  },
  {
    field: "total",
    type: "integer",
    meta: {
      interface: "input",
      width: "half",
      readonly: true,
      note: "Итого ₽ (пересчитывается автоматически на фронте)",
    },
    schema: { default_value: 0 },
  },
  {
    field: "notes",
    type: "text",
    meta: { interface: "input-multiline", width: "full", note: "Комментарий клиента" },
    schema: {},
  },
  {
    field: "items",
    type: "alias",
    meta: {
      interface: "list-o2m",
      special: ["o2m"],
      width: "full",
      options: { template: "{{quantity}}× {{product_title_snapshot}}" },
    },
    schema: {},
  },
];

const orderItemsCollection = {
  collection: "order_items",
  meta: {
    icon: "shopping_basket",
    hidden: true,
    note: "Позиции заказов",
    collection: "order_items",
  },
  schema: { name: "order_items" },
};
const orderItemFields = [
  {
    field: "order",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], width: "half" },
    schema: {},
  },
  {
    field: "product",
    type: "uuid",
    meta: { interface: "select-dropdown-m2o", special: ["m2o"], width: "half" },
    schema: {},
  },
  {
    field: "product_slug_snapshot",
    type: "string",
    meta: { interface: "input", width: "half", readonly: true },
    schema: {},
  },
  {
    field: "product_title_snapshot",
    type: "string",
    meta: { interface: "input", width: "half", readonly: true },
    schema: {},
  },
  {
    field: "price_snapshot",
    type: "integer",
    meta: { interface: "input", width: "half", readonly: true },
    schema: { default_value: 0 },
  },
  {
    field: "quantity",
    type: "integer",
    meta: { interface: "input", width: "half" },
    schema: { default_value: 1, is_nullable: false },
  },
];

// Extra fields for directus_users (customer profile).
const userExtraFields = [
  {
    field: "phone",
    type: "string",
    meta: { interface: "input", width: "half", note: "Телефон (+7…)" },
    schema: {},
  },
  {
    field: "marketing_opt_in",
    type: "boolean",
    meta: { interface: "boolean", width: "half", note: "Согласен на маркетинговые рассылки", special: ["cast-boolean"] },
    schema: { default_value: false },
  },
  {
    field: "bonus_points",
    type: "integer",
    meta: { interface: "input", width: "half", note: "Бонусные баллы" },
    schema: { default_value: 0 },
  },
  {
    field: "preferred_categories",
    type: "json",
    meta: {
      interface: "tags",
      width: "full",
      options: { presets: ["bread", "savory-pastry", "sweet-pastry", "ready-meals", "frozen", "drinks"] },
    },
    schema: {},
  },
  {
    field: "notification_channels",
    type: "json",
    meta: {
      interface: "select-multiple-checkbox",
      width: "full",
      options: {
        choices: [
          { text: "Email", value: "email" },
          { text: "Telegram", value: "telegram" },
          { text: "Web Push", value: "push" },
        ],
      },
    },
    schema: {},
  },
];

// SEO fields (added to existing categories/products collections).
const seoFields = [
  {
    field: "meta_title",
    type: "string",
    meta: { interface: "input", width: "full", group: "seo", note: "SEO title (до 60 символов)" },
    schema: {},
  },
  {
    field: "meta_description",
    type: "text",
    meta: { interface: "input-multiline", width: "full", group: "seo", note: "SEO description (до 160 символов)" },
    schema: {},
  },
  {
    field: "og_image",
    type: "uuid",
    meta: { interface: "file-image", special: ["file"], width: "full", group: "seo", note: "Картинка для шаринга (1200×630)" },
    schema: {},
  },
];

// --------------------- seed data ---------------------
const heroSlidesData = [
  { sort: 1, title: "Свежая выпечка", accent: "каждый день", description: "Готовим с душой из натуральных ингредиентов и по проверенным рецептам", cta_label: "Перейти в каталог", cta_href: "/catalog", _image: "sliders/bread.webp" },
  { sort: 2, title: "Тёплая самса", accent: "из печи", description: "Слоёное тесто, сочная начинка — забирайте горячей через 15 минут после заказа", cta_label: "Смотреть выпечку", cta_href: "/catalog/savory-pastry", _image: "sliders/savory-pastry.webp" },
  { sort: 3, title: "Полуфабрикаты", accent: "как дома", description: "Пельмени, вареники и манты ручной лепки — наша гордость в каждой упаковке", cta_label: "Заморозка", cta_href: "/catalog/frozen", _image: "sliders/frozen.webp" },
  { sort: 4, title: "Сладкая сдоба", accent: "с маком", description: "Свежие булочки, ватрушки и рулеты — идеальная пара к утреннему кофе", cta_label: "Сладкая выпечка", cta_href: "/catalog/sweet-pastry", _image: "sliders/sweet-pastry.webp" },
  { sort: 5, title: "Напитки", accent: "к любому блюду", description: "Натуральные лимонады, компоты и чай — всё, что освежит ваш день", cta_label: "К напиткам", cta_href: "/catalog/drinks", _image: "sliders/drinks.webp" },
];

const locationsData = [
  {
    title: "Пекарня «Дело вкуса»",
    address: "г. Корсаков, ул. Гвардейская, 54",
    phone: "+7 (843) 555-01-20",
    working_hours: "Ежедневно 08:00 – 20:00",
    location: { lat: 46.634980, lng: 142.782579, zoom: 16 },
    sort: 1,
    status: "published",
  },
];

// --------------------- public permissions ---------------------
const publicPermissions = [
  {
    collection: "categories",
    action: "read",
    fields: ["id", "slug", "title", "subtitle", "image", "slider_image", "sort", "meta_title", "meta_description", "og_image"],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "products",
    action: "read",
    fields: [
      "id",
      "slug",
      "title",
      "category",
      "price",
      "old_price",
      "weight",
      "tag",
      "available",
      "image",
      "description",
      "sort",
      "popularity_rank",
      "meta_title",
      "meta_description",
      "og_image",
    ],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "globals",
    action: "read",
    fields: [
      "brand_name", "legal_name", "inn",
      "email_general", "email_hr", "email_b2b",
      "about_short", "about_long",
      "production_md", "careers_md",
      "social", "app_links",
      "tagline_main", "tagline_accent",
      "meta_title", "meta_description", "seo_keywords",
      "theme_color", "background_color", "payment_methods",
      "opens_at", "closes_at",
    ],
    permissions: null,
  },
  {
    collection: "hero_slides",
    action: "read",
    fields: ["id", "sort", "title", "accent", "description", "image", "cta_label", "cta_href", "active_from", "active_until"],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "promotions",
    action: "read",
    fields: ["id", "slug", "title", "tag", "description", "image", "discount_percent", "active_from", "active_until", "sort"],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "locations",
    action: "read",
    fields: ["id", "title", "address", "phone", "working_hours", "image", "location", "sort"],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "nav_menu_items",
    action: "read",
    fields: ["id", "location", "label", "href", "icon", "sort"],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "benefits",
    action: "read",
    fields: ["id", "icon", "title", "description", "sort"],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "legal_pages",
    action: "read",
    fields: ["id", "slug", "title", "body_md", "show_in_footer", "sort"],
    permissions: { status: { _eq: "published" } },
  },
  {
    collection: "directus_files",
    action: "read",
    fields: [
      "id",
      "storage",
      "filename_download",
      "type",
      "width",
      "height",
      "title",
      "description",
      "focal_point_x",
      "focal_point_y",
    ],
    permissions: null,
  },
];

// --------------------- customer role + policy ---------------------
const customerPermissions = [
  // Read own user, update own
  {
    collection: "directus_users",
    action: "read",
    fields: ["id", "first_name", "last_name", "email", "avatar", "phone", "marketing_opt_in", "bonus_points", "preferred_categories", "notification_channels"],
    permissions: { id: { _eq: "$CURRENT_USER" } },
  },
  {
    collection: "directus_users",
    action: "update",
    fields: ["first_name", "last_name", "phone", "avatar", "marketing_opt_in", "preferred_categories", "notification_channels"],
    permissions: { id: { _eq: "$CURRENT_USER" } },
  },
  // Orders: create new, read own
  {
    collection: "orders",
    action: "create",
    fields: ["status", "user", "contact_name", "contact_phone", "pickup_time", "total", "notes", "items"],
    presets: { user: "$CURRENT_USER", status: "submitted" },
    permissions: null,
  },
  {
    collection: "orders",
    action: "read",
    fields: ["*"],
    permissions: { user: { _eq: "$CURRENT_USER" } },
  },
  {
    collection: "order_items",
    action: "create",
    fields: ["*"],
    permissions: null,
  },
  {
    collection: "order_items",
    action: "read",
    fields: ["*"],
    permissions: { order: { user: { _eq: "$CURRENT_USER" } } },
  },
];

async function ensureCustomerRoleAndPolicy() {
  console.log("\n[seed] ==== CUSTOMER ROLE ====");

  // 1. Role
  const roles = await client.request(readRoles({ filter: { name: { _eq: "Customer" } }, limit: 1 }));
  let role = roles[0];
  if (!role) {
    role = await client.request(
      createRole({
        name: "Customer",
        icon: "shopping_basket",
        description: "Зарегистрированный клиент (через SSO)",
      }),
    );
    console.log(`[seed]   + role Customer (${role.id})`);
  } else {
    console.log(`[seed]   ~ role Customer exists (${role.id})`);
  }

  // 2. Policy — создаётся БЕЗ roles, иначе Directus отдаёт 403.
  const policies = await client.request(
    readPolicies({ filter: { name: { _eq: "Customer" } }, limit: 1, fields: ["id", "name"] }),
  );
  let policy = policies[0];
  if (!policy) {
    policy = await client.request(
      createPolicy({
        name: "Customer",
        icon: "shopping_basket",
        description: "Права клиента: читать свой профиль, создавать/читать свои заказы",
        admin_access: false,
        app_access: false,
      }),
    );
    console.log(`[seed]   + policy Customer (${policy.id})`);
  } else {
    console.log(`[seed]   ~ policy Customer exists (${policy.id})`);
  }

  // Link policy to role via the junction (role.policies is M2M access).
  try {
    const current = await client.request(
      readRoles({
        filter: { id: { _eq: role.id } },
        fields: ["id", { policies: ["policy"] }],
        limit: 1,
      }),
    );
    const linked = (current[0]?.policies ?? []).some(
      (p) => (typeof p === "object" ? p.policy : p) === policy.id,
    );
    if (!linked) {
      await client.request(
        updateRole(role.id, {
          policies: { create: [{ policy: { id: policy.id } }] },
        }),
      );
      console.log("[seed]   + linked policy → role");
    }
  } catch (e) {
    console.warn("[seed]   ! could not link policy to role:", e?.errors?.[0]?.message ?? e);
  }

  // 3. Permissions
  const existing = await client.request(
    readPermissions({
      filter: { policy: { _eq: policy.id } },
      limit: -1,
      fields: ["id", "collection", "action"],
    }),
  );
  const byKey = new Map(existing.map((p) => [`${p.collection}:${p.action}`, p]));
  for (const p of customerPermissions) {
    const key = `${p.collection}:${p.action}`;
    const payload = { ...p, policy: policy.id };
    const found = byKey.get(key);
    if (found) {
      await client.request(updatePermission(found.id, payload));
      console.log(`[seed]     ~ customer.${key}`);
    } else {
      await client.request(createPermission(payload));
      console.log(`[seed]     + customer.${key}`);
    }
  }

  console.log(`\n[seed]   ℹ Customer role UUID for AUTH_*_DEFAULT_ROLE_ID env:\n    ${role.id}`);
  return role.id;
}

async function ensurePublicPermissions() {
  console.log("\n[seed] ==== PUBLIC PERMISSIONS ====");
  // Find Public policy
  const policies = await client.request(
    readPolicies({ fields: ["id", "name", "icon"], limit: -1 }),
  );
  const publicPolicy = policies.find(
    (p) => p.icon === "public" || /public/i.test(p.name ?? ""),
  );
  if (!publicPolicy) {
    console.warn("[seed]   ! Public policy not found, skipping permissions");
    return;
  }

  const existing = await client.request(
    readPermissions({
      filter: { policy: { _eq: publicPolicy.id } },
      limit: -1,
      fields: ["id", "collection", "action"],
    }),
  );
  const byKey = new Map(existing.map((p) => [`${p.collection}:${p.action}`, p]));

  for (const p of publicPermissions) {
    const key = `${p.collection}:${p.action}`;
    const found = byKey.get(key);
    const payload = { ...p, policy: publicPolicy.id };
    if (found) {
      await client.request(updatePermission(found.id, payload));
      console.log(`[seed]   ~ updated public.${key}`);
    } else {
      await client.request(createPermission(payload));
      console.log(`[seed]   + created public.${key}`);
    }
  }
}

// --------------------- revalidate flow ---------------------
async function ensureRevalidateFlow() {
  const siteUrl = process.env.SITE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!siteUrl || !secret) {
    console.log(
      "\n[seed] ==== REVALIDATE FLOW ==== SKIP (SITE_URL / REVALIDATE_SECRET not set)",
    );
    return;
  }

  console.log("\n[seed] ==== REVALIDATE FLOW ====");
  const flows = await client.request(
    readFlows({ filter: { name: { _eq: "Revalidate Next.js cache" } }, limit: 1 }),
  );
  for (const f of flows) {
    await client.request(deleteFlow(f.id));
    console.log(`[seed]   - dropped existing flow ${f.id}`);
  }

  const flow = await client.request(
    createFlow({
      name: "Revalidate Next.js cache",
      icon: "refresh",
      color: "#00C897",
      description: "Дёргает /api/revalidate при изменении контента",
      status: "active",
      trigger: "event",
      accountability: "all",
      options: {
        type: "action",
        scope: ["items.create", "items.update", "items.delete"],
        collections: ["categories", "products", "globals", "nav_menu_items", "benefits", "legal_pages", "promotions"],
      },
    }),
  );
  console.log(`[seed]   + flow ${flow.id}`);

  const op = await client.request(
    createOperation({
      flow: flow.id,
      name: "Call /api/revalidate",
      key: "revalidate_request",
      type: "request",
      position_x: 19,
      position_y: 1,
      options: {
        method: "POST",
        url: `${siteUrl}/api/revalidate?secret=${secret}`,
        body: "{{$trigger}}",
        headers: [{ header: "Content-Type", value: "application/json" }],
      },
    }),
  );
  await client.request(updateFlow(flow.id, { operation: op.id }));
  console.log(`[seed]   + operation ${op.id} wired as entry`);
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

  // Additional collections
  await ensureCollection(heroSlidesCollection, [idField, ...heroSlideFields]);
  await ensureCollection(promotionsCollection, [idField, ...promotionFields]);
  await ensureCollection(locationsCollection, [idField, ...locationFields]);
  await ensureCollection(ordersCollection, [idField, ...orderFields]);
  await ensureCollection(orderItemsCollection, [idField, ...orderItemFields]);
  await ensureCollection(navMenuItemsCollection, [idField, ...navMenuFields]);
  await ensureCollection(benefitsCollection, [idField, ...benefitFields]);
  await ensureCollection(legalPagesCollection, [idField, ...legalPageFields]);

  // SEO fields on existing categories / products
  console.log("[seed]   SEO fields on categories/products");
  for (const f of seoFields) {
    await ensureField("categories", f);
    await ensureField("products", f);
  }
  // Customer profile fields on directus_users
  console.log("[seed]   Extra fields on directus_users");
  for (const f of userExtraFields) {
    await ensureField("directus_users", f);
  }

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

  // Relations
  const relations = [
    { collection: "products", field: "category", related_collection: "categories" },
    { collection: "orders", field: "user", related_collection: "directus_users" },
    {
      collection: "order_items",
      field: "order",
      related_collection: "orders",
      meta: { one_field: "items" },
    },
    { collection: "order_items", field: "product", related_collection: "products" },
  ];
  for (const r of relations) {
    try {
      await client.request(createRelation(r));
      console.log(`[seed] ✓ relation ${r.collection}.${r.field} → ${r.related_collection}`);
    } catch {
      console.log(`[seed] relation ${r.collection}.${r.field} exists, skipping`);
    }
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
      popularity_rank: POPULARITY_RANKS[p.slug] ?? null,
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

  // Backfill popularity_rank for products that already exist (seed only inserts new).
  console.log("\n[seed] ==== POPULARITY ====");
  for (const [slug, rank] of Object.entries(POPULARITY_RANKS)) {
    const found = await client.request(
      readItems("products", { filter: { slug: { _eq: slug } }, fields: ["id", "popularity_rank"], limit: 1 }),
    );
    if (!found[0]) {
      console.log(`[seed]   ! ${slug} not found, skipping rank`);
      continue;
    }
    if (found[0].popularity_rank === rank) {
      console.log(`[seed]   ~ ${slug} popularity_rank already ${rank}`);
      continue;
    }
    await client.request(updateItem("products", found[0].id, { popularity_rank: rank }));
    console.log(`[seed]   ✓ ${slug} popularity_rank = ${rank}`);
  }

  // 5) Globals (singleton)
  console.log("\n[seed] ==== GLOBALS ====");
  let existingGlobals = null;
  try {
    existingGlobals = await client.request(readSingleton("globals"));
  } catch {
    existingGlobals = null;
  }
  const isFirstRun = !existingGlobals?.brand_name;
  if (isFirstRun) {
    await client.request(updateSingleton("globals", globalsData));
    console.log("[seed] ✓ globals populated (initial)");
  } else {
    // Patch only new keys whose value is currently null/undefined.
    const patch = {};
    for (const [k, v] of Object.entries(globalsData)) {
      if (existingGlobals[k] == null) patch[k] = v;
    }
    if (Object.keys(patch).length) {
      await client.request(updateSingleton("globals", patch));
      console.log(`[seed] ✓ globals patched with new keys: ${Object.keys(patch).join(", ")}`);
    } else {
      console.log("[seed] globals already complete, skipping");
    }
  }

  // Hero slides
  console.log("\n[seed] ==== HERO SLIDES ====");
  const existingSlides = await client.request(
    readItems("hero_slides", { fields: ["title"], limit: -1 }),
  );
  if (existingSlides.length) {
    console.log(`[seed] hero_slides already has ${existingSlides.length}, skipping`);
  } else {
    const newSlides = [];
    for (const s of heroSlidesData) {
      const img = resolve(root, "public", s._image);
      const imageId = existsSync(img)
        ? await uploadIfMissing(img, "hero-slides")
        : null;
      const { _image, ...rest } = s;
      newSlides.push({ ...rest, image: imageId, status: "published" });
    }
    const created = await client.request(createItems("hero_slides", newSlides));
    console.log(`[seed] ✓ inserted ${created.length} hero slides`);
  }

  // Promotions
  console.log("\n[seed] ==== PROMOTIONS ====");
  const promotionsData = [
    { slug: "buns-2-plus-1", title: "2+1 на сдобные булочки", description: "Каждая третья булочка в подарок. Каждое воскресенье.", tag: "new", sort: 1, status: "published" },
    { slug: "first-order-cashback-10", title: "Кэшбэк 10% на первый заказ", description: "Зарегистрируйтесь через Яндекс ID и получите бонусы на следующий заказ.", tag: "hit", discount_percent: 10, sort: 2, status: "published" },
    { slug: "happy-hours", title: "Счастливые часы 17:00–19:00", description: "Скидка 20% на выпечку дня. Каждый будний день.", tag: "sale", discount_percent: 20, sort: 3, status: "published" },
  ];
  const existingPromos = await client.request(
    readItems("promotions", { fields: ["slug"], limit: -1 }),
  );
  const existingPromoSlugs = new Set(existingPromos.map(p => p.slug));
  const newPromos = promotionsData.filter(p => !existingPromoSlugs.has(p.slug));
  if (newPromos.length) {
    const created = await client.request(createItems("promotions", newPromos));
    console.log(`[seed] ✓ inserted ${created.length} promotions`);
  } else {
    console.log("[seed] promotions already populated, skipping");
  }

  // Locations
  console.log("\n[seed] ==== LOCATIONS ====");
  const existingLocations = await client.request(
    readItems("locations", { fields: ["id"], limit: 1 }),
  );
  if (existingLocations.length) {
    console.log("[seed] locations already populated, skipping");
  } else {
    await client.request(createItems("locations", locationsData));
    console.log(`[seed] ✓ inserted ${locationsData.length} location(s)`);
  }

  // Nav menu items
  console.log("\n[seed] ==== NAV MENU ====");
  const navData = [
    // header
    { location: "header", label: "Каталог", href: "/catalog", sort: 1 },
    { location: "header", label: "О компании", href: "/about", sort: 2 },
    { location: "header", label: "Контакты", href: "/contacts", sort: 3 },
    { location: "header", label: "Акции", href: "/promotions", sort: 4 },
    // footer-customers (4 items)
    { location: "footer-customers", label: "Каталог", href: "/catalog", sort: 1 },
    { location: "footer-customers", label: "Акции", href: "/promotions", sort: 2 },
    { location: "footer-customers", label: "Доставка и самовывоз", href: "/contacts", sort: 3 },
    { location: "footer-customers", label: "Программа лояльности", href: "/loyalty", sort: 4 },
    // footer-company (4 items)
    { location: "footer-company", label: "О нас", href: "/about", sort: 1 },
    { location: "footer-company", label: "Производство", href: "/about#production", sort: 2 },
    { location: "footer-company", label: "Оптовым клиентам", href: "/contacts#b2b", sort: 3 },
    { location: "footer-company", label: "Вакансии", href: "/about#jobs", sort: 4 },
    // mobile-tab
    { location: "mobile-tab", label: "Главная", href: "/", icon: "home", sort: 1 },
    { location: "mobile-tab", label: "Каталог", href: "/catalog", icon: "catalog", sort: 2 },
    { location: "mobile-tab", label: "Корзина", href: "/cart", icon: "cart", sort: 3 },
    { location: "mobile-tab", label: "Акции", href: "/promotions", icon: "promo", sort: 4 },
    { location: "mobile-tab", label: "Профиль", href: "/profile", icon: "profile", sort: 5 },
  ].map(d => ({ ...d, status: "published" }));
  const existingNavItems = await client.request(
    readItems("nav_menu_items", { fields: ["id"], limit: 1 }),
  );
  if (existingNavItems.length) {
    // Backfill: insert any items from navData that are NOT already in the live DB.
    // Match by (location, label) — labels are user-facing and stable; sorts can
    // shift when new items are inserted in the middle of a list.
    const existing = await client.request(
      readItems("nav_menu_items", { fields: ["location", "label"], limit: -1 }),
    );
    const existingKeys = new Set(existing.map(r => `${r.location}:${r.label}`));
    const toInsert = navData.filter(d => !existingKeys.has(`${d.location}:${d.label}`));
    if (toInsert.length) {
      const created = await client.request(createItems("nav_menu_items", toInsert));
      console.log(`[seed] ✓ backfilled ${created.length} new nav items`);
    } else {
      console.log("[seed] nav_menu_items already complete, skipping");
    }
  } else {
    const created = await client.request(createItems("nav_menu_items", navData));
    console.log(`[seed] ✓ inserted ${created.length} nav items`);
  }

  // Benefits
  console.log("\n[seed] ==== BENEFITS ====");
  const benefitsData = [
    { icon: "sparkle", title: "Натуральные ингредиенты", description: "Только отборные продукты без искусственных добавок", sort: 1, status: "published" },
    { icon: "chef", title: "Свежая выпечка каждый день", description: "Ремесленный подход и круглосуточная пекарня", sort: 2, status: "published" },
    { icon: "heart", title: "Готовим с душой", description: "Для вас и вашей семьи — как дома, только вкуснее", sort: 3, status: "published" },
    { icon: "pickup", title: "Удобный самовывоз", description: "Быстро, без очередей, с бесконтактной оплатой", sort: 4, status: "published" },
  ];
  const existingBenefits = await client.request(
    readItems("benefits", { fields: ["title"], limit: -1 }),
  );
  const existingTitles = new Set(existingBenefits.map(b => b.title));
  const newBenefits = benefitsData.filter(b => !existingTitles.has(b.title));
  if (newBenefits.length) {
    const created = await client.request(createItems("benefits", newBenefits));
    console.log(`[seed] ✓ inserted ${created.length} benefits`);
  } else {
    console.log("[seed] benefits already populated, skipping");
  }

  // Legal pages
  console.log("\n[seed] ==== LEGAL PAGES ====");
  const legalPagesData = [
    {
      slug: "terms",
      title: "Публичная оферта",
      body_md: "# Публичная оферта\n\nТекст оферты — заполнить в админке.",
      show_in_footer: true, sort: 1, status: "published",
    },
    {
      slug: "privacy",
      title: "Политика конфиденциальности",
      body_md: "# Политика конфиденциальности\n\nТекст политики — заполнить в админке.",
      show_in_footer: true, sort: 2, status: "published",
    },
  ];
  const existingLegal = await client.request(
    readItems("legal_pages", { fields: ["slug"], limit: -1 }),
  );
  const existingLegalSlugs = new Set(existingLegal.map(p => p.slug));
  const newLegal = legalPagesData.filter(p => !existingLegalSlugs.has(p.slug));
  if (newLegal.length) {
    const created = await client.request(createItems("legal_pages", newLegal));
    console.log(`[seed] ✓ inserted ${created.length} legal pages`);
  } else {
    console.log("[seed] legal_pages already populated, skipping");
  }

  // Customer role + policy + permissions
  await ensureCustomerRoleAndPolicy();

  // Public permissions + revalidate flow
  await ensurePublicPermissions();
  await ensureRevalidateFlow();

  console.log("\n[seed] DONE ✨");
}

main().catch((err) => {
  console.error("[seed] ERROR:", err?.errors ?? err);
  process.exit(1);
});
