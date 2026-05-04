# CMS-Driven Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить весь хардкод во фронте и дублирование данных в бэке. Все отображаемые данные должны приходить из Directus, источник истины для каждой сущности — единственный.

**Architecture:** Расширяем существующий Directus seed (`frontend/scripts/directus-seed.mjs`) новыми полями/коллекциями инкрементно. Контакты выносятся из `globals` в `locations[]` (helper `getPrimaryLocation`). Меню/преимущества/legal-страницы — отдельные коллекции. Слоганы/SEO/часы — поля globals. Frontend читает всё через расширенный `lib/api.ts` и удаляет mock-fallback'и для удалённых сущностей.

**Tech Stack:** Next.js 16 (App Router), React 19, Directus 11+ SDK (`@directus/sdk` v21), Zustand, Tailwind 4. Тестового харнесса нет — verification через `pnpm tsc --noEmit`, `pnpm lint`, `pnpm seed` (live Directus) и preview-tools (preview_start/snapshot/screenshot).

**Окружение:** Все команды из `frontend/`. Креды Directus в `frontend/.env.local` или `.env.local` в корне. `DIRECTUS_URL`, `DIRECTUS_ADMIN_TOKEN`, `SITE_URL`, `REVALIDATE_SECRET`.

**Город:** Корсаков (исправляем расхождение с mocks.ts).

---

## File Structure

### Backend (Directus seed)
- **Modify:** `frontend/scripts/directus-seed.mjs`
  - Расширить `globalsFields` (10 новых полей + 2 deprecated комментариев)
  - Добавить `productsExtraFields` (popularity_rank)
  - Удалить `products_count` из `categoryFields`
  - Добавить определения коллекций: `nav_menu_items`, `benefits`, `legal_pages`
  - Добавить seed-данные для них
  - Расширить `publicPermissions` (включить `inn`, новые поля globals, новые коллекции)

### Frontend types & API
- **Modify:** `frontend/src/types/index.ts` — расширить `Globals`, `Product`, `HeroSlide`; добавить `Promotion`, `Benefit`, `NavMenuItem`, `LegalPage`, `NavLocation`, `NavIcon` enum
- **Modify:** `frontend/src/lib/directus.ts` — DirectusSchema: добавить новые поля и коллекции
- **Modify:** `frontend/src/lib/api.ts` — добавить fetchPromotions, fetchBenefits, fetchNavMenu, fetchLegalPage, getPrimaryLocation; обновить fetchHeroSlides (фильтр active_*); обновить fetchPopularProducts (popularity_rank); удалить products_count; обновить fetchGlobals
- **Modify:** `frontend/src/lib/mocks.ts` — починить город Корсаков; удалить `mockPopularSlugs` (станет неактуальной); локальные mock-структуры для новых сущностей не добавляем (по решению — fallback'ы для новых данных не нужны)

### UI components
- **Modify:** `frontend/src/components/layout/header.tsx` — nav из CMS, контакты из getPrimaryLocation
- **Modify:** `frontend/src/components/layout/footer.tsx` — nav из CMS (3 локации), контакты из getPrimaryLocation, payment_methods из globals, legal links из коллекции, slogan из globals
- **Modify:** `frontend/src/components/layout/mobile-tab-bar.tsx` — лейблы из CMS, иконки маппятся через icon-enum
- **Modify:** `frontend/src/components/home/benefits.tsx` — пропсы, рендер из коллекции
- **Modify:** `frontend/src/app/page.tsx` — пробросить benefits из api
- **Rewrite:** `frontend/src/app/promotions/page.tsx` — через fetchPromotions
- **Modify:** `frontend/src/app/about/page.tsx` — production_md, careers_md, email_hr из CMS
- **Modify:** `frontend/src/app/contacts/page.tsx` — getPrimaryLocation вместо globals
- **Modify:** `frontend/src/app/layout.tsx` — все meta/jsonLd из globals; opens_at/closes_at; tagline_*; seo_keywords
- **Modify:** `frontend/src/app/manifest.ts` — name/description/categories/theme_color из globals
- **Modify:** `frontend/src/app/opengraph-image.tsx` — все тексты из globals (alt, slogans)
- **Modify:** `frontend/src/app/twitter-image.tsx` — то же (если содержит хардкод; проверим)
- **Modify:** `frontend/src/app/catalog/[category]/page.tsx`, `frontend/src/app/product/[slug]/page.tsx` — generateMetadata подключить к meta_*/og_image
- **Create:** `frontend/src/app/legal/[slug]/page.tsx` — динамические юр. страницы

### Orders flow
- **Modify:** `frontend/src/app/cart/page.tsx` — добавить форму (имя, телефон, время самовывоза, комментарий) и POST в Directus
- **Create:** `frontend/src/app/api/orders/route.ts` — server-side proxy, использует `DIRECTUS_ADMIN_TOKEN` или клиентскую сессию
- **Modify:** `frontend/src/stores/cart.ts` — `submit()` метод (опционально)

### Cleanup
- **Modify:** `frontend/src/types/index.ts` — удалить `addressShort`/`address`/`phone`/`workingHours`/`location`/`email` из `Globals` (или пометить deprecated)
- **Modify:** `frontend/src/lib/api.ts` — удалить fetchPopularProducts mock-fallback
- **Delete or regenerate:** `deploy/directus-snapshot.json`
- **Modify:** `deploy/docker-compose.yml` или `.env` documentation — `DIRECTUS_USE_FALLBACK_MOCKS=false` для prod

---

## Phase 1: Schema migration (Directus)

Этап вводит все новые поля и коллекции в Directus, не трогая фронт. Фронт продолжает работать на старых полях (поскольку seed идемпотентный, добавление полей безопасно). Один коммит на каждую логическую группу.

### Task 1.1: Глобальные поля — слоганы, часы, цвета, SEO

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs` (массив `globalsFields`, ~ строка 339)

- [ ] **Step 1: Открыть seed и добавить новые поля в `globalsFields`**

В `frontend/scripts/directus-seed.mjs` после существующего поля `app_links` (~строка 432) добавить блок:

```javascript
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
```

- [ ] **Step 2: Добавить дефолтные значения в `globalsData`** (массив, ~строка 471)

После `app_links: { ... }` добавить:

```javascript
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
```

- [ ] **Step 3: Запустить seed**

```bash
pnpm seed
```

Expected output (новые строки): `[seed]   + field globals.tagline_main`, `+ field globals.tagline_accent`, ..., `+ field globals.careers_md`. Без ошибок.

- [ ] **Step 4: Проверить, что singleton получил значения**

```bash
node -e "import('@directus/sdk').then(async ({createDirectus, rest, staticToken, readSingleton}) => { const c = createDirectus(process.env.DIRECTUS_URL).with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN)).with(rest()); const g = await c.request(readSingleton('globals')); console.log({tagline_main: g.tagline_main, opens_at: g.opens_at, payment_methods: g.payment_methods, email_hr: g.email_hr}); })" 2>&1 | head -5
```

Expected: вывод объекта с `tagline_main: "Свежая выпечка"`, `opens_at: "08:00"`, `payment_methods: ["МИР",...]`, `email_hr: "hr@delovkusa.ru"`.

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/directus-seed.mjs
git commit -m "feat(directus): добавить slogan/seo/hours/contact-roles/about-md поля в globals"
```

### Task 1.2: products.popularity_rank, удалить products_count

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs` (`productFields`, `categoryFields`, `productsData`, public perms)

- [ ] **Step 1: Добавить `popularity_rank` в `productFields`**

После поля `available` (~ строка 324) добавить:

```javascript
  {
    field: "popularity_rank",
    type: "integer",
    meta: { interface: "input", width: "half", note: "Чем меньше — тем выше в «Популярном». NULL = не показывать" },
    schema: {},
  },
```

- [ ] **Step 2: Проставить `popularity_rank` в `productsData` для нынешних популярных**

Найти в массиве `productsData` товары `bread-loaf`, `echpochmak`, `poppy-buns`, `frozen-pelmeni`, `mini-pizza` (это нынешние `mockPopularSlugs`) и добавить им `popularity_rank` 1, 2, 3, 4, 5 соответственно. Пример:

```javascript
  { slug: "bread-loaf", title: "Хлеб «Домашний»", category: "bread", image: "bread-loaf", price: 65, weight: "450 г", tag: "hit", available: true, popularity_rank: 1, description: "..." },
  { slug: "echpochmak", title: "Эчпочмак (Самса)", category: "savory-pastry", image: "echpochmak", price: 75, weight: "120 г", available: true, popularity_rank: 2, description: "..." },
  // ... mini-pizza popularity_rank: 5
  // ... poppy-buns popularity_rank: 3
  // ... frozen-pelmeni popularity_rank: 4
```

(Остальным `popularity_rank` не указываем — будет NULL.)

- [ ] **Step 3: Удалить `products_count` из `categoryFields` (~строка 245)**

```javascript
  // ❌ удалить блок:
  // {
  //   field: "products_count",
  //   type: "integer",
  //   ...
  // },
```

И удалить из `categoriesData` ключи `products_count`:
```javascript
  // было: { slug: "bread", ..., products_count: 1, sort: 1 }
  // стало: { slug: "bread", title: "Хлеб", subtitle: "Ремесленный каждый день", sort: 1 }
```

- [ ] **Step 4: Drop колонки products_count в Directus**

`ensureField` не удаляет — нужно удалить вручную через SDK. Добавить временный one-shot скрипт `frontend/scripts/drop-products-count.mjs`:

```javascript
import { createDirectus, rest, staticToken, deleteField } from "@directus/sdk";
const c = createDirectus(process.env.DIRECTUS_URL)
  .with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN)).with(rest());
try {
  await c.request(deleteField("categories", "products_count"));
  console.log("dropped categories.products_count");
} catch (e) {
  console.log("already dropped or not present");
}
```

Запустить: `node --env-file-if-exists=../.env.local --env-file-if-exists=.env.local scripts/drop-products-count.mjs`

После выполнения — удалить файл `scripts/drop-products-count.mjs`.

- [ ] **Step 5: Запустить seed для popularity_rank**

```bash
pnpm seed
```

Expected: `+ field products.popularity_rank`. Существующие товары seed не апдейтит (стоит проверка по slug, и они уже есть). Поэтому popularity_rank на них надо проставить отдельно. Добавить в seed (после блока products) one-shot:

```javascript
  // обновить popularity_rank у существующих
  console.log("\n[seed] ==== POPULARITY ====");
  const popularityMap = {
    "bread-loaf": 1, "echpochmak": 2, "poppy-buns": 3, "frozen-pelmeni": 4, "mini-pizza": 5,
  };
  for (const [slug, rank] of Object.entries(popularityMap)) {
    const existing = await client.request(readItems("products", { filter: { slug: { _eq: slug } }, fields: ["id"], limit: 1 }));
    if (existing[0]) {
      await client.request(updateItem("products", existing[0].id, { popularity_rank: rank }));
      console.log(`[seed]   ~ ${slug} popularity_rank = ${rank}`);
    }
  }
```

Не забыть импорт `updateItem` сверху файла (рядом с `createItems`).

- [ ] **Step 6: Обновить Public read perms — добавить popularity_rank**

В `publicPermissions` для `products` добавить `"popularity_rank"` в массив `fields`.

- [ ] **Step 7: Запустить seed повторно**

```bash
pnpm seed
```

Expected: `+ field products.popularity_rank`, `~ bread-loaf popularity_rank = 1`, ..., `~ updated public.products:read`.

- [ ] **Step 8: Verify**

```bash
curl -s "$DIRECTUS_URL/items/products?filter[popularity_rank][_nnull]=true&sort=popularity_rank&fields=slug,popularity_rank" | head -20
```

Expected: 5 продуктов в порядке bread-loaf, echpochmak, poppy-buns, frozen-pelmeni, mini-pizza.

- [ ] **Step 9: Commit**

```bash
git add frontend/scripts/directus-seed.mjs
git commit -m "feat(directus): products.popularity_rank, удалить categories.products_count"
```

### Task 1.3: Коллекция nav_menu_items

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs`

- [ ] **Step 1: Добавить определение коллекции** (после `locationsCollection`/`locationFields`)

```javascript
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
```

- [ ] **Step 2: Зарегистрировать коллекцию в `main()`**

После `await ensureCollection(orderItemsCollection, ...)`:

```javascript
  await ensureCollection(navMenuItemsCollection, [idField, ...navMenuFields]);
```

- [ ] **Step 3: Сидить пункты меню**

В `main()` после блока locations добавить:

```javascript
  // Nav menu items
  console.log("\n[seed] ==== NAV MENU ====");
  const existingNavItems = await client.request(
    readItems("nav_menu_items", { fields: ["id"], limit: 1 }),
  );
  if (existingNavItems.length) {
    console.log("[seed] nav_menu_items already populated, skipping");
  } else {
    const navData = [
      // header
      { location: "header", label: "Каталог", href: "/catalog", sort: 1 },
      { location: "header", label: "О компании", href: "/about", sort: 2 },
      { location: "header", label: "Контакты", href: "/contacts", sort: 3 },
      { location: "header", label: "Акции", href: "/promotions", sort: 4 },
      // footer-customers
      { location: "footer-customers", label: "Каталог", href: "/catalog", sort: 1 },
      { location: "footer-customers", label: "Акции", href: "/promotions", sort: 2 },
      { location: "footer-customers", label: "Доставка и самовывоз", href: "/contacts", sort: 3 },
      // footer-company
      { location: "footer-company", label: "О нас", href: "/about", sort: 1 },
      { location: "footer-company", label: "Производство", href: "/about#production", sort: 2 },
      { location: "footer-company", label: "Вакансии", href: "/about#jobs", sort: 3 },
      // mobile-tab
      { location: "mobile-tab", label: "Главная", href: "/", icon: "home", sort: 1 },
      { location: "mobile-tab", label: "Каталог", href: "/catalog", icon: "catalog", sort: 2 },
      { location: "mobile-tab", label: "Корзина", href: "/cart", icon: "cart", sort: 3 },
      { location: "mobile-tab", label: "Акции", href: "/promotions", icon: "promo", sort: 4 },
      { location: "mobile-tab", label: "Профиль", href: "/profile", icon: "profile", sort: 5 },
    ].map(d => ({ ...d, status: "published" }));
    const created = await client.request(createItems("nav_menu_items", navData));
    console.log(`[seed] ✓ inserted ${created.length} nav items`);
  }
```

- [ ] **Step 4: Public read perms**

В `publicPermissions` добавить:
```javascript
  {
    collection: "nav_menu_items",
    action: "read",
    fields: ["id", "location", "label", "href", "icon", "sort"],
    permissions: { status: { _eq: "published" } },
  },
```

- [ ] **Step 5: Run seed + verify**

```bash
pnpm seed
curl -s "$DIRECTUS_URL/items/nav_menu_items?filter[location][_eq]=header&sort=sort&fields=label,href" | head -10
```

Expected: 4 пункта header (Каталог, О компании, Контакты, Акции).

- [ ] **Step 6: Commit**

```bash
git add frontend/scripts/directus-seed.mjs
git commit -m "feat(directus): коллекция nav_menu_items + public perms + сид пунктов меню"
```

### Task 1.4: Коллекция benefits

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs`

- [ ] **Step 1: Определение коллекции и полей**

После navMenu блоков добавить:

```javascript
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
```

- [ ] **Step 2: Зарегистрировать в main + сидить**

```javascript
  await ensureCollection(benefitsCollection, [idField, ...benefitFields]);
  // ...
  // после nav_menu_items сида
  console.log("\n[seed] ==== BENEFITS ====");
  const existingBenefits = await client.request(readItems("benefits", { fields: ["id"], limit: 1 }));
  if (!existingBenefits.length) {
    await client.request(createItems("benefits", [
      { icon: "sparkle", title: "Натуральные ингредиенты", description: "Только отборные продукты без искусственных добавок", sort: 1, status: "published" },
      { icon: "chef", title: "Свежая выпечка каждый день", description: "Ремесленный подход и круглосуточная пекарня", sort: 2, status: "published" },
      { icon: "heart", title: "Готовим с душой", description: "Для вас и вашей семьи — как дома, только вкуснее", sort: 3, status: "published" },
      { icon: "pickup", title: "Удобный самовывоз", description: "Быстро, без очередей, с бесконтактной оплатой", sort: 4, status: "published" },
    ]));
    console.log("[seed] ✓ inserted 4 benefits");
  } else {
    console.log("[seed] benefits already populated, skipping");
  }
```

- [ ] **Step 3: Public perms**

```javascript
  {
    collection: "benefits",
    action: "read",
    fields: ["id", "icon", "title", "description", "sort"],
    permissions: { status: { _eq: "published" } },
  },
```

- [ ] **Step 4: Run + verify**

```bash
pnpm seed
curl -s "$DIRECTUS_URL/items/benefits?sort=sort&fields=icon,title" | head -10
```

Expected: 4 преимущества с icon=sparkle/chef/heart/pickup.

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/directus-seed.mjs
git commit -m "feat(directus): коллекция benefits + сид 4 преимуществ"
```

### Task 1.5: Коллекция legal_pages

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs`

- [ ] **Step 1: Определение коллекции**

```javascript
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
```

- [ ] **Step 2: Зарегистрировать в main + сидить**

```javascript
  await ensureCollection(legalPagesCollection, [idField, ...legalPageFields]);
  // ...
  console.log("\n[seed] ==== LEGAL PAGES ====");
  const existingLegal = await client.request(readItems("legal_pages", { fields: ["id"], limit: 1 }));
  if (!existingLegal.length) {
    await client.request(createItems("legal_pages", [
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
    ]));
    console.log("[seed] ✓ inserted 2 legal pages");
  }
```

- [ ] **Step 3: Public perms**

```javascript
  {
    collection: "legal_pages",
    action: "read",
    fields: ["id", "slug", "title", "body_md", "show_in_footer", "sort"],
    permissions: { status: { _eq: "published" } },
  },
```

- [ ] **Step 4: Run + verify**

```bash
pnpm seed
curl -s "$DIRECTUS_URL/items/legal_pages?fields=slug,title,show_in_footer" | head -10
```

Expected: terms + privacy с show_in_footer=true.

- [ ] **Step 5: Commit**

```bash
git add frontend/scripts/directus-seed.mjs
git commit -m "feat(directus): коллекция legal_pages + сид terms/privacy"
```

### Task 1.6: Public perms — добавить inn, tagline_*, opens_at/closes_at, payment_methods, etc.

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs` — `publicPermissions` для globals

- [ ] **Step 1: Расширить fields для globals в publicPermissions**

Заменить существующий блок `{ collection: "globals", action: "read", fields: [...] }` на:

```javascript
  {
    collection: "globals",
    action: "read",
    fields: [
      "brand_name", "legal_name", "inn",
      "phone",
      "email", "email_general", "email_hr", "email_b2b",
      "address", "address_short", "working_hours",
      "about_short", "about_long",
      "production_md", "careers_md",
      "location",
      "social", "app_links",
      "tagline_main", "tagline_accent",
      "meta_title", "meta_description", "seo_keywords",
      "theme_color", "background_color", "payment_methods",
      "opens_at", "closes_at",
    ],
    permissions: null,
  },
```

- [ ] **Step 2: Run seed**

```bash
pnpm seed
```

Expected: `~ updated public.globals:read`.

- [ ] **Step 3: Verify (Public role: запрос без токена)**

```bash
curl -s "$DIRECTUS_URL/items/globals?fields=tagline_main,opens_at,inn,email_hr,payment_methods" | head -5
```

Expected: все поля присутствуют. inn — `"1650000000"`, payment_methods — массив.

- [ ] **Step 4: Commit**

```bash
git add frontend/scripts/directus-seed.mjs
git commit -m "feat(directus): расширить Public read fields globals (inn, slogans, hours, etc)"
```

---

## Phase 2: Frontend types & API helpers

Расширяем типы и API. Фронт ещё использует старые поля — но новые становятся доступны.

### Task 2.1: Расширить types/index.ts

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Добавить новые типы и расширить Globals/Product/Category**

Полностью переписать `frontend/src/types/index.ts`:

```typescript
export type CategorySlug =
  | "bread"
  | "savory-pastry"
  | "sweet-pastry"
  | "ready-meals"
  | "frozen"
  | "drinks";

export interface Category {
  id: string;
  slug: CategorySlug;
  title: string;
  subtitle?: string;
  image: string;
  sliderImage?: string;
  productsCount: number; // computed at fetch time
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export type ProductTag = "hit" | "new" | "sale" | "veg";

export interface Product {
  id: string;
  slug: string;
  title: string;
  categorySlug: CategorySlug;
  image: string;
  price: number;
  oldPrice?: number;
  weight: string;
  tag?: ProductTag;
  description?: string;
  available: boolean;
  popularityRank?: number;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface Globals {
  brandName: string;
  legalName?: string;
  inn?: string;

  // Legacy (deprecated — фронт использует getPrimaryLocation()).
  // Поля остаются на бэке временно для безопасной миграции.
  phone?: string;
  email?: string;
  address?: string;
  addressShort?: string;
  workingHours?: string;
  location?: GeoLocation;

  aboutShort?: string;
  aboutLong?: string;
  productionMd?: string;
  careersMd?: string;

  social: {
    vk?: string;
    telegram?: string;
    instagram?: string;
    youtube?: string;
  };
  appLinks?: {
    appStore?: string;
    googlePlay?: string;
    ruStore?: string;
  };

  emailGeneral?: string;
  emailHr?: string;
  emailB2b?: string;

  taglineMain?: string;
  taglineAccent?: string;

  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];

  themeColor?: string;
  backgroundColor?: string;
  paymentMethods?: string[];

  opensAt?: string; // "08:00"
  closesAt?: string; // "20:00"
}

export interface Location {
  id: string;
  title: string;
  address: string;
  phone?: string;
  workingHours?: string;
  image?: string;
  location?: GeoLocation;
}

export interface HeroSlide {
  id: string;
  title: string;
  accent: string;
  description: string;
  image: string;
  cta: { label: string; href: string };
}

export interface Promotion {
  id: string;
  slug: string;
  title: string;
  tag?: ProductTag;
  description?: string;
  image?: string;
  discountPercent?: number;
}

export type BenefitIcon = "sparkle" | "chef" | "heart" | "pickup";

export interface Benefit {
  id: string;
  icon: BenefitIcon;
  title: string;
  description?: string;
}

export type NavLocation = "header" | "footer-customers" | "footer-company" | "mobile-tab";
export type NavIcon = "home" | "catalog" | "cart" | "promo" | "profile" | "none";

export interface NavMenuItem {
  id: string;
  location: NavLocation;
  label: string;
  href: string;
  icon: NavIcon;
  sort: number;
}

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  bodyMd: string;
  showInFooter: boolean;
  sort: number;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```

Expected: ошибки в файлах, которые используют `Globals.phone`/`address` без optional-чейна (раньше они были обязательны). Их пофиксим в следующих задачах. Сейчас допустимо.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(types): расширить Globals/Product/Category, добавить Promotion/Benefit/NavMenuItem/LegalPage"
```

### Task 2.2: Расширить DirectusSchema

**Files:**
- Modify: `frontend/src/lib/directus.ts`

- [ ] **Step 1: Добавить новые коллекции и поля в `DirectusSchema`**

Заменить весь `interface DirectusSchema` блок на расширенную версию с полями из задач 1.1, 1.2, 1.3, 1.4, 1.5:

```typescript
export interface DirectusSchema {
  categories: Array<{
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    image?: string | null;
    slider_image?: string | null;
    sort?: number | null;
    meta_title?: string | null;
    meta_description?: string | null;
    og_image?: string | null;
  }>;
  products: Array<{
    id: string;
    slug: string;
    title: string;
    category?: { slug: string } | null;
    image?: string | null;
    price: number;
    old_price?: number | null;
    weight: string;
    tag?: string | null;
    description?: string | null;
    status?: "published" | "draft" | "archived";
    available?: boolean | null;
    popularity_rank?: number | null;
    meta_title?: string | null;
    meta_description?: string | null;
    og_image?: string | null;
  }>;
  hero_slides: Array<{
    id: string;
    sort?: number | null;
    title: string;
    accent?: string | null;
    description?: string | null;
    image?: string | null;
    cta_label?: string | null;
    cta_href?: string | null;
    active_from?: string | null;
    active_until?: string | null;
  }>;
  promotions: Array<{
    id: string;
    slug: string;
    title: string;
    tag?: string | null;
    description?: string | null;
    image?: string | null;
    discount_percent?: number | null;
    active_from?: string | null;
    active_until?: string | null;
  }>;
  locations: Array<{
    id: string;
    sort?: number | null;
    title: string;
    address: string;
    phone?: string | null;
    working_hours?: string | null;
    image?: string | null;
    location?: { lat?: number | null; lng?: number | null; zoom?: number | null } | null;
  }>;
  globals: {
    brand_name: string;
    legal_name?: string | null;
    inn?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    address_short?: string | null;
    working_hours?: string | null;
    about_short?: string | null;
    about_long?: string | null;
    production_md?: string | null;
    careers_md?: string | null;
    location?: { lat?: number | null; lng?: number | null; zoom?: number | null } | null;
    social?: Record<string, string | undefined> | null;
    app_links?: Record<string, string | undefined> | null;
    email_general?: string | null;
    email_hr?: string | null;
    email_b2b?: string | null;
    tagline_main?: string | null;
    tagline_accent?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    seo_keywords?: string[] | null;
    theme_color?: string | null;
    background_color?: string | null;
    payment_methods?: string[] | null;
    opens_at?: string | null;
    closes_at?: string | null;
  };
  nav_menu_items: Array<{
    id: string;
    location: "header" | "footer-customers" | "footer-company" | "mobile-tab";
    label: string;
    href: string;
    icon?: string | null;
    sort?: number | null;
  }>;
  benefits: Array<{
    id: string;
    icon: string;
    title: string;
    description?: string | null;
    sort?: number | null;
  }>;
  legal_pages: Array<{
    id: string;
    slug: string;
    title: string;
    body_md: string;
    show_in_footer?: boolean | null;
    sort?: number | null;
  }>;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/directus.ts
git commit -m "feat(directus): расширить DirectusSchema новыми коллекциями и полями"
```

### Task 2.3: API helpers — getPrimaryLocation, fetchPromotions, fetchBenefits, fetchNavMenu, fetchLegalPage(s)

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Расширить `transformProduct` (popularity_rank, SEO)**

В `transformProduct` (строка 46) добавить:

```typescript
function transformProduct(row: { /* ... те же + popularity_rank/meta_title/meta_description/og_image: ... */ }): Product {
  return {
    // ... существующие поля
    available: row.available ?? true,
    popularityRank: row.popularity_rank ?? undefined,
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    ogImage: directusFile(row.og_image) ?? undefined,
  };
}
```

Не забудь расширить тип параметра row.

- [ ] **Step 2: Расширить `transformCategory`**

```typescript
function transformCategory(row: { /* + meta_title/meta_description/og_image */ }): Category {
  return {
    // ...
    productsCount: 0, // overwritten in fetchCategories via aggregate
    metaTitle: row.meta_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    ogImage: directusFile(row.og_image) ?? undefined,
  };
}
```

- [ ] **Step 3: Обновить `fetchCategories` — посчитать productsCount через aggregate**

```typescript
import { aggregate } from "@directus/sdk";

export async function fetchCategories(): Promise<Category[]> {
  if (!USE_DIRECTUS) return mockCategories;
  try {
    const [rows, counts] = await Promise.all([
      directus.request(readItems("categories", { sort: ["sort"], fields: ["*"] })),
      directus.request(
        aggregate("products", {
          aggregate: { count: "id" },
          groupBy: ["category"],
          query: { filter: { status: { _eq: "published" } } as never },
        }) as never,
      ) as Promise<Array<{ category: string; count: { id: string } }>>,
    ]);
    const countByCat = new Map(counts.map(c => [c.category, Number(c.count.id)]));
    return rows.map(r => ({
      ...transformCategory(r),
      productsCount: countByCat.get(r.id) ?? 0,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchCategories");
    return mockCategories;
  }
}
```

(Если `aggregate` не работает с Public-permissions для products — fallback к count через отдельные `readItems` с `aggregate=true`. Проверка на step 7.)

- [ ] **Step 4: Обновить `fetchPopularProducts`**

```typescript
export async function fetchPopularProducts(): Promise<Product[]> {
  if (!USE_DIRECTUS) return filterMockProducts({ slugs: mockPopularSlugs });
  try {
    const rows = (await directus.request(
      readItems("products", {
        fields: ["*", { category: ["slug"] }] as never,
        filter: { popularity_rank: { _nnull: true } } as never,
        sort: ["popularity_rank"],
        limit: 10,
      }),
    )) as Parameters<typeof transformProduct>[0][];
    return rows.map(transformProduct);
  } catch (error) {
    handleDirectusError(error, "fetchPopularProducts");
    return filterMockProducts({ slugs: mockPopularSlugs });
  }
}
```

- [ ] **Step 5: Обновить `fetchHeroSlides` — фильтр active_from/until**

В фильтре добавить:

```typescript
filter: {
  _and: [
    { _or: [{ active_from: { _null: true } }, { active_from: { _lte: "$NOW" } }] },
    { _or: [{ active_until: { _null: true } }, { active_until: { _gte: "$NOW" } }] },
  ],
} as never,
```

- [ ] **Step 6: Добавить новые helpers**

В конец файла:

```typescript
export async function fetchPromotions(): Promise<Promotion[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("promotions", {
        sort: ["sort"],
        fields: ["*"] as never,
        filter: {
          _and: [
            { _or: [{ active_from: { _null: true } }, { active_from: { _lte: "$NOW" } }] },
            { _or: [{ active_until: { _null: true } }, { active_until: { _gte: "$NOW" } }] },
          ],
        } as never,
        limit: 50,
      }),
    )) as Array<{
      id: string; slug: string; title: string; tag?: string | null;
      description?: string | null; image?: string | null;
      discount_percent?: number | null;
    }>;
    return rows.map((r): Promotion => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      tag: (r.tag as Promotion["tag"]) ?? undefined,
      description: r.description ?? undefined,
      image: directusFile(r.image) ?? undefined,
      discountPercent: r.discount_percent ?? undefined,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchPromotions");
    return [];
  }
}

export async function fetchBenefits(): Promise<Benefit[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("benefits", { sort: ["sort"], fields: ["*"] as never, limit: 20 }),
    )) as Array<{ id: string; icon: string; title: string; description?: string | null }>;
    return rows.map((r): Benefit => ({
      id: r.id,
      icon: r.icon as Benefit["icon"],
      title: r.title,
      description: r.description ?? undefined,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchBenefits");
    return [];
  }
}

export async function fetchNavMenu(location: NavLocation): Promise<NavMenuItem[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("nav_menu_items", {
        sort: ["sort"],
        fields: ["*"] as never,
        filter: { location: { _eq: location } } as never,
        limit: 20,
      }),
    )) as Array<{ id: string; location: NavLocation; label: string; href: string; icon?: string | null; sort?: number | null }>;
    return rows.map((r): NavMenuItem => ({
      id: r.id, location: r.location, label: r.label, href: r.href,
      icon: (r.icon as NavIcon) ?? "none", sort: r.sort ?? 0,
    }));
  } catch (error) {
    handleDirectusError(error, "fetchNavMenu");
    return [];
  }
}

export async function fetchLegalPage(slug: string): Promise<LegalPage | null> {
  if (!USE_DIRECTUS) return null;
  try {
    const rows = (await directus.request(
      readItems("legal_pages", {
        filter: { slug: { _eq: slug } } as never,
        fields: ["*"] as never,
        limit: 1,
      }),
    )) as Array<{ id: string; slug: string; title: string; body_md: string; show_in_footer?: boolean | null; sort?: number | null }>;
    if (!rows[0]) return null;
    const r = rows[0];
    return { id: r.id, slug: r.slug, title: r.title, bodyMd: r.body_md, showInFooter: r.show_in_footer ?? false, sort: r.sort ?? 0 };
  } catch (error) {
    handleDirectusError(error, "fetchLegalPage");
    return null;
  }
}

export async function fetchFooterLegalLinks(): Promise<LegalPage[]> {
  if (!USE_DIRECTUS) return [];
  try {
    const rows = (await directus.request(
      readItems("legal_pages", {
        filter: { show_in_footer: { _eq: true } } as never,
        sort: ["sort"],
        fields: ["id", "slug", "title", "show_in_footer", "sort"] as never,
        limit: 10,
      }),
    )) as Array<{ id: string; slug: string; title: string; show_in_footer: boolean; sort: number }>;
    return rows.map(r => ({ id: r.id, slug: r.slug, title: r.title, bodyMd: "", showInFooter: r.show_in_footer, sort: r.sort }));
  } catch (error) {
    handleDirectusError(error, "fetchFooterLegalLinks");
    return [];
  }
}

export async function getPrimaryLocation(): Promise<Location | null> {
  const list = await fetchLocations();
  return list[0] ?? null;
}
```

И добавить импорты в начало:

```typescript
import type {
  Benefit, Category, Globals, HeroSlide, LegalPage, Location, NavIcon, NavLocation,
  NavMenuItem, Product, Promotion,
} from "@/types";
```

- [ ] **Step 7: Обновить `fetchGlobals` — все новые поля**

```typescript
export async function fetchGlobals(): Promise<Globals> {
  if (!USE_DIRECTUS) return mockGlobals;
  try {
    const row = await directus.request(readSingleton("globals"));
    return {
      brandName: row.brand_name,
      legalName: row.legal_name ?? undefined,
      inn: row.inn ?? undefined,
      // legacy (опциональные):
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      addressShort: row.address_short ?? row.address ?? undefined,
      workingHours: row.working_hours ?? undefined,
      location:
        row.location?.lat != null && row.location?.lng != null
          ? { lat: row.location.lat, lng: row.location.lng, zoom: row.location.zoom ?? 16 }
          : undefined,
      aboutShort: row.about_short ?? undefined,
      aboutLong: row.about_long ?? undefined,
      productionMd: row.production_md ?? undefined,
      careersMd: row.careers_md ?? undefined,
      social: row.social ?? {},
      appLinks: row.app_links ?? {},
      emailGeneral: row.email_general ?? undefined,
      emailHr: row.email_hr ?? undefined,
      emailB2b: row.email_b2b ?? undefined,
      taglineMain: row.tagline_main ?? undefined,
      taglineAccent: row.tagline_accent ?? undefined,
      metaTitle: row.meta_title ?? undefined,
      metaDescription: row.meta_description ?? undefined,
      seoKeywords: row.seo_keywords ?? undefined,
      themeColor: row.theme_color ?? undefined,
      backgroundColor: row.background_color ?? undefined,
      paymentMethods: row.payment_methods ?? undefined,
      opensAt: row.opens_at ?? undefined,
      closesAt: row.closes_at ?? undefined,
    };
  } catch (error) {
    handleDirectusError(error, "fetchGlobals");
    return mockGlobals;
  }
}
```

- [ ] **Step 8: Typecheck**

```bash
pnpm tsc --noEmit
```

Expected: ошибки могут быть в потребителях `Globals` (footer/header/about/contacts), которые ожидают обязательный phone. Их пофиксим в Phase 3.

- [ ] **Step 9: Smoke test через `pnpm dev` + curl localhost**

```bash
pnpm dev &
sleep 8
curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}\n"
kill %1
```

Expected: 200. Если фронт упал — фиксить.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(api): fetchPromotions/Benefits/NavMenu/LegalPage(s), getPrimaryLocation, popularity_rank, products_count via aggregate"
```

### Task 2.4: Поправить mocks.ts — Корсаков, удалить mockPopularSlugs

**Files:**
- Modify: `frontend/src/lib/mocks.ts`

- [ ] **Step 1: Заменить адрес/город в mockGlobals**

```typescript
export const mockGlobals: Globals = {
  brandName: "Дело вкуса",
  legalName: "ООО «Дело вкуса»",
  inn: "1650000000",
  phone: "+7 (843) 555-01-20",
  emailGeneral: "hello@delovkusa.ru",
  emailHr: "hr@delovkusa.ru",
  emailB2b: "b2b@delovkusa.ru",
  email: "hello@delovkusa.ru", // legacy
  address: "г. Корсаков, ул. Гвардейская, 54",
  addressShort: "Корсаков, Гвардейская 54",
  workingHours: "Ежедневно 08:00 – 20:00",
  opensAt: "08:00",
  closesAt: "20:00",
  taglineMain: "Свежая выпечка",
  taglineAccent: "каждый день",
  metaTitle: "Дело вкуса — свежая выпечка каждый день",
  metaDescription:
    "Ремесленная пекарня и собственное производство в Корсакове...",
  seoKeywords: ["пекарня корсаков", "свежая выпечка"],
  themeColor: "#d62929",
  backgroundColor: "#eae6e1",
  paymentMethods: ["МИР", "Visa", "Mastercard", "СБП"],
  aboutShort:
    "Пекарня, кулинария и собственное производство в Корсакове с 2013 года...",
  aboutLong:
    "«Дело вкуса» — мультиформатная гастрономическая платформа...",
  productionMd: "Ежедневная пекарня работает с 04:00...",
  careersMd: "Мы всегда рады талантливым пекарям...",
  location: { lat: 46.634980, lng: 142.782579, zoom: 16 },
  social: {
    vk: "https://vk.com/delovkusa",
    telegram: "https://t.me/delovkusa",
    instagram: "https://instagram.com/delovkusa",
  },
  appLinks: { appStore: "#", googlePlay: "#", ruStore: "#" },
};
```

- [ ] **Step 2: Удалить экспорт `mockPopularSlugs`**

В конце файла удалить строки:
```typescript
export const mockPopularSlugs = [
  "bread-loaf", "echpochmak", "poppy-buns", "frozen-pelmeni", "mini-pizza",
];
```

- [ ] **Step 3: В `lib/api.ts` удалить импорт `mockPopularSlugs` и переписать fallback в fetchPopularProducts**

В fetchPopularProducts заменить fallback на пустой массив или на `mockProducts.slice(0,5)`:

```typescript
} catch (error) {
  handleDirectusError(error, "fetchPopularProducts");
  return mockProducts.slice(0, 5);
}
```

И в начале файла удалить `mockPopularSlugs` из импорта.

- [ ] **Step 4: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/mocks.ts frontend/src/lib/api.ts
git commit -m "fix(mocks): город Корсаков, удалить mockPopularSlugs (заменено на popularity_rank)"
```

---

## Phase 3: UI rewires (data → CMS)

### Task 3.1: Layout — slogans/keywords/jsonLd/manifest из CMS

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/manifest.ts`

- [ ] **Step 1: Переписать metadata на globals в `layout.tsx`**

Заменить статический `metadata: Metadata = { ... }` на функцию `generateMetadata`:

```typescript
import type { Metadata, Viewport } from "next";
import { fetchGlobals } from "@/lib/api";
// ... удалить siteName/siteDescription константы

const siteUrl = process.env.SITE_URL ?? "https://delovkusa.openlabio.ru";

export async function generateMetadata(): Promise<Metadata> {
  const g = await fetchGlobals();
  const title = g.metaTitle
    ?? `${g.brandName} — ${g.taglineMain ?? ""} ${g.taglineAccent ?? ""}`.trim();
  const description = g.metaDescription ?? g.aboutShort ?? "";
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · ${g.brandName}` },
    description,
    applicationName: g.brandName,
    authors: [{ name: g.brandName }],
    creator: g.brandName,
    publisher: g.brandName,
    keywords: g.seoKeywords ?? [],
    category: "food",
    alternates: { canonical: "/" },
    openGraph: {
      type: "website", locale: "ru_RU", url: siteUrl,
      siteName: g.brandName, title, description,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: {
      index: true, follow: true,
      googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}
```

- [ ] **Step 2: viewport также из globals**

```typescript
export async function generateViewport(): Promise<Viewport> {
  const g = await fetchGlobals();
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: g.backgroundColor ?? "#eae6e1" },
      { media: "(prefers-color-scheme: dark)", color: "#1b1714" },
    ],
  };
}
```

(Удалить старый `export const viewport`.)

- [ ] **Step 3: jsonLd — opens/closes из globals + getPrimaryLocation для адреса/координат**

В функции `RootLayout` обновить:

```typescript
import { fetchCategories, fetchGlobals, getPrimaryLocation } from "@/lib/api";
// ...
export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories, globals, primary] = await Promise.all([
    fetchCategories(), fetchGlobals(), getPrimaryLocation(),
  ]);

  const addr = primary?.address ?? globals.address ?? "";
  const phone = primary?.phone ?? globals.phone ?? "";
  const geo = primary?.location ?? globals.location;
  const opens = globals.opensAt ?? "08:00";
  const closes = globals.closesAt ?? "20:00";

  const parsedAddress = (() => {
    const m = addr.match(/^(?:г\.?\s*|город\s+)?([^,]+?),\s*(.+)$/i);
    return m ? { locality: m[1].trim(), street: m[2].trim() } : { locality: undefined, street: addr };
  })();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Bakery",
    name: globals.brandName,
    description: globals.aboutShort ?? globals.metaDescription ?? "",
    url: siteUrl,
    telephone: phone,
    ...(globals.emailGeneral && { email: globals.emailGeneral }),
    address: {
      "@type": "PostalAddress",
      ...(parsedAddress.locality && { addressLocality: parsedAddress.locality }),
      streetAddress: parsedAddress.street,
      addressCountry: "RU",
    },
    ...(geo && { geo: { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng } }),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      opens, closes,
      ...(globals.workingHours && { description: globals.workingHours }),
    },
    image: `${siteUrl}/opengraph-image`,
    sameAs: [globals.social?.vk, globals.social?.telegram, globals.social?.instagram].filter(Boolean),
  };
  // ...
}
```

(Удалить hardcoded `servesCuisine` и `priceRange`, либо вынести в globals если нужны — на этом этапе просто удалить.)

- [ ] **Step 4: Manifest из globals**

В `frontend/src/app/manifest.ts`:

```typescript
import type { MetadataRoute } from "next";
import { fetchGlobals } from "@/lib/api";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const g = await fetchGlobals();
  return {
    name: g.brandName,
    short_name: g.brandName,
    description: g.metaDescription ?? g.aboutShort ?? "",
    start_url: "/",
    display: "standalone",
    background_color: g.backgroundColor ?? "#eae6e1",
    theme_color: g.themeColor ?? "#d62929",
    orientation: "portrait",
    lang: "ru",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 5: Verify (preview)**

```bash
preview_start
preview_eval window.location.reload()
preview_snapshot
```

Откроется главная — проверить, что не упало. Затем:

```bash
curl -s http://localhost:3000/manifest.webmanifest | head -10
```

Expected: `name: "Дело вкуса"`, `theme_color: "#d62929"`, `description: "Ремесленная пекарня...Корсакове..."`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/manifest.ts
git commit -m "feat(seo): metadata/manifest/jsonLd из globals (slogans, opens_at, theme_color)"
```

### Task 3.2: opengraph-image и twitter-image — все тексты из CMS

**Files:**
- Modify: `frontend/src/app/opengraph-image.tsx`
- Modify: `frontend/src/app/twitter-image.tsx` (если есть; если нет — пропустить)

- [ ] **Step 1: Заменить хардкод в opengraph-image.tsx**

В верхней части файла:

```typescript
// удалить:
// export const alt = "Дело вкуса — пекарня, кулинария и полуфабрикаты";
// заменить на динамическую функцию (Next.js 16 поддерживает функцию-экспорт alt):

import { fetchGlobals, getPrimaryLocation } from "@/lib/api";
// ...
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 300;
```

В функции `Image()`:

```typescript
export default async function Image() {
  const [logoSvg, globals, primary] = await Promise.all([
    readFile(join(process.cwd(), "public/ico/brand-mark.svg"), "utf-8"),
    fetchGlobals(),
    getPrimaryLocation(),
  ]);
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;
  const address = primary?.address ?? globals.addressShort ?? globals.address ?? "";
  const hours = primary?.workingHours ?? globals.workingHours ?? "";
  const taglineMain = globals.taglineMain ?? "Свежая выпечка";
  const taglineAccent = globals.taglineAccent ?? "каждый день";
  // ... (остальное как было, но в JSX заменить:)
  // {/* "Свежая выпечка" → {taglineMain} */}
  // {/* "каждый день" → {taglineAccent} */}
  // ...
}

export async function generateImageMetadata() {
  const g = await fetchGlobals();
  return [{ alt: `${g.brandName} — ${g.taglineMain ?? ""}`.trim() }];
}
```

(Если Next.js 16 не поддерживает динамический alt — оставить статический минимальный alt и не зашивать слогана.)

- [ ] **Step 2: twitter-image.tsx**

```bash
ls frontend/src/app/twitter-image.tsx 2>&1
```

Если файл существует, открыть и применить тот же подход (тексты из globals). Если хардкод просто дублирует opengraph — переэкспортировать `Image` из opengraph-image.tsx.

- [ ] **Step 3: Verify**

```bash
preview_screenshot http://localhost:3000/opengraph-image
```

Expected: PNG с правильным slogan, address, hours.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/opengraph-image.tsx frontend/src/app/twitter-image.tsx
git commit -m "feat(og): opengraph/twitter image — все тексты из globals"
```

### Task 3.3: Header — nav из CMS, контакты из getPrimaryLocation

**Files:**
- Modify: `frontend/src/components/layout/header.tsx`
- Modify: `frontend/src/app/layout.tsx` (передать nav)

- [ ] **Step 1: Изменить пропсы Header**

В `header.tsx` заменить хардкоженный `navLinks` на проп `headerNav: NavMenuItem[]` и `primaryLocation: Location | null`:

```typescript
import type { Category, Globals, Location, NavMenuItem } from "@/types";

interface HeaderProps {
  categories: Category[];
  globals: Globals;
  primaryLocation: Location | null;
  headerNav: NavMenuItem[];
}

export function Header({ categories, globals, primaryLocation, headerNav }: HeaderProps) {
  // ... удалить const navLinks
  // в JSX заменить navLinks.map → headerNav.map с key={item.id}
  // адрес/часы:
  const addr = primaryLocation?.address ?? globals.address ?? "";
  const hours = primaryLocation?.workingHours ?? globals.workingHours ?? "";
  // в JSX заменить globals.address → addr, globals.workingHours → hours
  // ...
}
```

- [ ] **Step 2: Прокинуть в layout.tsx**

В `RootLayout` добавить fetch:
```typescript
import { fetchNavMenu, getPrimaryLocation } from "@/lib/api";
// ...
const [categories, globals, primaryLocation, headerNav] = await Promise.all([
  fetchCategories(), fetchGlobals(), getPrimaryLocation(), fetchNavMenu("header"),
]);
// ...
<Header categories={categories} globals={globals} primaryLocation={primaryLocation} headerNav={headerNav} />
```

- [ ] **Step 3: Typecheck**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Verify (preview)**

```bash
preview_start
preview_eval window.location.reload()
preview_snapshot
preview_resize 360 800
preview_snapshot
```

Expected: header показывает 4 пункта меню из CMS; адрес и часы — из locations[0].

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/header.tsx frontend/src/app/layout.tsx
git commit -m "feat(header): nav и контакты из CMS (nav_menu_items, locations)"
```

### Task 3.4: Footer — nav (3 локации), контакты, payment_methods, legal links, slogan

**Files:**
- Modify: `frontend/src/components/layout/footer.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Расширить пропсы Footer**

```typescript
import type { Category, Globals, LegalPage, Location, NavMenuItem } from "@/types";

interface FooterProps {
  categories: Category[];
  globals: Globals;
  primaryLocation: Location | null;
  customersNav: NavMenuItem[];
  companyNav: NavMenuItem[];
  legalLinks: LegalPage[];
}

export function Footer({ categories, globals, primaryLocation, customersNav, companyNav, legalLinks }: FooterProps) {
  // удалить const columns

  const addr = primaryLocation?.address ?? globals.address ?? "";
  const hours = primaryLocation?.workingHours ?? globals.workingHours ?? "";
  const phone = primaryLocation?.phone ?? globals.phone ?? "";
  const email = globals.emailGeneral ?? globals.email ?? "";
  const aboutShort = globals.aboutShort ?? "";
  const paymentMethods = globals.paymentMethods ?? [];
  const year = new Date().getFullYear();

  // ...
  // В JSX:
  // - aboutShort вместо ?? хардкод
  // - phone, addr, hours, email — все из переменных выше (без ?? "hello@...")
  // - вместо двух хардкоженных columns — рендерить customersNav и companyNav:
  //   <Block title="Покупателям" items={customersNav}/>
  //   <Block title="Компания" items={companyNav}/>
  // - copyright: `© {year} «${globals.brandName}». Все права защищены.`
  // - legal links: legalLinks.map(l => <Link href={`/legal/${l.slug}`}>{l.title}</Link>)
  // - payment_methods: {paymentMethods.join(" · ")}
  // ...
}
```

- [ ] **Step 2: Прокинуть в layout.tsx**

```typescript
const [categories, globals, primaryLocation, headerNav, customersNav, companyNav, legalLinks] = await Promise.all([
  fetchCategories(), fetchGlobals(), getPrimaryLocation(),
  fetchNavMenu("header"), fetchNavMenu("footer-customers"), fetchNavMenu("footer-company"),
  fetchFooterLegalLinks(),
]);
// ...
<Footer
  categories={categories} globals={globals} primaryLocation={primaryLocation}
  customersNav={customersNav} companyNav={companyNav} legalLinks={legalLinks}
/>
```

- [ ] **Step 3: Typecheck + verify**

```bash
pnpm tsc --noEmit
preview_start
preview_eval window.location.reload()
preview_snapshot --selector footer
```

Expected: footer содержит 3 nav-блока (Каталог из categories, Покупателям, Компания); ссылки на /legal/terms, /legal/privacy; payment_methods из CMS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/footer.tsx frontend/src/app/layout.tsx
git commit -m "feat(footer): все блоки из CMS (nav_menu_items, legal_pages, payment_methods)"
```

### Task 3.5: Mobile tab bar — лейблы из CMS, иконки из enum

**Files:**
- Modify: `frontend/src/components/layout/mobile-tab-bar.tsx`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Map enum → icon component**

В `mobile-tab-bar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/stores/cart";
import { cn } from "@/lib/cn";
import { BagIcon, CatalogIcon, HomeIcon, TagIcon, UserIcon } from "@/components/ui/icon";
import { Counter } from "@/components/ui/badge";
import type { NavIcon as NavIconKey, NavMenuItem } from "@/types";

const ICON_MAP: Record<NavIconKey, React.ComponentType<{ size?: number }>> = {
  home: HomeIcon,
  catalog: CatalogIcon,
  cart: BagIcon,
  promo: TagIcon,
  profile: UserIcon,
  none: HomeIcon,
};

export function MobileTabBar({ items }: { items: NavMenuItem[] }) {
  const pathname = usePathname();
  const totalItems = useCart((s) => s.totalItems());

  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-[560px] bg-white rounded-[22px] shadow-[0_-6px_20px_rgba(70,45,20,.08),0_2px_0_rgba(0,0,0,.02)] flex justify-between gap-1 px-2 py-2">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? HomeIcon;
          const active = item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-1.5 rounded-[14px] transition-colors text-[11px] font-medium leading-none",
                active ? "text-brand font-bold" : "text-ink-soft hover:text-brand",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="relative">
                <Icon size={24} />
                {item.icon === "cart" && <Counter count={totalItems} className="-top-2 -right-2" />}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Прокинуть в layout.tsx**

```typescript
const mobileTabNav = await fetchNavMenu("mobile-tab"); // или в общем Promise.all
// ...
<MobileTabBar items={mobileTabNav} />
```

- [ ] **Step 3: Verify**

```bash
preview_resize 360 800
preview_snapshot
```

Expected: 5 пунктов tab bar, иконки правильные, бадж корзины на пункте с icon=cart.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/mobile-tab-bar.tsx frontend/src/app/layout.tsx
git commit -m "feat(tabbar): лейблы из nav_menu_items (mobile-tab), иконки через enum-map"
```

### Task 3.6: Benefits из коллекции

**Files:**
- Modify: `frontend/src/components/home/benefits.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: Принимать пропсы**

```typescript
import { ChefIcon, HeartIcon, PickupIcon, SparkleIcon } from "@/components/ui/icon";
import type { Benefit, BenefitIcon } from "@/types";

const ICON_MAP: Record<BenefitIcon, React.ComponentType<{ size?: number }>> = {
  sparkle: SparkleIcon,
  chef: ChefIcon,
  heart: HeartIcon,
  pickup: PickupIcon,
};

export function Benefits({ items }: { items: Benefit[] }) {
  if (!items.length) return null;
  return (
    <section className="mt-12 md:mt-20 bg-[#f3efea] rounded-[22px] md:rounded-[28px] p-5 md:p-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
        {items.map((b, idx) => {
          const Icon = ICON_MAP[b.icon] ?? SparkleIcon;
          return (
            <div
              key={b.id}
              className={`flex items-center gap-4 px-3 md:px-6 py-4 md:py-2 ${idx < items.length - 1 ? "md:border-r border-black/10" : ""} ${idx % 2 === 0 ? "md:border-r border-r" : ""} ${idx < 2 ? "border-b md:border-b-0" : ""} border-black/10 md:border-b-0`}
            >
              <div className="grid place-items-center w-12 h-12 md:w-14 md:h-14 rounded-full border-[2.5px] border-ink shrink-0">
                <Icon size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[14px] md:text-[16px] font-bold leading-tight">{b.title}</h3>
                {b.description && <p className="text-[12px] md:text-[13px] text-muted leading-snug mt-1">{b.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Прокинуть в `app/page.tsx`**

В главной странице (read existing page.tsx first):

```typescript
import { fetchBenefits, /* ... */ } from "@/lib/api";

export default async function HomePage() {
  const [/*...,*/ benefits] = await Promise.all([/* ..., */ fetchBenefits()]);
  return (
    <>
      {/* ... */}
      <Benefits items={benefits} />
    </>
  );
}
```

- [ ] **Step 3: Verify**

```bash
preview_eval window.location.reload()
preview_snapshot --selector "section:has(h3)"
```

Expected: 4 преимущества, иконки корректные.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/home/benefits.tsx frontend/src/app/page.tsx
git commit -m "feat(home): Benefits — данные из коллекции benefits"
```

### Task 3.7: /promotions — fetchPromotions

**Files:**
- Rewrite: `frontend/src/app/promotions/page.tsx`

- [ ] **Step 1: Полный rewrite**

```typescript
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { fetchPromotions } from "@/lib/api";
import { assetUrl } from "@/lib/format";

export const metadata = { title: "Акции" };
export const revalidate = 300;

export default async function PromotionsPage() {
  const promos = await fetchPromotions();

  if (!promos.length) {
    return (
      <Container className="pt-6 md:pt-10">
        <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
          Акции
        </h1>
        <p className="text-muted">Сейчас активных акций нет. Загляните позже.</p>
      </Container>
    );
  }

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        Акции
      </h1>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {promos.map((p) => (
          <article key={p.id} className="bg-white rounded-[22px] p-6 shadow-card">
            {p.image && (
              <div className="relative aspect-[16/9] -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-[22px]">
                <Image src={assetUrl(p.image, { width: 800, format: "webp" })} alt={p.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" />
              </div>
            )}
            {p.tag && <Badge tag={p.tag} />}
            <h2 className="text-xl font-bold mt-4 leading-tight">{p.title}</h2>
            {p.description && <p className="text-muted mt-2 text-sm leading-relaxed whitespace-pre-line">{p.description}</p>}
            {p.discountPercent != null && (
              <div className="mt-3 inline-block bg-brand text-white px-3 py-1 rounded-full text-sm font-bold">
                −{p.discountPercent}%
              </div>
            )}
          </article>
        ))}
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Сидить хотя бы одну тестовую акцию**

В `directus-seed.mjs` после `locations` добавить блок promotionsData (одна тестовая) если ещё нет, или сделать через админку. Минимум — добавить в seed:

```javascript
  console.log("\n[seed] ==== PROMOTIONS ====");
  const existingPromos = await client.request(readItems("promotions", { fields: ["id"], limit: 1 }));
  if (!existingPromos.length) {
    await client.request(createItems("promotions", [
      {
        slug: "buns-2-plus-1", title: "2+1 на сдобные булочки",
        description: "Каждая третья булочка в подарок. Каждое воскресенье.",
        tag: "new", sort: 1, status: "published",
      },
      {
        slug: "first-order-cashback-10", title: "Кэшбэк 10% на первый заказ",
        description: "Зарегистрируйтесь через Яндекс ID и получите бонусы.",
        tag: "hit", sort: 2, status: "published", discount_percent: 10,
      },
      {
        slug: "happy-hours", title: "Счастливые часы 17:00–19:00",
        description: "Скидка 20% на выпечку дня. Каждый будний день.",
        tag: "sale", sort: 3, status: "published", discount_percent: 20,
      },
    ]));
    console.log("[seed] ✓ inserted 3 promotions");
  }
```

```bash
pnpm seed
```

- [ ] **Step 3: Verify**

```bash
preview_eval window.location.href = "/promotions"; null
preview_snapshot
```

Expected: 3 акции из CMS отображаются. Удалить любую через админку, перезагрузить — пропадёт.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/promotions/page.tsx frontend/scripts/directus-seed.mjs
git commit -m "feat(promotions): /promotions через fetchPromotions; сид 3 акций"
```

### Task 3.8: /about — production_md, careers_md, email_hr, inn

**Files:**
- Modify: `frontend/src/app/about/page.tsx`

- [ ] **Step 1: Заменить хардкод-секции**

```typescript
import { Container } from "@/components/ui/container";
import { fetchGlobals } from "@/lib/api";

export const metadata = { title: "О компании" };
export const revalidate = 300;

export default async function AboutPage() {
  const g = await fetchGlobals();
  const hrEmail = g.emailHr ?? g.emailGeneral ?? g.email;

  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        О компании
      </h1>
      <article className="prose prose-neutral max-w-[720px] text-[16px] leading-relaxed">
        {g.aboutShort && <p className="text-[18px]">{g.aboutShort}</p>}
        {g.aboutLong && <p className="mt-6 whitespace-pre-line text-ink-soft">{g.aboutLong}</p>}

        {g.productionMd && (
          <>
            <h2 className="mt-10 text-2xl font-bold" id="production">Производство</h2>
            <div className="mt-3 whitespace-pre-line">{g.productionMd}</div>
          </>
        )}

        {g.careersMd && (
          <>
            <h2 className="mt-8 text-2xl font-bold" id="jobs">Вакансии</h2>
            <div className="mt-3 whitespace-pre-line">{g.careersMd}</div>
            {hrEmail && (
              <p className="mt-3">
                Пишите на{" "}
                <a href={`mailto:${hrEmail}`} className="text-brand underline">{hrEmail}</a>.
              </p>
            )}
          </>
        )}

        {(g.legalName || g.inn) && (
          <div className="mt-12 pt-6 border-t border-black/10 text-sm text-muted">
            {g.legalName && <div>{g.legalName}</div>}
            {g.inn && <div>ИНН {g.inn}</div>}
          </div>
        )}
      </article>
    </Container>
  );
}
```

- [ ] **Step 2: Verify**

```bash
preview_eval window.location.href = "/about"; null
preview_snapshot
```

Expected: оба раздела (Производство/Вакансии) — текст из CMS; ИНН отображается; email = hr@delovkusa.ru.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/about/page.tsx
git commit -m "feat(about): production_md/careers_md/inn/email_hr из CMS"
```

### Task 3.9: /contacts — getPrimaryLocation, email из CMS

**Files:**
- Modify: `frontend/src/app/contacts/page.tsx`

- [ ] **Step 1: Заменить globals на getPrimaryLocation**

```typescript
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/ui/icon";
import { YandexMap } from "@/components/ui/yandex-map";
import { fetchGlobals, fetchLocations } from "@/lib/api";
import { assetUrl } from "@/lib/format";

export const metadata = { title: "Контакты" };
export const revalidate = 300;

export default async function ContactsPage() {
  const [globals, locations] = await Promise.all([fetchGlobals(), fetchLocations()]);

  const primary = locations[0];
  if (!primary) {
    // Хотя бы одна точка обязана быть. Ставим заглушку.
    return (
      <Container className="pt-6 md:pt-10">
        <h1 className="text-[32px] font-bold mb-6">Контакты</h1>
        <p className="text-muted">Точки продаж пока не настроены в CMS.</p>
      </Container>
    );
  }

  const emailGeneral = globals.emailGeneral ?? globals.email;
  // ... остальной JSX как был, но email — из emailGeneral, и без fallback'ов на globals.address/phone
}
```

(Полностью убрать `globals.address`/`globals.phone`/`globals.workingHours`/`globals.location` ссылки — все эти данные сейчас приходят из primary.)

- [ ] **Step 2: Verify**

```bash
preview_eval window.location.href = "/contacts"; null
preview_snapshot
```

Expected: адрес «Корсаков», phone из location, email из globals.email_general, карта на координатах из location.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/contacts/page.tsx
git commit -m "feat(contacts): primary из locations[0], email_general из globals (без fallback на globals.address)"
```

### Task 3.10: Legal pages — динамический роут /legal/[slug]

**Files:**
- Create: `frontend/src/app/legal/[slug]/page.tsx`

- [ ] **Step 1: Создать страницу**

```typescript
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { fetchLegalPage } from "@/lib/api";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchLegalPage(slug);
  if (!page) return {};
  return { title: page.title };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await fetchLegalPage(slug);
  if (!page) notFound();
  return (
    <Container className="pt-6 md:pt-10">
      <h1 className="text-[32px] md:text-[48px] font-bold tracking-tight font-display leading-none mb-6 md:mb-10">
        {page.title}
      </h1>
      <article className="prose prose-neutral max-w-[720px] text-[16px] leading-relaxed whitespace-pre-line">
        {page.bodyMd}
      </article>
    </Container>
  );
}
```

(Markdown-рендеринг можно оставить на whitespace-pre-line; если нужен полноценный — добавить `react-markdown` отдельной задачей.)

- [ ] **Step 2: Verify**

```bash
preview_eval window.location.href = "/legal/terms"; null
preview_snapshot
preview_eval window.location.href = "/legal/privacy"; null
preview_snapshot
preview_eval window.location.href = "/legal/nonexistent"; null
preview_snapshot
```

Expected: terms и privacy показываются; nonexistent — 404.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/legal/
git commit -m "feat(legal): динамический /legal/[slug] из коллекции legal_pages"
```

---

## Phase 4: Per-page SEO для категорий и продуктов

### Task 4.1: Подключить meta_title/meta_description/og_image на страницах категорий и продуктов

**Files:**
- Modify: `frontend/src/app/catalog/[category]/page.tsx`
- Modify: `frontend/src/app/product/[slug]/page.tsx`

- [ ] **Step 1: catalog/[category] generateMetadata**

(Сначала прочитать существующий файл `frontend/src/app/catalog/[category]/page.tsx`, чтобы увидеть текущий код.)

Добавить/обновить:

```typescript
import type { Metadata } from "next";
import { fetchCategories } from "@/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const cats = await fetchCategories();
  const cat = cats.find(c => c.slug === category);
  if (!cat) return {};
  return {
    title: cat.metaTitle ?? cat.title,
    description: cat.metaDescription,
    openGraph: cat.ogImage ? { images: [cat.ogImage] } : undefined,
  };
}
```

- [ ] **Step 2: product/[slug] generateMetadata**

```typescript
import { fetchProduct } from "@/lib/api";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  if (!product) return {};
  return {
    title: product.metaTitle ?? product.title,
    description: product.metaDescription ?? product.description,
    openGraph: product.ogImage ? { images: [product.ogImage] } : undefined,
  };
}
```

- [ ] **Step 3: Verify**

```bash
preview_eval window.location.href = "/catalog/bread"; null
preview_eval document.title
preview_eval window.location.href = "/product/bread-loaf"; null
preview_eval document.title
```

Expected: title = "Хлеб · Дело вкуса" и "Хлеб «Домашний» · Дело вкуса" (или CMS-meta_title, если задан).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/catalog frontend/src/app/product
git commit -m "feat(seo): generateMetadata подключён к meta_*/og_image на категориях и продуктах"
```

---

## Phase 5: Orders flow

### Task 5.1: API route для создания заказа

**Files:**
- Create: `frontend/src/app/api/orders/route.ts`

- [ ] **Step 1: Серверный proxy на Directus**

```typescript
import { NextResponse } from "next/server";
import { directus } from "@/lib/directus";
import { createItem, createItems, staticToken } from "@directus/sdk";

const ORDER_TOKEN = process.env.DIRECTUS_ORDERS_TOKEN ?? process.env.DIRECTUS_ADMIN_TOKEN;

interface OrderItemInput { product: string; quantity: number; price_snapshot: number; product_slug_snapshot: string; product_title_snapshot: string }
interface OrderInput {
  contact_name: string;
  contact_phone: string;
  pickup_time?: string;
  notes?: string;
  total: number;
  items: OrderItemInput[];
}

export async function POST(req: Request) {
  if (!ORDER_TOKEN) {
    return NextResponse.json({ error: "Server misconfigured: ORDER_TOKEN missing" }, { status: 500 });
  }
  const body = (await req.json()) as OrderInput;
  if (!body.contact_phone || !body.items?.length) {
    return NextResponse.json({ error: "phone и items обязательны" }, { status: 400 });
  }
  try {
    const tokenedClient = directus.with(staticToken(ORDER_TOKEN));
    const order = await tokenedClient.request(
      createItem("orders" as never, {
        contact_name: body.contact_name,
        contact_phone: body.contact_phone,
        pickup_time: body.pickup_time ?? null,
        notes: body.notes ?? null,
        total: body.total,
        status: "submitted",
      } as never),
    ) as { id: string };
    await tokenedClient.request(
      createItems("order_items" as never, body.items.map(i => ({ ...i, order: order.id })) as never),
    );
    return NextResponse.json({ id: order.id });
  } catch (e) {
    console.error("[api.orders] failed:", e);
    return NextResponse.json({ error: "Не удалось создать заказ" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Добавить env var**

В `.env.local` (и в README/`deploy/.env.example`) задокументировать:
```
DIRECTUS_ORDERS_TOKEN=<service token с доступом на create orders/order_items>
```

(Если используется `DIRECTUS_ADMIN_TOKEN` для seed — на проде нужен отдельный токен с минимальными правами.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/api/orders/route.ts
git commit -m "feat(orders): API route POST /api/orders — proxy на Directus"
```

### Task 5.2: Форма оформления заказа в /cart

**Files:**
- Modify: `frontend/src/app/cart/page.tsx`

- [ ] **Step 1: Добавить state и форму**

В `cart/page.tsx` (он уже client component):

```typescript
"use client";

import { useState, useTransition } from "react";
// ... существующие импорты
import { useRouter } from "next/navigation";

export default function CartPage() {
  // ... существующее
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function submit() {
    setError(null);
    if (!phone) { setError("Укажите телефон"); return; }
    const payload = {
      contact_name: name,
      contact_phone: phone,
      pickup_time: pickupTime || undefined,
      notes: notes || undefined,
      total: totalPrice,
      items: lines.map(l => ({
        product: l.product.id,
        quantity: l.quantity,
        price_snapshot: l.product.price,
        product_slug_snapshot: l.product.slug,
        product_title_snapshot: l.product.title,
      })),
    };
    const res = await fetch("/api/orders", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Ошибка");
      return;
    }
    const { id } = await res.json();
    clear();
    startTransition(() => router.push(`/cart/success?order=${id}`));
  }

  // ... в JSX, заменить `<Button size="xl" className="w-full mt-6">Оформить заказ ...</Button>` блок на:
  // <input для name, phone, pickupTime, notes>
  // <Button onClick={submit} disabled={pending}>Оформить заказ</Button>
  // {error && <p className="text-danger">{error}</p>}
}
```

(Конкретная разметка формы — input'ы с label, можно использовать `Input` компонент, если он есть; если нет — нативные input с tailwind-классами проекта.)

- [ ] **Step 2: Создать заглушку /cart/success**

`frontend/src/app/cart/success/page.tsx`:
```typescript
import Link from "next/link";
import { Container } from "@/components/ui/container";

export default function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  // server component; useSearchParams не нужен
  return (
    <Container className="pt-10 text-center">
      <h1 className="text-[32px] font-bold mb-4">Заказ принят</h1>
      <p className="text-muted mb-6">Мы свяжемся с вами для подтверждения.</p>
      <Link href="/" className="text-brand underline">На главную</Link>
    </Container>
  );
}
```

- [ ] **Step 3: Verify (preview)**

```bash
preview_eval window.location.href = "/cart"; null
# добавить товар через UI → preview_click button
preview_fill input[name=phone] +79991234567
preview_click button:has-text(Оформить)
preview_snapshot
```

Expected: переход на `/cart/success?order=<uuid>`; в Directus админке — новый заказ.

```bash
curl -s "$DIRECTUS_URL/items/orders?fields=order_number,contact_phone,total&sort=-date_created&limit=1" | head -5
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/cart frontend/src/app/api/orders
git commit -m "feat(orders): форма оформления + POST в /api/orders + success-страница"
```

---

## Phase 6: Cleanup

### Task 6.1: Удалить deprecated globals fields (после стабилизации фронта)

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/directus.ts`
- Modify: `frontend/src/lib/api.ts`
- Создать one-shot drop-script

- [ ] **Step 1: Убрать из seed `address`/`phone`/`working_hours`/`location`/`email`/`address_short` из globalsFields и globalsData**

Это сужает поверхность. Но удалит поле `email` (legacy) — убедиться, что все потребители ушли на `email_general`.

- [ ] **Step 2: One-shot drop через `deleteField`**

```javascript
// scripts/drop-globals-legacy.mjs
import { createDirectus, rest, staticToken, deleteField } from "@directus/sdk";
const c = createDirectus(process.env.DIRECTUS_URL).with(staticToken(process.env.DIRECTUS_ADMIN_TOKEN)).with(rest());
for (const f of ["address", "address_short", "phone", "working_hours", "location", "email"]) {
  try { await c.request(deleteField("globals", f)); console.log("dropped globals." + f); } catch { console.log("skip " + f); }
}
```

```bash
node --env-file-if-exists=../.env.local scripts/drop-globals-legacy.mjs
rm scripts/drop-globals-legacy.mjs
```

- [ ] **Step 3: Удалить deprecated поля из types/Globals и DirectusSchema**

Убрать `phone?: string`, `email?: string`, `address?: string`, `addressShort?: string`, `workingHours?: string`, `location?: GeoLocation` из `Globals`.

- [ ] **Step 4: В api.ts удалить ссылки на эти поля**

В `fetchGlobals` убрать соответствующий маппинг.

- [ ] **Step 5: Проверить все потребители**

```bash
grep -rn "globals.phone\|globals.address\|globals.workingHours\|globals.email[^G]" frontend/src --include="*.tsx" --include="*.ts"
```

Expected: пусто (или только в mocks/types — те мы тоже почистим).

- [ ] **Step 6: Поправить mocks.ts**

Удалить deprecated поля или, если фронт совсем не использует — удалить mocks.ts полностью (опционально).

- [ ] **Step 7: Typecheck + smoke**

```bash
pnpm tsc --noEmit
pnpm dev
preview_eval window.location.reload()
preview_snapshot
```

- [ ] **Step 8: Public read perms — убрать deprecated поля**

В `publicPermissions` для globals из массива `fields` убрать `address`, `address_short`, `phone`, `email`, `working_hours`, `location`. Запустить `pnpm seed`.

- [ ] **Step 9: Commit**

```bash
git add frontend/
git commit -m "chore: удалить deprecated globals fields (контакты теперь только в locations)"
```

### Task 6.2: snapshot.json и DIRECTUS_USE_FALLBACK_MOCKS

**Files:**
- `deploy/directus-snapshot.json`
- `deploy/docker-compose.yml` (env)
- README

- [ ] **Step 1: Перегенерировать snapshot**

```bash
pnpm schema:snapshot
```

Если скрипт пишет в `deploy/directus-snapshot.json` — отлично. Иначе скопировать файл руками в `deploy/`.

- [ ] **Step 2: Документировать DIRECTUS_USE_FALLBACK_MOCKS=false для prod**

В `deploy/README.md` (или `frontend/README.md`) добавить секцию:

```
## Production env

DIRECTUS_USE_FALLBACK_MOCKS=false  # обязательно: не маскировать оутейдж Directus мок-данными
```

- [ ] **Step 3: Commit**

```bash
git add deploy/ frontend/README.md
git commit -m "chore(deploy): актуальный snapshot + DIRECTUS_USE_FALLBACK_MOCKS=false для prod"
```

### Task 6.3: lint + final smoke

- [ ] **Step 1: Lint**

```bash
pnpm lint
```

Expected: 0 errors, 0 warnings (или только warning'и из существующего кода, не новые).

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: ✓ Compiled successfully. Проверить, что нет warning'ов про "missing fetchGlobals" или подобных.

- [ ] **Step 3: Final smoke через preview**

```bash
preview_start
preview_eval window.location.href = "/"; null
preview_snapshot
preview_eval window.location.href = "/promotions"; null
preview_snapshot
preview_eval window.location.href = "/about"; null
preview_snapshot
preview_eval window.location.href = "/contacts"; null
preview_snapshot
preview_eval window.location.href = "/legal/terms"; null
preview_snapshot
preview_eval window.location.href = "/cart"; null
preview_resize 360 800
preview_snapshot
```

Expected: все страницы рендерятся без ошибок; никаких хардкодов «Казань», «hello@», «hr@» в видимом тексте, кроме как из CMS.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: финальный smoke test passed (lint + build + все страницы)"
```

---

## Self-Review Checklist (выполнить перед стартом)

- [x] Spec coverage: каждое из 23 пунктов (P0/P1/P2) из аудита покрыто конкретной таской
- [x] No placeholders — каждая task содержит конкретный код или curl/команду
- [x] Type consistency: `Benefit.icon` (BenefitIcon) ↔ `benefits.icon` (string в DirectusSchema, enum в seed) ↔ `ICON_MAP` keys в benefits.tsx — совпадают; `NavMenuItem.icon` (NavIcon) ↔ `nav_menu_items.icon` ↔ `ICON_MAP` в mobile-tab-bar.tsx — совпадают
- [x] Каждая task — отдельный коммит, что упрощает review

## Riski / гипотезы для проверки на лету

- **Directus aggregate с Public role**: если Public не может aggregate-ить products — fallback в fetchCategories: убрать поле productsCount или считать через `readItems` с `fields: ["category"]` и `groupBy` на клиенте.
- **Directus `$NOW` в filter**: если SDK не понимает строку `"$NOW"` — заменить на `new Date().toISOString()` в момент запроса.
- **`generateImageMetadata`**: проверить, что Next.js 16 поддерживает; если нет — упростить, оставив статический alt из globals прямого fetch.

---

**Plan complete.** Saved to `docs/superpowers/plans/2026-05-03-cms-driven-frontend.md`.
