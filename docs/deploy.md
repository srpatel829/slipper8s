# Super 8s — Deployment Guide

> **Last updated:** Feb 28, 2026
> **Target:** Vercel (Pro) + Neon PostgreSQL + Resend

---

## Cost & Plan Strategy

| Period | Vercel Plan | Monthly Cost |
|---|---|---|
| March Madness (Mar 19 – Apr 6) | **Pro** | $20 |
| Off-season | **Hobby (Free)** | $0 |
| Neon DB (any period) | Free tier, auto-pauses | $0 |
| Resend | Free tier (100 emails/day) | $0 |

**Upgrade to Pro by March 16** — your `*/5 * * * *` cron requires Pro (Hobby allows only 2 crons/day). Downgrade back to Hobby after April 6.

---

## Pre-Deploy Checklist

Run through this **before** running `vercel --prod` for the first time.

### 1. Infrastructure Setup

- [ ] **Neon** — create a production project; grab the **pooler URL** (`DATABASE_URL`) and **direct URL** (`DIRECT_URL`) from the Neon dashboard.
- [ ] **Resend** — verify a sending domain; get `AUTH_RESEND_KEY` and decide `RESEND_FROM_EMAIL`.
- [ ] **Google Cloud** — enable Sheets API, create a Service Account, download JSON key, share your Sheet with the service account email.
- [ ] **Vercel** — upgrade account to Pro before deploying (required for 5-min cron).

### 2. Generate Secrets

```bash
# Auth secret (NextAuth)
openssl rand -base64 32

# Cron bearer token
openssl rand -base64 32
```

### 3. Fix `prisma/schema.prisma`

The datasource block **must** include the `url` and `directUrl` fields before migrations work:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 4. Run Database Migration (against production Neon)

```bash
DATABASE_URL="<your-neon-pooler-url>" \
DIRECT_URL="<your-neon-direct-url>" \
npx prisma migrate deploy
```

### 5. Day 0 Seed from Google Sheet

Run **once** to bootstrap teams, users, and picks from the Sheet into Neon:

```bash
npx tsx prisma/seed-from-sheet.ts
```

Then set the picks deadline manually in `/admin/settings` after deploy.

---

## Vercel Setup

### Install & Link

```bash
npm i -g vercel
vercel link          # first time only — associates repo with Vercel project
```

### Set Environment Variables

Set these in the **Vercel dashboard** (Project → Settings → Environment Variables) or via CLI:

```bash
vercel env add DATABASE_URL              production
vercel env add DIRECT_URL               production
vercel env add AUTH_SECRET              production
vercel env add AUTH_URL                 production   # https://your-domain.vercel.app
vercel env add AUTH_RESEND_KEY          production
vercel env add RESEND_FROM_EMAIL        production
vercel env add CRON_SECRET              production
vercel env add GOOGLE_SHEETS_ID         production
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
vercel env add GOOGLE_PRIVATE_KEY       production   # include full PEM with \n escapes
```

> **Note on `AUTH_URL`:** Must match the domain magic-link emails link to. If you add a custom domain later, update this env var and redeploy.

### Deploy

```bash
vercel --prod
```

---

## Cron Configuration

Already defined in `vercel.json` — no changes needed:

```json
{
  "crons": [{ "path": "/api/cron/sync", "schedule": "*/5 * * * *" }]
}
```

The cron calls `/api/cron/sync` with `Authorization: Bearer <CRON_SECRET>`. Verify it's firing in **Vercel Dashboard → Logs → Cron**.

**ESPN fallback:** If ESPN sync fails, the cron automatically falls back to re-reading the Google Sheet for current win/loss data (see `src/lib/espn.ts`).

---

## Post-Deploy Verification

- [ ] Visit `/demo` — confirm demo mode renders without auth.
- [ ] Send a magic-link email to yourself — confirm arrival and login flow works.
- [ ] Check Vercel Logs → Cron — verify `*/5` invocations appear after first trigger.
- [ ] Visit `/admin/settings` — set the picks deadline.
- [ ] Visit `/admin/users` — confirm seeded users appear.
- [ ] Visit `/leaderboard` and `/scores` — confirm data renders from Neon.

---

## Seasonal Operations Runbook

### Before the Tournament (~March 16)
1. Upgrade Vercel account to **Pro**.
2. Ensure all env vars are set in Vercel dashboard.
3. Run `vercel --prod` (or push to `main` if CI deploy is configured).
4. Run Day 0 Sheet seed: `npx tsx prisma/seed-from-sheet.ts`.
5. Set picks deadline in `/admin/settings`.

### During the Tournament (Mar 19 – Apr 6)
- **Cron** runs every 5 min automatically — monitor in Vercel Logs.
- Use `/admin/sync` for a manual ESPN sync if needed.
- Use `/admin/sheet-import` to re-bootstrap from Sheet if ESPN is down for an extended period.
- Use `/admin/users` to flip `isPaid` as payments come in.

### After the Tournament (~April 7)
1. Downgrade Vercel account back to **Hobby** ($0/mo).
2. Neon automatically pauses compute after inactivity — no action needed.
3. The app continues to serve pages; the 5-min cron stops firing on Hobby (no live updates, but that's fine in the off-season).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Magic links don't work | `AUTH_URL` mismatch | Ensure `AUTH_URL` matches the exact deployed domain |
| Cron not firing | On Hobby plan | Upgrade to Pro |
| `PrismaClientInitializationError` | Missing `url` in schema | Add `url = env("DATABASE_URL")` to datasource block |
| ESPN sync fails silently | `CRON_SECRET` mismatch | Re-check `CRON_SECRET` env var in Vercel matches your `.env` value |
| Google Sheets import fails | Service account not shared | Share Sheet with service account email and check `GOOGLE_PRIVATE_KEY` escaping |
