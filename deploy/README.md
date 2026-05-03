# Deploy · Дело вкуса

Стек **bakery** (Directus CMS + Next.js фронт) в Portainer из Git-репо, образ фронта из GHCR.

## Архитектура

```
   https://delovkusa.openlabio.ru
                 │
          ┌──────┴──────┐
          │    Caddy    │ (внешний, не в docker)
          └──────┬──────┘
                 │
      ┌──────────┼──────────────┐
      │          │              │
 catch-all   /directus/*  (handle_path срезает префикс)
      │          │
      │          ▼
      │   192.168.1.166:8256 ──────┐
      ▼                            ▼
  192.168.1.166:8280     ┌──────────────────────┐
      │                   │ Docker stack "bakery" │
      │                   │  bakery_net          │
      ▼                   │                      │
 ┌────────────────┐       │  ┌───────────────┐   │
 │bakery_frontend │─────► │  │bakery_directus│   │
 │ (Next.js 16)   │ internal │  (directus:11)│   │
 │  :3000         │       │  │   :8055       │   │
 └────────────────┘       │  └───────┬───────┘   │
                          │          │           │
                          │  ┌───────┴───────┐   │
                          │  │bakery_postgres│   │
                          │  │ (postgres:17) │   │
                          │  │   :5432       │   │
                          │  └───────────────┘   │
                          └──────────────────────┘
```

## Контейнеры / сервисы в стеке

| Сервис | Контейнер | Образ | Порты | Примечание |
|---|---|---|---|---|
| `bakery_postgres` | `bakery_postgres` | `postgres:17-alpine` | 5432 (только в docker-сети) | **Опциональный** — профиль `internal-db` |
| `bakery_directus` | `bakery_directus` | `directus/directus:11` | 8055 (только в docker-сети) | всегда |
| `bakery_frontend` | `bakery_frontend` | `ghcr.io/…/bakerydirectuscms-frontend` | `${FRONTEND_HOST_PORT:-3000}` на хост | всегда |

### Internal vs External Postgres

Стек умеет оба сценария — переключается одной переменной.

**Internal (по умолчанию):** Postgres поднимается внутри стека в контейнере `bakery_postgres`.
```
COMPOSE_PROFILES=internal-db
DATABASE_HOST=bakery_postgres    # имя docker-сервиса
DATABASE_PORT=5432
```

**External:** подключение к managed-PG (Supabase, Neon, AWS RDS) или к PG на Proxmox.
```
COMPOSE_PROFILES=                # пусто — контейнер bakery_postgres не поднимется
DATABASE_HOST=192.168.1.230      # или db.supabase.co, и т.п.
DATABASE_PORT=5432
DATABASE_SSL=true                # для managed-PG обычно обязателен
```

В обоих случаях креды задаются через:
- `DATABASE_NAME`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`

**External зависимости:** только SMTP (Yandex), и то опционально (для писем от Directus).

**Не используем:** Redis (Directus работает на in-memory cache) и MinIO (файлы в локальном volume). Если понадобятся — добавите back позже.

## Volumes (обязательно бэкапить)

| Volume | Назначение |
|---|---|
| `bakery_postgres_data` | **Данные Postgres** — таблицы, Directus схема, пользователи, контент |
| `bakery_directus_uploads` | **Медиафайлы Directus** — картинки, PDF и т.д. |
| `bakery_directus_extensions` | Директория расширений Directus |

## Файлы

| Файл | Назначение |
|---|---|
| [`frontend/Dockerfile`](../frontend/Dockerfile) | Multi-stage build фронта (standalone) |
| [`deploy/docker-compose.yml`](./docker-compose.yml) | Стек для Portainer |
| [`deploy/.env.example`](./.env.example) | Шаблон переменных |
| [`.github/workflows/frontend-docker.yml`](../.github/workflows/frontend-docker.yml) | CI: сборка → GHCR → Portainer webhook |

## Первая установка

### 1. Сеть

Стек использует только **внутреннюю** сеть `bakery_net` (для связи Postgres ↔ Directus ↔ Frontend). Caddy находится вне docker и проксирует на IP хоста (`192.168.1.166:8280` и `:8256`), поэтому внешняя `web` сеть не нужна.

### 2. GHCR visibility

После первого CI перейти в **GitHub → Packages → bakerydirectuscms-frontend → Settings → Change visibility → Public**. Иначе в Portainer нужно добавить приватный Registry с PAT `read:packages`.

### 3. GitHub Secrets

- `PORTAINER_WEBHOOK_URL` (secret) — URL webhook стека. Без него CI не упадёт, просто не триггерит redeploy.

> Runtime-переменные Directus/Frontend **не нужны** на этапе билда. Меняются прямо в Portainer → Update the stack.

### 4. Генерация секретов

```bash
openssl rand -hex 32   # → DIRECTUS_KEY
openssl rand -hex 32   # → DIRECTUS_SECRET
openssl rand -hex 24   # → REVALIDATE_SECRET
```

Подставить в env стека в Portainer (не коммитить).

### 5. Создать стек в Portainer

1. **Stacks → Add stack → Repository**
2. **Name:** `bakery`
3. **Repository URL:** `https://github.com/<owner>/<repo>`
4. **Repository reference:** `refs/heads/main`
5. **Compose path:** `deploy/docker-compose.yml`
6. **Automatic updates:** `Webhook` (скопировать URL → в GitHub secret `PORTAINER_WEBHOOK_URL`)
7. **Environment variables** — заполнить по [.env.example](./.env.example):

   **Images & порты:**
   - `FRONTEND_IMAGE`, `FRONTEND_IMAGE_TAG`, `DIRECTUS_VERSION`
   - `FRONTEND_HOST_PORT=8280`, `DIRECTUS_HOST_PORT=8256`

   **Directus (критично, секреты):**
   - `DIRECTUS_PUBLIC_URL=https://delovkusa.openlabio.ru/directus`  **(с префиксом!)**
   - `DIRECTUS_KEY`, `DIRECTUS_SECRET` (generate!)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — логин/пароль **первого админа** (bootstrap на пустой БД; зайдёте в `https://delovkusa.openlabio.ru/directus/admin`)
   - `ADMIN_TOKEN` — опциональный API-токен для скриптов (можно оставить пустым)
   - `REFRESH_TOKEN_COOKIE_DOMAIN=delovkusa.openlabio.ru`, `SESSION_COOKIE_DOMAIN=delovkusa.openlabio.ru` (без ведущей точки)

   **Postgres:**
   - `COMPOSE_PROFILES=internal-db` (или пусто для внешнего PG)
   - `DATABASE_HOST=bakery_postgres` (или IP/домен внешнего PG)
   - `DATABASE_PORT=5432`
   - `DATABASE_NAME=bakery_directus_db`
   - `DATABASE_USERNAME=bakery_directus_user`
   - `DATABASE_PASSWORD` (задайте сильный)
   - `DATABASE_SSL=false` (true для managed-PG)

   **SMTP / CORS / прочее:**
   - см. `.env.example`

   **Frontend:**
   - `USE_DIRECTUS=true`

8. **Deploy the stack**

### 6. Caddy (один домен, Directus на префиксе `/directus/`)

Caddy **вне docker-сети стека** — проксирует на IP хоста по портам:
- `FRONTEND_HOST_PORT` (default 8380) → Next.js
- `DIRECTUS_HOST_PORT` (default 8356) → Directus; префикс `/directus/` срезается

`Caddyfile`:

```caddy
delovkusa.openlabio.ru {
    import geoblock
    import error_pages

    # Directus API / админка. handle_path срезает префикс /directus/
    handle_path /directus/* {
        reverse_proxy 192.168.1.166:8356
    }

    # Frontend catch-all после handle_path
    handle {
        reverse_proxy 192.168.1.166:8380
    }

    # Агрессивный кеш для хешированных ассетов Directus
    @assets path /directus/assets/*
    header @assets Cache-Control "public, max-age=31536000, immutable"

    encode
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options    "nosniff"
        Referrer-Policy           "strict-origin-when-cross-origin"
        -Server
    }
}
```

> **Про `@assets`**: в вашем исходном конфиге было `path /assets/*` — он применяется ДО `handle_path`, поэтому матчил бы только несуществующий путь. Правильно — `/directus/assets/*`.

**Точки входа после деплоя:**

| URL | Куда попадает |
|---|---|
| `https://delovkusa.openlabio.ru/` | Next.js фронт |
| `https://delovkusa.openlabio.ru/directus/admin` | Админка Directus |
| `https://delovkusa.openlabio.ru/directus/items/products` | API Directus |
| `https://delovkusa.openlabio.ru/directus/assets/<uuid>` | Ассеты из MinIO/local |

## Обновление фронта

- `git push` в `main` → CI собирает `:latest` + `:sha-xxx` → webhook → Portainer Update → контейнер `bakery_frontend` пересоздаётся за ~10 сек.
- Directus не трогается, сессии/данные в PG сохраняются.

## Смена runtime-переменных без пересборки

Любую переменную (DIRECTUS_PUBLIC_URL, USE_DIRECTUS, SMTP_*, CORS_ORIGIN, ADMIN_PASSWORD…) можно править в Portainer UI и **Update the stack** — образ не пересобирается, сервисы перезапускаются за секунды.

## Seed Directus (после первого запуска стека)

Нужно один раз наполнить Directus коллекциями, данными и настроить permissions + Flow для revalidate.

1. Авторизуйтесь в админке (`/directus/admin`), **View my profile → Token → Generate → Save**.
2. Положите в корневой `.env.local`:
   ```
   DIRECTUS_URL=https://delovkusa.openlabio.ru/directus
   DIRECTUS_ADMIN_TOKEN=<your token>
   SITE_URL=https://delovkusa.openlabio.ru
   REVALIDATE_SECRET=<same as in Portainer>
   ```
3. `cd frontend && pnpm seed`

Что сделает:
- создаст коллекции `categories`, `products`, `globals` с UUID PK;
- зальёт 34 изображения (категории, слайдеры, товары, логотипы);
- заполнит 6 категорий и 23 товара;
- настроит Public role с минимальными read-правами (только `status=published`, без служебных полей);
- создаст Directus Flow `Revalidate Next.js cache` — на `items.create/update/delete` в `categories`/`products`/`globals` дёргает `https://delovkusa.openlabio.ru/api/revalidate?secret=…`.

Идемпотентно — можно запускать повторно.

## Schema snapshot

Хранить схему в git:
```bash
cd frontend && pnpm schema:snapshot
# → обновляет deploy/directus-snapshot.json
```

Восстановить на новом инстансе:
```bash
# внутри контейнера bakery_directus
npx directus schema apply /path/to/directus-snapshot.json
```

## Production env

Set in production environment (Portainer stack env):

- `DIRECTUS_USE_FALLBACK_MOCKS=false` — disables silent mock-data fallback in `frontend/src/lib/api.ts`. Without this, Directus outages are masked by stale fallback data and pages render with mock content.
- `USE_DIRECTUS=true` — frontend reads from Directus instead of local mocks.

## Откат

Portainer → Stacks → bakery → Edit → `FRONTEND_IMAGE_TAG=<sha>` → Update. Для Directus — смените `DIRECTUS_VERSION`.

## Бэкап БД

```bash
# dump
docker exec bakery_postgres pg_dump -U bakery_directus_user bakery_directus_db | gzip > bakery_$(date +%F).sql.gz

# restore
gunzip -c bakery_YYYY-MM-DD.sql.gz | docker exec -i bakery_postgres psql -U bakery_directus_user -d bakery_directus_db
```

Плюс отдельно бэкапьте volume `bakery_directus_uploads` (через `docker cp` или `tar`):

```bash
docker run --rm -v bakery_directus_uploads:/src -v $(pwd):/dst alpine \
  tar czf /dst/uploads_$(date +%F).tar.gz -C /src .
```

## Локальная проверка фронт-образа

```bash
cd frontend
docker build -t bakery_frontend:local .
docker run --rm -p 3000:3000 \
  -e DIRECTUS_URL=https://admin.delovkusa.openlabio.ru \
  -e DIRECTUS_PUBLIC_URL=https://admin.delovkusa.openlabio.ru \
  -e USE_DIRECTUS=true \
  bakery_frontend:local
# открыть http://localhost:3000
```
