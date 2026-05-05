# Расширение меню и категорий — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить 2 новые категории (`breakfast`, `snacks`) и 35 новых товаров из `pre/меню.csv` в Directus CMS, не трогая существующие 23 товара. Опубликовать на сайте через ISR-ревалидацию.

**Architecture:** Расширяем массивы `categoriesData` и `productsData` в существующем идемпотентном скрипте `frontend/scripts/directus-seed.mjs`. Сид сам пропускает уже созданные записи (фильтр по `slug`). Дополнительно добавляем функцию `ensureCategoryUpdates()` для обновления `sort` и `subtitle` существующих категорий, поскольку seed вставляет, но не обновляет существующие. Вызываем ревалидацию ISR через GET `/api/revalidate?secret=...&collection=products`.

**Tech Stack:** Node.js (script), `@directus/sdk` v21, Next.js 16 ISR, Directus 11, `pnpm` для запуска скриптов.

**Spec:** [docs/superpowers/specs/2026-05-05-menu-categories-expansion-design.md](../specs/2026-05-05-menu-categories-expansion-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `frontend/scripts/directus-seed.mjs` | modify | Расширить `categoriesData` и `productsData`, добавить `ensureCategoryUpdates()` |
| `docs/superpowers/specs/2026-05-05-menu-categories-expansion-design.md` | reference only | Дизайн-документ |

Никаких новых файлов. Один точечный апдейт сида + 4 шага верификации/деплоя.

---

## Pre-flight: Контекст

**Endpoint:** `https://delovkusa.openlabio.ru/directus`

**Креды:** `.env.local` в корне репо (loaded via `--env-file-if-exists`)
```
direstus_admin_token=Zf7fhgFHEp8Lb5Vj-BY75my8Ug2SXmSl
```
Seed на строке 56-59 принимает `DIRECTUS_ADMIN_TOKEN || ADMIN_TOKEN || direstus_admin_token`.

**Revalidate secret:** в `deploy/.env`:
```
REVALIDATE_SECRET=d32d1e4b719c36e3f1772eb1de52f1cf03be3521edc4ed5c
```

**Текущее состояние (на момент написания плана):**
- 6 категорий в Directus (sort 1..6: bread, savory-pastry, sweet-pastry, ready-meals, frozen, drinks)
- 23 товара
- Frontend на Next.js 16 с ISR (60s), реагирует на `/api/revalidate`

**Идемпотентность seed:**
- `categoriesData`: фильтр по slug в Set `existingCats` (line 1657-1658) — не вставляет, что уже есть
- `productsData`: фильтр по slug в Set `existingProductSlugs` (line 1681-1682) — не вставляет, что уже есть
- **НО:** seed не обновляет sort/subtitle существующих категорий — добавляем `ensureCategoryUpdates()`

---

### Task 1: Расширить `categoriesData` в seed (8 записей с новыми sort)

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs:524-531`

- [ ] **Step 1: Заменить блок `categoriesData` целиком**

В файле `frontend/scripts/directus-seed.mjs` найти блок:
```js
const categoriesData = [
  { slug: "bread", title: "Хлеб", subtitle: "Ремесленный каждый день", sort: 1 },
  { slug: "savory-pastry", title: "Сытная выпечка", subtitle: "Пирожки, чебуреки, беляши", sort: 2 },
  { slug: "sweet-pastry", title: "Сладкая выпечка", subtitle: "Сдоба с маком и творогом", sort: 3 },
  { slug: "ready-meals", title: "Готовые блюда", subtitle: "Гриль, шаурма, обеды", sort: 4 },
  { slug: "frozen", title: "Полуфабрикаты", subtitle: "Ручная лепка", sort: 5 },
  { slug: "drinks", title: "Напитки", subtitle: "Соки, лимонады, чай", sort: 6 },
];
```

Заменить на:
```js
const categoriesData = [
  { slug: "bread", title: "Хлеб", subtitle: "Ремесленный каждый день", sort: 1 },
  { slug: "savory-pastry", title: "Сытная выпечка", subtitle: "Пирожки, чебуреки, беляши", sort: 2 },
  { slug: "sweet-pastry", title: "Сладкая выпечка", subtitle: "Сдоба с маком и творогом", sort: 3 },
  { slug: "breakfast", title: "Завтраки", subtitle: "Сытно с утра — рабочие и туристические", sort: 4 },
  { slug: "snacks", title: "Закуски / Фри", subtitle: "Хрустящее на ходу", sort: 5 },
  { slug: "ready-meals", title: "Готовые блюда", subtitle: "Гриль, шаурма, обеды", sort: 6 },
  { slug: "frozen", title: "Полуфабрикаты", subtitle: "Ручная лепка", sort: 7 },
  { slug: "drinks", title: "Напитки", subtitle: "Чай, кофе, компот, лимонады", sort: 8 },
];
```

Изменения:
- Добавлены `breakfast` (sort=4), `snacks` (sort=5)
- Сдвинуты sort: `ready-meals` 4→6, `frozen` 5→7, `drinks` 6→8
- У `drinks` обновлён subtitle: «Соки, лимонады, чай» → «Чай, кофе, компот, лимонады»

- [ ] **Step 2: Проверить синтаксис**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47/frontend
node --check scripts/directus-seed.mjs
```

Expected: команда отрабатывает без вывода (exit 0). Если синтаксическая ошибка — покажет строку.

- [ ] **Step 3: Не коммитим (промежуточный шаг)** — финальный коммит после Task 3.

---

### Task 2: Расширить `productsData` в seed (35 новых записей)

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs:557` (вставка перед закрывающей `]`)

- [ ] **Step 1: Вставить 35 новых записей в `productsData`**

В файле `frontend/scripts/directus-seed.mjs` найти строку 556 — последний существующий продукт `drinks-set`:
```js
  { slug: "drinks-set", title: "Лимонад «Тархун»", category: "drinks", image: "drinks-set", price: 120, weight: "0.5 л", available: true, description: "Натуральный лимонад без красителей." },
];
```

Перед закрывающей `];` (на строке 557) вставить 35 новых записей. Полный список:

```js
  // ===== Расширение по pre/меню.csv (2026-05-05) =====
  // Сытная выпечка (+17)
  { slug: "cheburek-pork-beef", title: "Чебурек (свинина-говядина)", category: "savory-pastry", price: 160, available: true },
  { slug: "cheburek-chicken", title: "Чебурек (курица)", category: "savory-pastry", price: 160, available: true },
  { slug: "belyash-chicken", title: "Беляш (курица)", category: "savory-pastry", price: 160, available: true },
  { slug: "belyash-pork-beef", title: "Беляш (свинина-говядина)", category: "savory-pastry", price: 180, available: true },
  { slug: "pie-cabbage", title: "Пирожок (капуста)", category: "savory-pastry", price: 130, available: true },
  { slug: "pie-cabbage-meat", title: "Пирожок (капуста-мясо)", category: "savory-pastry", price: 140, available: true },
  { slug: "pie-onion-egg", title: "Пирожок (лук-яйцо)", category: "savory-pastry", price: 130, available: true },
  { slug: "pie-rice-meat", title: "Пирожок (рис-мясо)", category: "savory-pastry", price: 140, available: true },
  { slug: "pie-potato", title: "Пирожок (картошка)", category: "savory-pastry", price: 130, available: true },
  { slug: "pie-liver", title: "Пирожок (рис-печень / печень-мясо)", category: "savory-pastry", price: 140, available: true },
  { slug: "sausage-roll", title: "Сосиска в тесте", category: "savory-pastry", price: 120, available: true },
  { slug: "cutlet-roll", title: "Котлета в тесте", category: "savory-pastry", price: 160, available: true },
  { slug: "pizza", title: "Пицца", category: "savory-pastry", price: 160, available: true },
  { slug: "pyanse", title: "Пян-се (капуста, ким-ча)", category: "savory-pastry", price: 160, available: true },
  { slug: "shanezhka-ural", title: "Шанежка Уральская", category: "savory-pastry", price: 180, available: true },
  { slug: "rastygai-fish", title: "Растягай рыбный", category: "savory-pastry", price: 1, available: true },
  { slug: "sausage-reflyonaya", title: "Сосиска рефлёная", category: "savory-pastry", price: 1, available: true },
  // Сладкая выпечка (+2)
  { slug: "pie-jam", title: "Пирожок (повидло)", category: "sweet-pastry", price: 140, available: true },
  { slug: "sweet-pies-csv", title: "Пирожки сладкие", category: "sweet-pastry", price: 180, available: true },
  // Хлеб (+1)
  { slug: "bread-classic", title: "Хлеб", category: "bread", price: 120, available: true },
  // Завтраки (+6, новая категория)
  { slug: "breakfast-worker-cabbage-potato", title: "Рабочий завтрак (картошка-капуста)", category: "breakfast", price: 140, available: true },
  { slug: "breakfast-worker-cabbage-meat", title: "Рабочий завтрак (капуста-мясо)", category: "breakfast", price: 140, available: true },
  { slug: "breakfast-tourist-sausage", title: "Завтрак туриста (с сосиской)", category: "breakfast", price: 180, available: true },
  { slug: "breakfast-tourist-chicken", title: "Завтрак туриста (с курицей)", category: "breakfast", price: 240, available: true },
  { slug: "pancakes-filled", title: "Блинчики с начинкой", category: "breakfast", price: 90, available: true },
  { slug: "pancakes-plain", title: "Блинчики без начинки", category: "breakfast", price: 70, available: true },
  // Закуски / Фри (+4, новая категория)
  { slug: "donut", title: "Пончик", category: "snacks", price: 80, available: true },
  { slug: "fries-potato", title: "Картофель фри", category: "snacks", price: 1, available: true },
  { slug: "fries-wings", title: "Крылья фри", category: "snacks", price: 1, available: true },
  { slug: "cheese-sticks", title: "Сырные палочки", category: "snacks", price: 1, available: true },
  // Напитки (+5)
  { slug: "tea", title: "Чай (чёрный / зелёный)", category: "drinks", price: 80, available: true },
  { slug: "coffee", title: "Кофе", category: "drinks", price: 130, available: true },
  { slug: "kompot", title: "Компот", category: "drinks", price: 140, available: true },
  { slug: "mors", title: "Морс", category: "drinks", price: 1, available: true },
  { slug: "milkshake", title: "Коктейль молочный", category: "drinks", price: 1, available: true },
```

Записи **не содержат** `weight`, `tag`, `image`, `description` — редактор внесёт через CMS UI после деплоя.

- [ ] **Step 2: Проверить количество элементов**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47
node -e "const m = require('fs').readFileSync('frontend/scripts/directus-seed.mjs','utf8'); const start = m.indexOf('const productsData = ['); const end = m.indexOf('];', start); const block = m.slice(start, end); console.log('Items:', (block.match(/\\{ slug:/g)||[]).length);"
```

Expected: `Items: 58` (23 существующих + 35 новых).

- [ ] **Step 3: Проверить синтаксис**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47/frontend
node --check scripts/directus-seed.mjs
```

Expected: exit 0, без вывода.

---

### Task 3: Добавить функцию `ensureCategoryUpdates()` в seed

**Files:**
- Modify: `frontend/scripts/directus-seed.mjs` (вставка новой функции и вызова в основной flow)

**Зачем:** Seed только вставляет новые категории, но не обновляет `sort`/`subtitle` уже существующих. Нам нужно сдвинуть `ready-meals` 4→6, `frozen` 5→7, `drinks` 6→8 и обновить subtitle у `drinks`.

- [ ] **Step 1: Добавить импорт `updateItem` (если ещё не импортирован)**

Открыть `frontend/scripts/directus-seed.mjs`, найти блок импортов (строки 14-45). Проверить, что в списке импортов из `@directus/sdk` есть `updateItem`. По текущему файлу — он уже импортирован (строка 38).

Если по какой-то причине нет — добавить:
```js
  updateItem,
```

- [ ] **Step 2: Найти место в main flow, где обрабатываются категории**

Открыть `frontend/scripts/directus-seed.mjs:1666-1672`:
```js
  if (newCats.length) {
    const created = await client.request(createItems("categories", newCats));
    for (const c of created) catBySlug.set(c.slug, c);
    console.log(`[seed] ✓ inserted ${created.length} categories`);
  } else {
    console.log("[seed] categories already populated, skipping");
  }
```

- [ ] **Step 3: Добавить блок «обновление существующих категорий» сразу ПОСЛЕ вставки новых**

После строки 1672 (закрывающая `}` блока else) и ПЕРЕД строкой 1674 (`// 4) Products`) вставить:

```js

  // 3.1) Update sort & subtitle on existing categories that drift from categoriesData.
  // Seed only inserts; it does not patch existing rows. We need this to support
  // category re-sorting (e.g. inserting `breakfast` between `sweet-pastry` and
  // `ready-meals` shifts the latter from sort=4 to sort=6).
  let catUpdates = 0;
  for (const desired of categoriesData) {
    const existing = existingCats.find((c) => c.slug === desired.slug);
    if (!existing) continue; // newly inserted above — already correct
    // Re-fetch the row with sort/subtitle so we can compare.
    const [full] = await client.request(
      readItems("categories", {
        filter: { slug: { _eq: desired.slug } },
        fields: ["id", "sort", "subtitle"],
        limit: 1,
      }),
    );
    if (!full) continue;
    const patch = {};
    if (full.sort !== desired.sort) patch.sort = desired.sort;
    if (full.subtitle !== desired.subtitle) patch.subtitle = desired.subtitle;
    if (Object.keys(patch).length) {
      await client.request(updateItem("categories", full.id, patch));
      console.log(`[seed]   ✓ ${desired.slug} updated:`, patch);
      catUpdates++;
    }
  }
  if (catUpdates === 0) {
    console.log("[seed] all category sorts/subtitles already match");
  }
```

- [ ] **Step 4: Проверить синтаксис всего файла**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47/frontend
node --check scripts/directus-seed.mjs
```

Expected: exit 0.

- [ ] **Step 5: Закоммитить изменения seed-скрипта**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47
git add frontend/scripts/directus-seed.mjs
git commit -m "feat(seed): расширение меню — 2 категории (breakfast, snacks) и 35 товаров

- categoriesData: добавлены breakfast (sort=4) и snacks (sort=5),
  ready-meals/frozen/drinks сдвинуты на 6/7/8, у drinks обновлён subtitle
- productsData: +35 позиций из pre/меню.csv (без image/weight/description —
  редактор заполнит через CMS UI)
- 7 позиций без цены публикуются с price=1 как маркер «уточнить цену»
- ensureCategoryUpdates: новый pass для апдейта sort/subtitle уже
  существующих категорий (seed раньше только вставлял)

Спека: docs/superpowers/specs/2026-05-05-menu-categories-expansion-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Expected: коммит создан.

---

### Task 4: Pre-flight — проверить env и доступность Directus

**Files:** none (verification only)

- [ ] **Step 1: Проверить наличие .env.local**

Run:
```bash
test -f /c/123/VSCode/BakeryDirectusCMS/.env.local && echo "OK: .env.local exists" || echo "MISSING: .env.local"
grep -E "^direstus_admin_token=|^DIRECTUS_ADMIN_TOKEN=|^ADMIN_TOKEN=" /c/123/VSCode/BakeryDirectusCMS/.env.local
```

Expected:
```
OK: .env.local exists
direstus_admin_token=Zf7fhgFHEp8Lb5Vj-BY75my8Ug2SXmSl
```

Если файла нет — создать с одной строкой:
```
direstus_admin_token=Zf7fhgFHEp8Lb5Vj-BY75my8Ug2SXmSl
```

- [ ] **Step 2: Проверить, что Directus отвечает (без авторизации)**

Run:
```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://delovkusa.openlabio.ru/directus/server/health"
```

Expected: `HTTP 200`

- [ ] **Step 3: Проверить, что admin token валиден**

Run:
```bash
curl -s -H "Authorization: Bearer Zf7fhgFHEp8Lb5Vj-BY75my8Ug2SXmSl" "https://delovkusa.openlabio.ru/directus/users/me?fields=email,role.name" | head -c 200
```

Expected: JSON с email админа (например `admin@delovkusa.ru`) и role.

- [ ] **Step 4: Зафиксировать «до»-снепшот**

Run:
```bash
curl -s -H "Authorization: Bearer Zf7fhgFHEp8Lb5Vj-BY75my8Ug2SXmSl" "https://delovkusa.openlabio.ru/directus/items/categories?fields=slug,sort,subtitle&sort=sort&limit=-1" | python -m json.tool > /tmp/cats-before.json 2>&1 || curl -s -H "Authorization: Bearer Zf7fhgFHEp8Lb5Vj-BY75my8Ug2SXmSl" "https://delovkusa.openlabio.ru/directus/items/categories?fields=slug,sort,subtitle&sort=sort&limit=-1" > /tmp/cats-before.json
curl -s -H "Authorization: Bearer Zf7fhgFHEp8Lb5Vj-BY75my8Ug2SXmSl" "https://delovkusa.openlabio.ru/directus/items/products?fields=slug&limit=-1" > /tmp/products-before.json
echo "Categories: $(grep -c slug /tmp/cats-before.json) | Products: $(grep -c slug /tmp/products-before.json)"
```

Expected: `Categories: 6 | Products: 23` (или близкие — главное зафиксировать «было»).

---

### Task 5: Запустить seed против прод-Directus

**Files:** none (execution only)

- [ ] **Step 1: Установить зависимости (если не установлены)**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47/frontend
test -d node_modules || pnpm install
```

Expected: `node_modules/` существует. Если нужно — `pnpm install` отрабатывает без ошибок.

- [ ] **Step 2: Запустить seed**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47/frontend
DIRECTUS_URL=https://delovkusa.openlabio.ru/directus pnpm seed 2>&1 | tee /tmp/seed-run.log
```

Expected (ключевые строки в логе):
```
[seed] Using static admin token against https://delovkusa.openlabio.ru/directus
...
[seed] ==== CATEGORIES ====
[seed] ✓ inserted 2 categories
[seed]   ✓ ready-meals updated: { sort: 6 }
[seed]   ✓ frozen updated: { sort: 7 }
[seed]   ✓ drinks updated: { sort: 8, subtitle: 'Чай, кофе, компот, лимонады' }
...
[seed] ==== PRODUCTS ====
[seed] ✓ inserted 35 products
```

Если `inserted N categories` где `N != 2` или `inserted N products` где `N != 35` — остановиться и разобраться (повторный запуск? правка данных вручную? есть конфликты по slug?).

- [ ] **Step 3: Запустить seed повторно (тест идемпотентности)**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47/frontend
DIRECTUS_URL=https://delovkusa.openlabio.ru/directus pnpm seed 2>&1 | tail -50
```

Expected (ключевые строки):
```
[seed] categories already populated, skipping
[seed] all category sorts/subtitles already match
[seed] products already populated, skipping
```

Если что-то отличается — есть проблема с идемпотентностью.

---

### Task 6: Верификация через публичное API

**Files:** none

- [ ] **Step 1: Проверить количество и порядок категорий**

Run:
```bash
curl -s "https://delovkusa.openlabio.ru/directus/items/categories?fields=slug,title,sort,subtitle&filter[status][_eq]=published&sort=sort&limit=-1"
```

Expected: 8 объектов в порядке:
1. bread (sort=1)
2. savory-pastry (sort=2)
3. sweet-pastry (sort=3)
4. **breakfast (sort=4)** — новая
5. **snacks (sort=5)** — новая
6. ready-meals (sort=6) — сдвинут с 4
7. frozen (sort=7) — сдвинут с 5
8. drinks (sort=8, subtitle="Чай, кофе, компот, лимонады") — сдвинут с 6

- [ ] **Step 2: Проверить количество товаров**

Run:
```bash
curl -s "https://delovkusa.openlabio.ru/directus/items/products?aggregate[count]=*"
```

Expected: `{"data":[{"count":"58"}]}` (или числовое 58).

- [ ] **Step 3: Проверить, что новые товары привязаны к правильным категориям**

Run:
```bash
curl -s "https://delovkusa.openlabio.ru/directus/items/products?fields=slug,category.slug&filter[slug][_in]=cheburek-pork-beef,donut,coffee,breakfast-tourist-chicken,fries-potato"
```

Expected: 5 объектов; пары slug→category должны быть:
- `cheburek-pork-beef` → `savory-pastry`
- `donut` → `snacks`
- `coffee` → `drinks`
- `breakfast-tourist-chicken` → `breakfast`
- `fries-potato` → `snacks`

- [ ] **Step 4: Проверить позиции с `price=1`**

Run:
```bash
curl -s "https://delovkusa.openlabio.ru/directus/items/products?fields=slug,title,price&filter[price][_eq]=1&sort=slug"
```

Expected: 7 объектов: `cheese-sticks`, `fries-potato`, `fries-wings`, `milkshake`, `mors`, `rastygai-fish`, `sausage-reflyonaya`.

---

### Task 7: Триггерить ISR ревалидацию

**Files:** none

- [ ] **Step 1: Дёрнуть `/api/revalidate`**

Run:
```bash
curl -s "https://delovkusa.openlabio.ru/api/revalidate?secret=d32d1e4b719c36e3f1772eb1de52f1cf03be3521edc4ed5c&collection=products"
```

Expected: `{"revalidated":true,"collection":"products","at":"2026-05-05T..."}` (с актуальным `at`).

Если `{"error":"Invalid secret"}` — секрет в `deploy/.env` не совпадает с тем, что задан на сервере. Проверить через SSH (опционально):
```bash
sshpass -p '77807780' ssh -o StrictHostKeyChecking=no root@192.168.1.166 'docker exec bakery_frontend env | grep REVALIDATE_SECRET'
```

---

### Task 8: Smoke test фронтенда

**Files:** none

- [ ] **Step 1: Проверить главную (категории на стартовой)**

Run:
```bash
curl -s -o /tmp/home.html -w "HTTP %{http_code}, %{size_download} bytes\n" "https://delovkusa.openlabio.ru/"
grep -o "Завтраки\|Закуски" /tmp/home.html | sort -u
```

Expected: `HTTP 200, ... bytes` (нескольких килобайт+) и в выводе grep — `Завтраки` и `Закуски` (обе строки).

- [ ] **Step 2: Проверить страницу новой категории `/category/breakfast`**

Run:
```bash
curl -s -o /tmp/breakfast.html -w "HTTP %{http_code}\n" "https://delovkusa.openlabio.ru/category/breakfast"
grep -c "Рабочий завтрак\|Завтрак туриста\|Блинчики" /tmp/breakfast.html
```

Expected: `HTTP 200`, и grep возвращает >= 3 (3 наших новых товарных пункта в HTML).

- [ ] **Step 3: Проверить страницу `/category/snacks`**

Run:
```bash
curl -s -o /tmp/snacks.html -w "HTTP %{http_code}\n" "https://delovkusa.openlabio.ru/category/snacks"
grep -c "Картофель фри\|Сырные палочки\|Пончик" /tmp/snacks.html
```

Expected: `HTTP 200`, grep возвращает >= 3.

- [ ] **Step 4: Проверить, что существующие категории не сломались**

Run:
```bash
for slug in bread savory-pastry sweet-pastry ready-meals frozen drinks; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://delovkusa.openlabio.ru/category/$slug")
  echo "$slug -> HTTP $code"
done
```

Expected: все 6 категорий — `HTTP 200`.

- [ ] **Step 5: Проверить детальную страницу одного нового товара**

Run:
```bash
curl -s -o /tmp/product.html -w "HTTP %{http_code}\n" "https://delovkusa.openlabio.ru/product/coffee"
grep -c "Кофе\|130" /tmp/product.html
```

Expected: `HTTP 200`, grep возвращает >= 1.

---

### Task 9: Финальный коммит и зафиксировать TODO для редактора

**Files:**
- Create: `docs/superpowers/plans/2026-05-05-menu-expansion-followup.md` (короткая памятка для редактора)

- [ ] **Step 1: Создать памятку с открытыми вопросами**

Создать файл `docs/superpowers/plans/2026-05-05-menu-expansion-followup.md` с содержанием:

```markdown
# Меню — followup для редактора (после расширения 2026-05-05)

После применения плана `2026-05-05-menu-categories-expansion.md` в Directus
залиты 35 новых товаров и 2 новые категории. Список открытых задач
для редактора (через CMS UI, без программных правок):

## Картинки

- [ ] Категория `breakfast` (Завтраки) — загрузить `image` и `slider_image`
- [ ] Категория `snacks` (Закуски / Фри) — загрузить `image` и `slider_image`
- [ ] Все 35 новых товаров — выбрать из `0 prompt/design/Фото продуктов/`
      или сгенерировать (см. `0 prompt/design/промты картинок.md`)

## Цены (price=1 — placeholder)

Семь позиций сейчас опубликованы с `price=1`. Уточнить и проставить:

- [ ] `rastygai-fish` — Растягай рыбный
- [ ] `sausage-reflyonaya` — Сосиска рефлёная
- [ ] `fries-potato` — Картофель фри
- [ ] `fries-wings` — Крылья фри
- [ ] `cheese-sticks` — Сырные палочки
- [ ] `mors` — Морс
- [ ] `milkshake` — Коктейль молочный

## Прочее

- [ ] `coffee` — в CSV было «130 — 140». Сейчас зафиксировано 130.
      Если нужен диапазон — добавить поле `price_max` (отдельная задача).
- [ ] Описания (`description`) и веса (`weight`) для новых 35 товаров.
- [ ] `tag` (`hit`/`new`) — расставить по усмотрению (кофе/чай — кандидаты в hit).
```

- [ ] **Step 2: Закоммитить и запушить**

Run:
```bash
cd /c/123/VSCode/BakeryDirectusCMS/.claude/worktrees/dazzling-ritchie-e4be47
git add docs/superpowers/plans/2026-05-05-menu-expansion-followup.md
git commit -m "docs(menu): followup-чеклист для редактора (картинки, цены)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Expected: коммит создан.

- [ ] **Step 3: Финальная проверка ветки**

Run:
```bash
git log --oneline -5
git status
```

Expected: 3 коммита от текущей сессии (спека + seed + followup), `git status` чистый.

---

## Self-Review (выполнено автором плана)

**Spec coverage:**
- ✅ 8 категорий с правильным sort — Task 1 + Task 3
- ✅ 35 новых товаров с правильным маппингом — Task 2 (16 в savory-pastry... wait, 17. Verified.)
- ✅ price=1 для 7 позиций без цены — Task 2 (rastygai-fish, sausage-reflyonaya, fries-potato, fries-wings, cheese-sticks, mors, milkshake)
- ✅ subtitle drinks обновлён — Task 1, applied via Task 3
- ✅ Идемпотентность — Task 5 step 3 проверяет
- ✅ Revalidate — Task 7
- ✅ Smoke test — Task 8
- ✅ Followup для редактора — Task 9 (картинки + цены + описания)

**Placeholder scan:** ни «TBD», ни «similar to», ни «add appropriate handling» — каждый код-блок полный.

**Type consistency:** функция `ensureCategoryUpdates` упоминается в Task 3 — но в реализации мы её добавили inline, без вынесения в отдельную функцию (это упрощение в рамках одного блока). Названия полей (`sort`, `subtitle`, `slug`, `price`, `category`, `available`, `status`) — соответствуют схеме существующего seed.

**Sub-точка с подсчётом:** в Task 2 step 2 `node -e` использует двойное экранирование `\\{` для regexp — это корректно для shell+JS.

---

## Plan complete

Сохранено: `docs/superpowers/plans/2026-05-05-menu-categories-expansion.md`

**Два варианта исполнения:**

1. **Subagent-Driven (рекомендую)** — диспатчу свежий subagent на каждую задачу, ревью между задачами, быстрая итерация
2. **Inline Execution** — выполняю шаги в текущей сессии с чекпоинтами

Какой подход?
