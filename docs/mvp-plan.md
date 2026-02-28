# Super 8s — MVP Plan

> **Last updated:** Feb 28, 2026  
> **Scope:** Scoping the first production-ready MVP: Google Sheets ingest → Neon DB → live ESPN updates (with Sheet fallback) → read-only UI hooked to real BE → Vercel deploy.

---

## 1. Current State Assessment

The codebase is **already very close to MVP-ready**. It's a Next.js 16 App Router monorepo with:

| What exists | Status |
|---|---|
| Neon PostgreSQL + Prisma 7 schema | ✅ Done |
| NextAuth v5 magic-link auth (Resend) | ✅ Done |
| ESPN scoreboard sync (cron + manual) | ✅ Done |
| Leaderboard with TPS + bracket-aware PPR | ✅ Done |
| Picks form (8-team pick, deadline enforcement) | ✅ Done |
| Live scores page | ✅ Done |
| Simulator | ✅ Done |
| Admin panel (users, settings, sync, CMS) | ✅ Done |
| `/demo` mode (full app, no auth, in-memory) | ✅ Done |
| `vercel.json` with cron config | ✅ Done |
| Google Sheets integration | ❌ Missing |
| `GOOGLE_SHEETS_ID` / service account env | ❌ Missing |
| Google Sheets → DB bootstrap script | ❌ Missing |
| Fallback: ESPN fails → read from Sheet live | ❌ Missing |
| Vercel project / env wiring | ❌ Not deployed |

**The real gap is the Google Sheets integration layer.** Everything else is built or nearly built.

---

## 2. MVP Scope (What We're Building)

### 2.1 Core Principles for MVP

- **UI is mostly read-only for users** — leaderboard, scores, simulator, and their own picks view.
- **Only user action:** submitting/updating picks before the deadline.
- **Admin controls all data edits** — no user-facing CRUD except picks.
- **Google Sheet remains your source of truth** for Day 0 bootstrap and as an authoritative fallback.
- **ESPN is the live update engine** during the tournament; Sheet is the safety net.

### 2.2 User-Facing Pages (Logged-in)

| Page | Read/Write | Notes |
|---|---|---|
| `/leaderboard` | Read-only | Live standings, TPS sort, charity for top 4 |
| `/picks` | Write (pre-deadline) / Read-only (post) | Their 8 picks, bracket view |
| `/scores` | Read-only | Live game scores from ESPN, 60s refresh |
| `/simulator` | Read-only compute | Client-side hypothetical overrides, no DB writes |

### 2.3 Admin-Only

| Page | Purpose |
|---|---|
| `/admin/users` | Mark `isPaid`, change roles |
| `/admin/settings` | Set picks deadline, payouts, charities |
| `/admin/sync` | Manual ESPN sync trigger |
| `/admin/sheet-import` | **NEW** — trigger Google Sheets → DB bootstrap |

---

## 3. Google Sheets Integration Layer (New Work)

This is the largest new chunk.

### 3.1 Confirmed Sheet Structure

The Sheet has **3 tabs** — we read from all three but write to none (Sheet remains your source of truth).

---

**Tab: `Leaderboard`** — authoritative combined view per player

| Sheet Column | Maps to | Notes |
|---|---|---|
| `Player` | `User.name` | Match by name or email |
| `Paid` | `User.isPaid` | `TRUE/FALSE` |
| `Rank` | _computed_ | Don't import — recalculate in app |
| `Score` | _computed_ | Derived from wins in app |
| `PPR` | _computed_ | Recalculated in app |
| `Total Potential Score` | _computed_ | TPS = Score + PPR |
| `Teams Left` | _computed_ | Count alive picked teams |
| `NonProfit` | `Pick.charityPreference` | One value per player |
| `Prize $` / `Donation $` / `Winnings Sent` | _display only_ | Not stored in DB |
| `Team 1` … `Team 8` | `Pick.teamId` (×8) | Team names → look up `Team.id` |

---

**Tab: `Teams`** — one row per NCAA team, your manually-maintained W/L record

| Sheet Column | Maps to | Notes |
|---|---|---|
| `Team` | `Team.name` | Primary key for name matching |
| `Seed` | `Team.seed` | Integer 1–16 |
| `In / Out` | `Team.eliminated` | `"Out"` → `eliminated=true` |
| `Games Won` | `Team.wins` | This is our Day 0 bootstrap value |
| `Games Remaining` | _computed_ | Not stored — derived from wins |
| `Selected` | _read-only_ | Count of picks — recalculated in app |
| `Score` | _computed_ | `seed × wins` — recalculated |
| `PPR` | _computed_ | Recalculated in app |

> **Region is not in the Teams tab.** We'll need to either: (a) add a `Region` column to the Sheet (non-destructive — just a new column), or (b) resolve region from ESPN data when we do the first ESPN sync. Option (b) is preferred to avoid modifying the Sheet.

---

**Tab: `Players`** — Google Form responses + computed columns

| Sheet Column | Maps to | Notes |
|---|---|---|
| `Email Address` | `User.email` | Primary key for user matching |
| `Enter Your First and Last Name` | `User.name` | |
| `Timestamp` | _ignored_ | Form submission time |
| `Team 1` … `Team 8` (first set) | `Pick` (×8) | Raw team names from form |
| `Paid` (in Summary) | `User.isPaid` | |
| `Total Score`, `Total PPR`, etc. | _computed_ | Not imported — recalculated in app |
| `Charity` | `Pick.charityPreference` | Last column |

> **The Score/PPR/In-Out/Duplicate/Concatenate columns** are computed columns in the Sheet — we **do not import these**. We only read: Email, Name, Team 1–8 (raw picks), Paid, and Charity.

### 3.2 New Files

```
src/lib/sheets.ts          # Google Sheets API client + read helpers
src/app/api/admin/sheets/  # POST: trigger Sheet import or live fallback read
prisma/seed-from-sheet.ts  # CLI script: Day 0 bootstrap from Sheet → Neon
```

### 3.3 Google Sheets API Setup

We'll use the **Google Sheets API v4 with a Service Account** (no OAuth flow needed):

1. Create a Google Cloud project → enable Sheets API.
2. Create a Service Account → download JSON key.
3. Share your Sheet with the service account email.
4. Add to `.env.local`:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

5. Install the Sheets client:

```bash
npm install googleapis
```

### 3.4 Day 0 Bootstrap (`seed-from-sheet.ts`)

Run this **once before the tournament starts** to seed Neon from the Sheet:

```bash
npx tsx prisma/seed-from-sheet.ts
```

It will:
1. Read **`Teams`** tab → upsert all 64 teams (name, seed, wins, eliminated) into Neon. Region is resolved on first ESPN sync.
2. Read **`Players`** tab → create users by email + name, upsert their 8 picks (matched by team name), set `isPaid` and `charityPreference`.
3. Cross-check **`Leaderboard`** tab for any `Paid` or `NonProfit` fields not in Players.
4. Upsert `AppSettings` singleton (picks deadline must be set manually in `/admin/settings` post-import).

### 3.5 Live Fallback Flow

During the tournament, the ESPN cron runs every 5 minutes. If it fails, we fall back to re-reading the Sheet for current team win/loss data:

```
/api/cron/sync
  → try: syncTournamentData() from ESPN
  → catch: fallback syncFromSheet() — reads Teams tab, updates wins/eliminated in Neon
  → return SyncResult with fallback=true flag
```

The `/api/scores` endpoint similarly:
```
GET /api/scores
  → try: fetchESPNScoreboard()
  → catch: readScoresFromSheet() — returns LiveGameData[] from Sheet
```

The Sheet is always manually updated by you, so it's always at least as accurate as the last time you saved it.

### 3.6 Admin Sheet Import Panel (`/admin/sheet-import`)

A simple admin page with:
- A "Re-import from Sheet" button
- A results table showing what was upserted vs skipped
- A "Run as dry-run" toggle

---

## 4. Decoupling & Architecture Cleanup

You mentioned wanting to decouple BE from FE better. Here's the assessed state:

### 4.1 What's Already Well-Decoupled

The architecture is actually cleaner than you might think:
- **Server Components** fetch from Prisma directly — no client-side DB access.
- **Client Components** only call `/api/*` endpoints.
- **`scoring.ts` and `bracket-ppr.ts`** are pure functions — zero framework coupling.
- **Demo mode** is fully decoupled from the real data layer via `DemoProvider`.

### 4.2 Remaining Couplings to Address for MVP

| Issue | Fix |
|---|---|
| Schema has no `datasource db url` field — relies on env var but `schema.prisma` lacks `url = env("DATABASE_URL")` | **Add to schema** |
| Direct Prisma calls in some RSCs (leaderboard page) bypass the API layer | **OK for MVP** — RSCs calling Prisma is idiomatic Next.js App Router. Only worth splitting if you want a separate API service. |
| ESPN sync always writes to DB even if data unchanged | **Low priority for MVP** — adds mild write overhead |

### 4.3 Recommended MVP Architecture Decision

**Keep it as a Next.js monorepo for MVP.** The "decouple BE from FE" goal is best served by:
1. Ensuring all data mutations go through `/api/*` routes (not direct Prisma in Client Components — which is already the case).
2. Adding the Sheets layer as new `src/lib/sheets.ts` + API routes.
3. Keeping the cron in `vercel.json`.

If you later want a completely separate Express/Fastify BE, that's a Phase 2 refactor. For MVP, Next.js API routes ARE your BE.

---

## 5. Vercel Deployment Plan

### 5.1 Pre-Deploy Checklist

- [ ] **Neon project**: create or confirm production Neon project + get pooler URL (`DATABASE_URL`) and direct URL (`DIRECT_URL`).
- [ ] **Resend account**: verify a sending domain, get `AUTH_RESEND_KEY`, set `RESEND_FROM_EMAIL`.
- [ ] **Google service account** JSON + Sheet shared with it.
- [ ] Generate `AUTH_SECRET`: `openssl rand -base64 32`.
- [ ] Generate `CRON_SECRET`: `openssl rand -base64 32`.
- [ ] Run `npm run db:migrate` against production Neon to apply schema.
- [ ] Run `npx tsx prisma/seed-from-sheet.ts` to bootstrap Day 0 data.
- [ ] Run `npm run db:seed` to upsert `AppSettings` singleton.

### 5.2 Vercel Project Setup

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project (first time)
vercel link

# 3. Set environment variables (or use Vercel dashboard)
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production
vercel env add AUTH_URL production              # https://your-domain.vercel.app
vercel env add AUTH_RESEND_KEY production
vercel env add RESEND_FROM_EMAIL production
vercel env add CRON_SECRET production
vercel env add GOOGLE_SHEETS_ID production
vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
vercel env add GOOGLE_PRIVATE_KEY production

# 4. Deploy
vercel --prod
```

### 5.3 Vercel Cron

Already configured in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/sync", "schedule": "*/5 * * * *" }]
}
```

The cron only runs in production on Vercel. It will call `/api/cron/sync` with `Authorization: Bearer <CRON_SECRET>`.

### 5.4 Custom Domain (Optional)

Set `AUTH_URL` to your custom domain (e.g., `https://super8s.yourdomain.com`) — this is required for magic link emails to resolve correctly.

### 5.5 `prisma.schema` Datasource Fix

The current schema is missing the `url` directive. **Must fix before deploy:**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

---

## 6. Open Questions (Still Need Your Input)

1. **ESPN vs Sheet precedence** — When ESPN confirms a FINAL result, should it overwrite your manually-maintained Sheet values in Neon, or should your Sheet always win? 
   - **Recommended:** ESPN wins on FINAL game results (wins/eliminated) since it's objective. Your Sheet-maintained values are the fallback when ESPN is unavailable.
   - Agree with this? Or do you need Sheet to stay authoritative throughout?

2. **ESPN fallback scope** — Fall back at the **sync level only** (cron fails → admin alert, Sheet values already in Neon are stale but correct from last manual update) or at the **per-request level** (every `/api/scores` call tries ESPN first, then hits Sheet live)?
   - Per-request fallback is safer but adds latency and Sheet API quota usage.
   - Sync-level fallback is simpler: Sheet → Neon one-way, ESPN overwrites when alive.

3. **Pick editing** — Can users update their picks before the deadline, or submit-once? *(PUT endpoint already exists — just confirming policy.)*

4. **User access** — Open registration via magic link (anyone can sign in with their email), and you manually flip `isPaid` in the admin panel? Or do you want an allowlist?

5. **Vercel plan** — Do you have Vercel Pro? The every-5-min cron requires Pro+. Free tier allows 2 crons/day only.

---

## 7. Build Phases

### Phase 1 — Google Sheets Integration (1–2 days)

- [ ] Add `googleapis` package
- [ ] Create `src/lib/sheets.ts` — service account client + read functions
- [ ] Create `prisma/seed-from-sheet.ts` — Day 0 CLI bootstrap
- [ ] Extend `src/lib/espn.ts` — add `syncFromSheet()` fallback
- [ ] Add `src/app/api/admin/sheets/route.ts` — admin-triggered Sheet import
- [ ] Add `/admin/sheet-import` page + component
- [ ] Fix `prisma/schema.prisma` datasource `url` field
- [ ] Update `.env.example` with new vars

### Phase 2 — Vercel Deploy (0.5 days)

- [ ] Run `db:migrate` against production Neon
- [ ] Seed from Sheet (Day 0)
- [ ] Set all env vars in Vercel dashboard
- [ ] `vercel --prod`
- [ ] Verify cron fires (check Vercel logs)
- [ ] Send test magic link to confirm email flow

### Phase 3 — Tournament-time Operations

- [ ] Monitor cron logs in Vercel dashboard
- [ ] Use `/admin/sync` for manual syncs if needed
- [ ] Use Sheet fallback if ESPN is down during a round
- [ ] Admin updates `isPaid` via `/admin/users` as payments come in

---

## 8. What We're NOT Doing in MVP

- No separate Express/Node.js BE (Next.js API routes cover it)
- No real-time WebSockets (60s poll is fine for march madness pace)
- No payment processing (manual `isPaid` flag set by admin)
- No bracket submission workflow (teams picked from a list, not a bracket drag-and-drop UI for submission)
- No email notifications when scores update
- No public leaderboard without login

---

## 9. Key Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `url = env("DATABASE_URL")` + `directUrl` |
| `src/lib/sheets.ts` | Create | Google Sheets v4 client, typed read helpers |
| `prisma/seed-from-sheet.ts` | Create | Day 0 bootstrap CLI |
| `src/lib/espn.ts` | Modify | Add `syncFromSheet()` fallback, wrap `syncTournamentData()` |
| `src/app/api/admin/sheets/route.ts` | Create | POST: trigger Sheet import |
| `src/app/api/scores/route.ts` | Modify | Wrap ESPN fetch with Sheet fallback |
| `src/app/admin/sheet-import/page.tsx` | Create | Admin UI for Sheet import |
| `.env.example` | Modify | Add Google Sheets vars |
| `vercel.json` | OK | Already configured |
| `CLAUDE.md` | Update | Document Sheets integration |

---

*This document lives at `docs/mvp-plan.md`. Update it as decisions are made.*
