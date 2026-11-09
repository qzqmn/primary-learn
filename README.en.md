# 學童通 · HK Primary Learn

Open-source teaching and practice platform for **Hong Kong primary school (P1–P6)**. One Docker image, one SQLite file, runs on any VPS (amd64 + arm64). Teachers get classes, assignments and per-student reports.

[中文](README.md) · [Deployment](docs/deployment.md) · [Content packs](docs/content-packs.md) · [Privacy](docs/privacy.md) · [Architecture](docs/architecture.md)

## Quick start

```bash
git clone https://github.com/qzqmn/primary-learn.git && cd primary-learn
cp .env.example .env
docker compose up -d --build
docker compose logs app        # shows the one-time setup code
```

Open `http://<server-ip>:3000`, enter the setup code and create the admin account via the web wizard (no hard-coded credentials). Save the 8 recovery codes — they are shown once. **Put HTTPS in front before real use** (see [deployment guide](docs/deployment.md)).

## What's inside

- **Students**: math P1–P6 (parameterised generators, unlimited questions), English and Chinese (JSON content packs), instant feedback, stars, streaks, a mistakes notebook.
- **Teachers**: classes, bulk student import, printable QR login cards, assignments with completion tracking, student reports with weak-topic analysis, CSV export, broadcasts.
- **Parents**: email registration + a teacher-issued binding code to view their child's report.
- **Admin**: first-run web wizard, teacher approval, school-wide stats, Resend email settings, audit log, database backup download.
- **Privacy by default**: students only have nicknames; no trackers, ads or external fonts; email is off until you enable it.

105 built-in units today: 51 math, 29 English, 19 Chinese, 6 general studies. Every unit has a short lesson, common mistakes and generated worked examples. Math is generated (~94k distinct questions measured by sampling); English/Chinese come from curated word lists and are much thinner — some units repeat after a few sessions. Contributions welcome ([content packs](docs/content-packs.md)). All questions must be original or under a permissive license; uploaded packs must declare one (CC0, CC BY, CC BY-SA, MIT, Apache-2.0, BSD, ISC, Unlicense; no NC/ND). Admin backup/restore (validated upload, safety backup, auto-rollback) is built in.

## Deploy from a published image (no source on the VPS)

Pushing to `main` runs tests, then **publishes a multi-arch image to GHCR automatically** (`ghcr.io/qzqmn/primary-learn:latest`, plus `:sha-…`; `v1.2.3` tags add `:1.2.3`). Pull requests only run tests. On the VPS, use `deploy/docker-compose.yml` with `APP_IMAGE=ghcr.io/qzqmn/primary-learn:latest` in `.env`, then `docker compose up -d`; upgrade with `docker compose pull && docker compose up -d`. Packages are private by default: make the package public or `docker login ghcr.io` with a `read:packages` token. Details: [deployment guide](docs/deployment.md#6-發佈自己的鏡像github-actions).

## Development

```bash
cd apps/web && npm ci
npm run dev        # dev server
npm run check      # typecheck + unit tests + build + end-to-end smoke test
```

See the Chinese [README](README.md) for configuration, the account model, known limitations (no English UI, TOTP, SRS, PWA yet) and the roadmap.

## License

Code: AGPL-3.0-only. Official sample content in `content/`: CC BY-SA 4.0.
