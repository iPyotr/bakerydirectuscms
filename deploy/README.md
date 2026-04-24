# Deploy · Дело вкуса

Стек **bakery** (Directus CMS + Next.js фронт) в Portainer из Git-репо, образ фронта из GHCR.

## Архитектура

```
                  ┌───────────────────────────────────┐
                  │  Deploy node · stack "bakery"     │
                  │                                   │
                  │     ┌────────────────────┐        │
                  │     │  bakery_postgres   │        │
                  │     │   (postgres:17)    │        │
                  │     │  volume: *_data    │        │
                  │     └─────────▲──────────┘        │
                  │               │ bakery_net        │
                  │     ┌─────────┴──────────┐        │
                  │     │  bakery_directus   │◄─ admin│
                  │     │   (directus:11)    │        │
                  │     │  files → volume    │        │
                  │     │  cache → memory    │        │
                  │     └─────────▲──────────┘        │
                  │               │                   │
                  │     ┌─────────┴──────────┐        │
                  │     │  bakery_frontend   │◄─ www  │
                  │     │   (Next.js 16)     │        │
                  │     └────────────────────┘        │
                  │        ▲     "web" network        │
                  │        │                          │
                  │     ┌──┴───┐                      │
                  │     │ Caddy│                      │
                  │     └──────┘                      │
                  └───────────────────────────────────┘

GitHub push → Actions → ghcr.io/.../bakerydirectuscms-frontend → Portainer webhook
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

### 1. Сеть Caddy на deploy-ноде (один раз)

```bash
docker network create web
```

Caddy должен быть в этой же сети, чтобы проксировать на `bakery_frontend:3000` и `bakery_directus:8055`.

### 2. GHCR visibility

После первого CI перейти в **GitHub → Packages → bakerydirectuscms-frontend → Settings → Change visibility → Public**. Иначе в Portainer нужно добавить приватный Registry с PAT `read:packages`.

### 3. GitHub Secrets

- `PORTAINER_WEBHOOK_URL` (secret) — URL webhook стека. Без него CI не упадёт, просто не триггерит redeploy.

> Runtime-переменные Directus/Frontend **не нужны** на этапе билда. Меняются прямо в Portainer → Update the stack.

### 4. Генерация секретов

```bash
openssl rand -hex 32   # → DIRECTUS_KEY
openssl rand -hex 32   # → DIRECTUS_SECRET
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

   **Images & network:**
   - `FRONTEND_IMAGE`, `FRONTEND_IMAGE_TAG`, `DIRECTUS_VERSION`, `WEB_NETWORK=web`, `FRONTEND_HOST_PORT=3000`

   **Directus (критично, секреты):**
   - `DIRECTUS_PUBLIC_URL=https://admin.delovkusa.openlabio.ru`
   - `DIRECTUS_KEY`, `DIRECTUS_SECRET` (generate!)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — логин/пароль **первого админа** (bootstrap на пустой БД; этими кредами вы зайдёте в `/admin`)
   - `ADMIN_TOKEN` — опциональный API-токен для скриптов (можно оставить пустым)
   - `REFRESH_TOKEN_COOKIE_DOMAIN=.delovkusa.openlabio.ru`, `SESSION_COOKIE_DOMAIN=.delovkusa.openlabio.ru`

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

### 6. Caddy

`Caddyfile`:

```caddy
delovkusa.openlabio.ru {
  encode zstd gzip
  reverse_proxy bakery_frontend:3000
}

admin.delovkusa.openlabio.ru {
  encode zstd gzip
  reverse_proxy bakery_directus:8055
}
```

Caddy в сети `web`. Альтернатива — `caddy-docker-proxy`: раскомментируйте `labels:` в [docker-compose.yml](./docker-compose.yml).

## Обновление фронта

- `git push` в `main` → CI собирает `:latest` + `:sha-xxx` → webhook → Portainer Update → контейнер `bakery_frontend` пересоздаётся за ~10 сек.
- Directus не трогается, сессии/данные в PG сохраняются.

## Смена runtime-переменных без пересборки

Любую переменную (DIRECTUS_PUBLIC_URL, USE_DIRECTUS, SMTP_*, CORS_ORIGIN, ADMIN_PASSWORD…) можно править в Portainer UI и **Update the stack** — образ не пересобирается, сервисы перезапускаются за секунды.

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
