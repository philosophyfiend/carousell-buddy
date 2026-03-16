# Carousell Monitor

Self-hosted web app to monitor Carousell.com.hk listings.

## Features
- Search management with configurable polling intervals
- Automatic listing detection and deduplication
- Multi-channel notifications via Apprise (email, Slack, Discord, ntfy, Pushover, etc.)
- Optional Telegram bot with /searches, /run, /stats commands
- Price intelligence: percentile-based stats per search

## Setup

1. Copy `.env.example` to `.env` and configure:
   - `SECRET_KEY`: random string for JWT signing
   - `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`: optional, for Telegram bot
2. Run: `docker compose up -d`
3. Open: http://localhost:5243

## Telegram Bot
Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`.
Commands: `/searches`, `/run <name>`, `/stats <name>`
