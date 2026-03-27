# CarousellBuddy

A self-hosted web application that monitors Carousell.com.hk listings, tracks price changes, and sends notifications when new items matching your searches appear.

---

## Features

- **Saved Searches** — Define searches by keyword with optional filters (condition, price range, sort order, polling interval)
- **Automated Scraping** — Scheduled background jobs poll Carousell at configurable intervals using headless Chromium (Playwright)
- **All Items View** — Unified grid of every listing across all your searches, with status filtering, sorting, and per-search filtering
- **Price History** — Tracks price changes over time with a per-listing chart
- **Price Stats** — Percentile breakdown (p10–p90, min, max, mean) per search to gauge market value
- **Notifications** — New listing alerts via any [Apprise-supported](https://github.com/caronc/apprise) channel (Slack, Discord, email, ntfy, Pushover, and more) or Telegram
- **Telegram Bot** — Query your searches and trigger scrapes directly from Telegram
- **Hide Listings** — Permanently exclude unwanted listings from all views
- **Dark Mode** — Full light/dark theme support

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### 1. Clone and configure

```bash
git clone https://github.com/philosophyfiend/carousell-buddy.git
cd carousell-buddy
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
SECRET_KEY=your-secret-key-here   # generate: python -c "import secrets; print(secrets.token_hex(32))"
POSTGRES_PASSWORD=a-strong-password
DATABASE_URL=postgresql+asyncpg://carousell:a-strong-password@db:5432/carousell
```

### 2. Start

```bash
docker compose up -d
```

### 3. Open

Navigate to **http://localhost:5243** and register your account.

---

## Configuration

All configuration is via environment variables in `.env`.

### Required

| Variable | Description |
|---|---|
| `SECRET_KEY` | JWT signing secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `DATABASE_URL` | Async SQLAlchemy connection string, e.g. `postgresql+asyncpg://carousell:password@db:5432/carousell` |

### PostgreSQL

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `carousell` | Database user |
| `POSTGRES_DB` | `carousell` | Database name |
| `POSTGRES_DATA_PATH` | *(Docker volume)* | Optional host path for data persistence (e.g. TrueNAS bind mount) |

### App

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5243` | External port for the web UI |
| `FRONTEND_URL` | `http://localhost:5243` | Used for CORS — set to your public URL if exposing externally |

### Scraper Tuning

| Variable | Default | Description |
|---|---|---|
| `SCRAPE_MAX_PAGES` | `10` | Maximum pages to scrape per search run |

### Telegram (Optional)

| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Your chat or channel ID |

---

## Notifications

Notifications are configured per-user in **Settings → Notifications**.

### Apprise (Multi-channel)

Paste any [Apprise URL](https://github.com/caronc/apprise/wiki) into the notification URL field. Examples:

| Service | URL format |
|---|---|
| Slack | `slack://TokenA/TokenB/TokenC/` |
| Discord | `discord://WebhookID/WebhookToken/` |
| ntfy | `ntfy://ntfy.sh/your-topic` |
| Pushover | `pover://UserKey@AppToken/` |
| Email (SMTP) | `mailto://user:pass@gmail.com` |

### Telegram Bot

Once `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set, use these commands in your Telegram chat:

| Command | Description |
|---|---|
| `/searches` | List all your saved searches |
| `/run <name>` | Trigger an immediate scrape for a search |
| `/stats <name>` | Show price statistics for a search |

---

## Architecture

```
Browser
  │
  └─► Nginx (port 5243)
        ├─► /api/*  ──► FastAPI Backend (port 8000)
        │                     │
        │              PostgreSQL 16
        │
        └─► /*      ──► React Frontend (port 80)
```

### Backend

- **FastAPI** — Async REST API
- **SQLAlchemy 2.0** (async) + **asyncpg** — Database ORM
- **Alembic** — Schema migrations (run automatically on startup)
- **APScheduler** — Per-search background scrape jobs
- **Playwright/Chromium** — Headless browser scraping
- **Apprise** — Multi-channel notification dispatch
- **JWT** (HS256) — Authentication (30-min access tokens, 30-day refresh tokens)

### Frontend

- **React 18** + **TypeScript** + **Vite**
- **TanStack React Query** — Data fetching and caching
- **Radix UI** + **Tailwind CSS** — Component library and styling
- **Recharts** — Price history charts
- **Axios** — HTTP client with automatic token refresh interceptor

### Database Schema

| Table | Purpose |
|---|---|
| `users` | User accounts |
| `saved_searches` | Search configurations (keyword, filters, polling interval) |
| `listings` | Scraped listings with status tracking |
| `scrape_runs` | Scrape execution history |
| `notification_configs` | Per-user notification settings |
| `excluded_listings` | User-hidden listings |
| `price_history` | Per-listing price change log |

---

## Deployment

### TrueNAS / Dockge

To persist the database on a host path instead of a Docker volume:

```env
POSTGRES_DATA_PATH=/mnt/tank/carousell-buddy/postgres
```

### Exposing Externally

Update `FRONTEND_URL` to your public domain and handle TLS termination in your reverse proxy (Traefik, Caddy, etc.) in front of port `5243`.

### Updating

```bash
docker compose pull
docker compose up -d
```

Database migrations run automatically on each backend startup.

---

## Development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# Start a local Postgres then:
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev       # starts at http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`.

### Database Migrations

```bash
cd backend
alembic upgrade head                                      # apply all migrations
alembic revision --autogenerate -m "description"          # generate a new migration
```

---

## License

[Apache 2.0](LICENSE)
