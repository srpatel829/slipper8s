# Slipper8s — CLAUDE.md
## Working Instructions for Claude Code Sessions

**Full product specification: Slipper8s_Spec_v9.docx — read it before making architectural decisions.**
**This file is the daily brief. The spec is the source of truth.**

---

## What We Are Building

Slipper8s (slipper8s.com) is a free college basketball tournament prediction game. Players pick 8 teams. Scoring = seed x wins. Highest total wins. 10-year history (265 players in 2025). Moving from Google Forms/Sheets to a proper web app for 2026.

We are building on top of an existing Next.js codebase (originally called "Super 8s") built by Sumeet's brother. Do not start from scratch. Read the existing code before proposing changes.

---

## First Thing Every Session

1. Read this file completely
2. Read the specific files relevant to today's task (listed below in File Map)
3. Tell the user your plan before writing any code
4. Do not assume — verify existing code structure before proposing changes
5. Be honest and critical — do not be a cheerleader. If something is wrong or risky, say so.

---

## Key Deadlines

- **March 14, 2026** — Site goes live after bracket announced on Selection Sunday
- **March 19, 2026 at 12:15pm ET** — Entry deadline (server-side UTC, millisecond precision)
- **April 7, 2026** — Tournament ends

---

## Tech Stack (Actual — Do Not Deviate)

- **Framework:** Next.js 16 App Router (monorepo — FE + BE together)
- **Language:** TypeScript
- **Frontend:** React 19, Tailwind v4, shadcn/ui
- **ORM:** Prisma 7 with @prisma/adapter-neon
- **Database:** Neon PostgreSQL (serverless, free tier, auto-pauses off-season)
- **Auth:** NextAuth v5 — magic link via Resend (primary), Google OAuth (to add)
- **Email (auth):** Resend — magic links only
- **Email (notifications):** TBD — Resend free tier is 100 emails/day, may need upgrade for tournament notifications
- **Hosting:** Vercel (Hobby free tier off-season, Pro $20/month during tournament)
- **Cron:** Vercel cron (`*/5 * * * *`) — requires Vercel Pro plan
- **Error tracking:** Sentry (to add)
- **File storage:** Cloudinary or AWS S3 (to add — not yet implemented)
- **Cache:** Upstash Redis / Vercel KV (to add — critical for leaderboard)
- **Prisma client path:** `src/generated/prisma` — always import from `@/generated/prisma`, never `@prisma/client`

---

## Terminology — Critical

His codebase uses different terms than our spec. Always use our spec terms in new code, UI, and documentation. When reading his existing code:

| His term | Our term | Meaning |
|---|---|---|
| TPS (Total Projected Score) | Max Score | Score + PPR |
| PPR (Potential Points Remaining) | PPR | Same — keep this term |
| Points / currentScore | Score | Actual points earned |

**Never introduce TPS into new code or UI. Use Score, PPR, Max Score exclusively.**

---

## Scoring Definitions — Three-Term System (Use Everywhere)

- **Score** — actual points earned to date. `seed × wins` for each of the player's 8 teams. Based entirely on real game results. Immutable once a game is final.
- **PPR (Potential Points Remaining)** — maximum additional points a player could still earn. Forward-looking only. Uses bracket-path collision analysis. Never uses naive `seed × remaining games`.
- **Max Score** — `Score + PPR`. The ceiling a player could reach if everything goes their way.

Do not use "Maximum Possible Score," "Max Potential Score," "TPS," or any other variants anywhere in new code, UI, or documentation.

---

## Non-Negotiable Architectural Rules

### 0. Three-Layer Separation
Maintain logical separation even within the Next.js monorepo:
- **Frontend (React Client Components):** UI only. No business logic. No direct DB calls.
- **Backend (API Routes + Server Components):** All calculations, ESPN polling, score recalculation.
- **Data Layer (Prisma + Neon):** Storage only. No business logic.

Server Components calling Prisma directly is acceptable (idiomatic Next.js App Router). Client Components must never import Prisma or call DB directly — API routes only.

### 1. Leaderboard Caching — #1 Priority Fix
**This is the most critical architectural gap in the current codebase.**
The current leaderboard uses `cache: "no-store"` and queries the database on every user page load. This will not scale.

Fix: Write computed leaderboard JSON to Upstash Redis/Vercel KV on every cron tick. Serve from cache only. Invalidate only when a game result changes scores. 50,000 users refreshing = zero database queries between game results.

### 2. Single Internal Poller, No User-Triggered External API Calls
One background service polls ESPN on schedule via Vercel cron. User requests never trigger an ESPN API call.
```
No games today:               every 2-3 hours
Games scheduled, not started: every 5 minutes
Game in progress:             every 60 seconds
All today's games complete:   every 2-3 hours
Tournament complete:          stop
```
Current cron is fixed at every 5 minutes — update to dynamic frequency.

### 3. Completed Games Are Immutable
Once `status = FINAL`, never re-fetch. Historical data (2015-2025) hardcoded — never queries any external API.

### 4. Score Recalculation Is Sequential, Never Parallel
Queue all recalculations in order:
1. Save game result (status = FINAL)
2. Update team wins
3. Recalculate all entry scores
4. Recalculate PPR / Max Score
5. Recalculate Optimal 8
6. Recalculate efficiency %
7. Update rankings AND percentiles
8. Save score snapshots (BEFORE invalidating cache)
9. Invalidate leaderboard cache
10. Notify affected players

If any step fails, roll back to last good snapshot state.

### 5. Validate All External API Responses
Alert admin if ESPN response structure changes. Never silently ingest malformed data.

### 6. Draft Picks Saved Server-Side
Bracket picker state saves to database as player makes picks. Not just on final submit.

### 7. Deadline Is Server-Side UTC Only
Stored and enforced in UTC. **Deadline: March 19, 2026 at 12:15pm ET.**
Server timestamp is authoritative. In-flight submissions after deadline rejected.

### 8. Season-Specific Data Structures
Never hardcode the bracket. Year references are variables, not hardcoded values.

### 9. Manual Game Result Override
Admin panel must allow manual entry of game results for any game. Overrides ESPN or fills in if ESPN fails. Same recalculation queue fires either way.

### 10. Pre-Deadline Information Fairness
No player should gain an informational advantage based on when they submit.

**Before deadline — show only:**
- Universal information identical for every player
- Objective external data (team stats, probabilities, historical results)
- Information about the player's own picks only

**After deadline — unlock:**
- % of field who picked each team
- Most/least popular picks
- Seed distribution across all entries
- Archetype distribution across all players
- Stats page
- Popularity view on team browser

A player's own archetype may be shown on their confirmation screen before deadline. Never show how many others share that archetype until after deadline.

Apply this rule proactively — flag anything that could give timing-based information advantage.

---

## Admin Export — The Failsafe (Build First)

This is the most critical feature. Build it first. Test it most thoroughly. Must work even if everything else is broken. This is the safety net that allows the game to be run manually via Google Sheets if the app has issues.

**Export contains:** player name, email, submission timestamp, last-edited timestamp, 8 picks (team names + seeds)

**Schedule:**
- Manual: anytime, one click from admin panel
- Automated: twice daily until deadline
- Final: automatic at 12:15pm ET March 19th

**Format:** mirrors Google Forms/Sheets export — drop-in replacement for existing manual process

**Most recent valid submission per player** — reflects final edited state with last-edited timestamp

---

## What's Already Built (Do Not Rebuild)

Review these before doing any work in their area:

- **Bracket-aware PPR algorithm** (`src/lib/bracket-ppr.ts`) — correct, well-tested, keep as-is
- **Scoring logic** (`src/lib/scoring.ts`) — clean pure functions, extend don't rewrite
- **ESPN integration** (`src/lib/espn.ts`) — working poller, cron, manual sync
- **Demo mode** (`/demo`, `src/lib/demo-context.tsx`, `src/lib/demo-game-sequence.ts`) — full app mirror with 2025 real data, game-by-game timeline, bar chart race foundation. This is a major asset — do not break it.
- **Auth** (`src/lib/auth.ts`, `src/lib/auth.config.ts`) — magic link working
- **Admin panel basics** — users, settings, sync, CMS
- **Picks form** with bracket view, conflict detection, view modes
- **Simulator** with cascade bracket logic

---

## What Needs to Be Built or Fixed

Priority order:

1. **Leaderboard caching** (Redis/Vercel KV) — architectural fix, do first
2. **Admin Excel export** (the failsafe)
3. **Manual game result input** (ESPN failsafe)
4. **Rebranding** (Super 8s → Slipper8s, remove "March Madness" usage)
5. **Terminology update** (TPS → Max Score throughout)
6. **Google OAuth** (add alongside existing magic link)
7. **Season-aware schema** (Program, TeamSeason, Season, ScoreSnapshot models)
8. **Player profiles**
9. **Private leagues**
10. **Share cards / Open Graph**
11. **Email notifications** (beyond magic links)
12. **Tier names + competition ranking**
13. **Percentile rankings**
14. **Pre-tournament Expected Score** (KenPom + Silver Bulletin)
15. **Team name normalization dictionary**
16. **Historical data migration** (2017-2025 CSV files)

---

## Feature Tiers & Build Priority

### TIER 1 — Live by March 14th
- Player registration (magic link + Google OAuth)
- Entry form + pick submission
- Draft picks saved server-side as player makes selections
- Team display with logos, full names, seed colors
- Team hover/tap cards (full spec below)
- Pre-tournament Expected Score per team (stored once at bracket announcement)
- Player archetypes (own confirmation screen only)
- Multiple pick display views + filters
- How to Play explanation + worked example
- 2025 highlights (champion, Optimal 8, bar chart race preview)
- Private leagues (invite codes, basic league leaderboard)
- Share cards / Open Graph (pre-deadline version)
- Email notifications — signup confirmation, pre-deadline reminders (24hr, 1hr)
- Bug reporting button (prominent, admin alert on submission)
- Admin Excel export (manual + twice daily + final at deadline)
- Manual game result input (ESPN failsafe)
- Admin panel (deadline, export, manual sync, user management)
- Mobile responsiveness (mobile <768px, tablet 768-1199px, desktop 1200px+)
- SSL, DNS, domain redirects (sleeper8s.com → slipper8s.com)
- Legal pages (ToS, Privacy Policy)
- Demo environment (separate deployment, 2025 data — already built)
- Admin sandbox toggle

### TIER 2 — Target March 14th, acceptable by March 19th
- ESPN poller dynamic frequency
- Score, PPR, Max Score calculations (rename from TPS)
- Leaderboard with caching
- Live scores / game schedule page
- Tier names + competition ranking (T4, T4, 6 format)
- Percentile rankings
- Stats page (post-deadline only)
- Popularity view (post-deadline only)
- Share card — living card with rank
- Hall of Champions (2025 focus)
- Email notifications — field is set, game starts
- Bar chart race (leverage existing demo code)
- Player profiles with history

### TIER 3 — During tournament (March 19 → April 7)
- Multi-dimensional rankings (gender, state, school, conference)
- Live Expected Score (adjusts as results come in)
- Email notifications — team wins/losses, leaderboard moves
- KenPom integration (deeper)
- Post-deadline share cards
- What If bracket (planned V2)

### TIER 4 — 2027
- Native mobile app
- NCAAW bracket

---

## Pick UX — Multiple Display Views

**Display Views (toggle):**
- **Bracket view** — traditional matchups by region (default) — already built
- **Seed grid view** — teams by seed tier (1-4, 5-8, 9-12, 13-16) vs regions
- **Conference view** — teams grouped by conference
- **My Picks view** — shows only the player's 8 selected teams
- **Expected Score view** — teams ranked by expected score
- **Popularity view** — POST-DEADLINE ONLY

**Filters (stackable):**
- By seed range
- By region
- By conference
- Unpicked only
- By win/loss record threshold
- Sleeper filter (high expected score relative to seed)

---

## Team Hover/Tap Card — Full Spec

- Logo + full name
- Seed number + seed color
- Region
- S-Curve ranking
- Conference
- Season record (W-L)
- KenPom ranking
- ESPN BPI rating + ranking
- Pre-tournament Expected Score
- Cinderella signal (wins as underdog this season)
- Upset risk (losses as favorite this season)
- Whether already picked (highlighted)
- % of field who picked this team — POST-DEADLINE ONLY

---

## Color Palette

| Role | Name | Hex |
|---|---|---|
| Primary | NCAA Light Blue | #009FDA |
| Secondary | Dark Blue | #0D3F65 |
| Tertiary | Orange | #DC6B1F |
| Text/Dark | Near Black | #0A0A14 |
| Background | Off White | #F8FAFB |

**Note:** Current codebase uses a dark theme (deep slate background, orange primary). We are switching to the light theme above. Update `globals.css` CSS variables.

### Seed Colors
```
Seeds 1-4:   Red    #C0392B
Seeds 5-8:   Orange #E67E22
Seeds 9-12:  Gold   #D4AC0D
Seeds 13-16: Green  #27AE60
```
**Note:** Current codebase uses primary/blue/emerald/purple for seed tiers. Replace with above.

---

## Tier Names & Percentile Rankings

### Tier Names (Exact)
```
Champion      = 1st
Runner Up     = 2nd
Final 4       = 3rd-4th
Elite 8       = 5th-8th
Sweet 16      = 9th-16th
Worthy 32     = 17th-32nd
Dancing 64    = 33rd-64th
Play In 68    = 65th-68th
Below 68th    = no tier name — show percentile only
```

### Percentile Rankings
Show for ALL players in all 6 ranking dimensions. Format: "Top 0.1%", "Top 18%", "Top 45%"
Store both absolute rank and percentile per year in player history.

---

## Data Architecture

### Team Name Normalization — Build First
Canonical dictionary before any other data work. ~360 programs, canonical name + all known variants. Every pipeline normalizes through this.

### Program vs TeamSeason
- **Program:** Permanent. Florida Gators. Never changes.
- **TeamSeason:** Seasonal. Florida 2025 = 1-seed, 6 wins, champion. Historical records IMMUTABLE.

### Schema Extensions Needed
Current schema has a single flat `Team` table. We need to add:
```
Season:           year, entry_deadline_utc, status, sponsor_details
Program:          canonical_name, aliases[], current_conference, logo_url
TeamSeason:       program_id, season_id, seed, region, s_curve_rank,
                  kenpom_rank, bpi_rating, bpi_rank, games_won, eliminated,
                  is_playin_slot, resolved_team_id, record, champion_flags,
                  win_probabilities_by_round[], last_updated
ScoreSnapshot:    entry_id, game_result_id, score, rank, percentile, saved_at
LeaderboardCache: league_id, season_id, snapshot_json, last_updated
WinProbability:   teamseason_id, round, probability, source, fetched_at
UpsetHistory:     teamseason_id, game_date, opponent, result, was_underdog, score
ConferenceMapping: program_id, conference, season_id
```

Also update Entry model:
```
Entry: add ppr, max_score fields (replacing/supplementing current PPR implementation)
```

### Historical Data
Files live locally in `/data/historical/` — never pushed to GitHub (contains personal data).
Years available: 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025 (no 2020 — Covid).
One idempotent migration script per year. Running twice must not create duplicates.

---

## Data Sources

### KenPom — Verify First
Make authenticated test API call first session. Document every endpoint before building.

### Silver Bulletin
Authenticated Substack scraper. Validate column structure on every import.
Silver Bulletin columns are CUMULATIVE — derive marginals:
```
P(win R64)   = rd2_win
P(win R32)   = rd3_win - rd2_win
P(win S16)   = rd4_win - rd3_win
P(win E8)    = rd5_win - rd4_win
P(win F4)    = rd6_win - rd5_win
P(win Champ) = rd7_win - rd6_win
```

### ESPN Unofficial JSON API
Single poller only. Validate structure on every call. Manual override in admin for every game.
Round detection: parse `competition.notes[0].headline` (e.g. "Elite Eight - East Regional").

---

## Key Display Rules

### Multiple Entry Naming
- Single entry: Ankur Patel
- Multi with nickname: Arjun (Ankur Patel 2)
- Multi without nickname: Ankur Patel 2
- NEVER just "Ankur Patel" for multi-entry

### Copy Rules
- Never use "March Madness" — currently used in codebase, must be removed
- Never use "midnight" — deadline is 12:15pm ET
- Deadline stored UTC, displayed in user's local time with ET shown

### isPaid and Charity
- Global game is free — no payment at global level
- isPaid and charity are private league features only
- Charity: Champion 50%, Runner Up 25%, 3rd 12.5%, 4th 12.5%

---

## Bug Reporting

- Prominent button on every page
- Form: description + auto-captures page URL, timestamp, user info if logged in
- Triggers immediate email to admin (Sumeet)
- Admin panel shows all reports with status tracking
- Mentioned in About page with direct link

---

## Environments

**Demo Environment:** Already built at `/demo`. Uses 2025 real data, zero auth, zero DB. Keep working. Use for testing new features before they touch live data.

**Admin Sandbox Toggle:** Within live site, admin-only. Simulate results, preview leaderboard. Invisible to players.

---

## Security

- All secrets in environment variables. Never in Git.
- `.env.example` lists all required variables (no values)
- Rate limit: max 100 requests/minute per IP
- Server-side pick validation: max 8, no duplicates, valid teams, before deadline
- Admin panel: admin flag + re-authentication
- Super-admins: Sumeet Patel (primary) + brother (secondary)
- Phone numbers encrypted at rest
- Profile photos: 5MB limit, resize 400x400px, store on Cloudinary/S3
- Soft delete: anonymize personal data, retain game history anonymized

---

## Environment Variables Required

```
DATABASE_URL          # Neon pooler URL
DIRECT_URL            # Neon direct URL (for migrations)
AUTH_SECRET           # NextAuth secret (openssl rand -base64 32)
AUTH_URL              # Base URL (https://slipper8s.com in prod)
AUTH_RESEND_KEY       # Resend API key
RESEND_FROM_EMAIL     # e.g. Slipper8s <noreply@slipper8s.com>
CRON_SECRET           # Bearer token for cron endpoint
GOOGLE_CLIENT_ID      # Google OAuth (to add)
GOOGLE_CLIENT_SECRET  # Google OAuth (to add)
KENPOM_USERNAME       # KenPom credentials (to add)
KENPOM_PASSWORD       # KenPom credentials (to add)
SENTRY_DSN            # Sentry error tracking (to add)
UPSTASH_REDIS_URL     # Leaderboard cache (to add)
UPSTASH_REDIS_TOKEN   # Leaderboard cache (to add)
CLOUDINARY_URL        # File storage (to add)
```

---

## Vercel Setup

- **Hobby (free):** off-season, 2 crons/day max
- **Pro ($20/month):** required for `*/5 * * * *` cron during tournament
- **Upgrade by:** March 16, 2026
- **Downgrade after:** April 7, 2026
- Vercel auto-deploys on push to `main` branch
- Cron config already in `vercel.json` — no changes needed

---

## Performance

Client-side polling every 60 seconds (no WebSockets). Leaderboard pagination: 50 per page, own row pinned. Load test: 1,000 simultaneous users before launch.

---

## Working Effectively in Claude Code

### Session Structure
Always start a session with:
1. "Read CLAUDE.md"
2. "We are working on [specific feature]"
3. "The relevant files are [list exact paths]"
4. "Do not touch anything outside these files unless you tell me first"
5. "Explain your plan before writing any code"

### File Pointers — Always Be Specific
Never say "fix the leaderboard." Say "fix the caching in `src/app/api/leaderboard/route.ts`."
Point to exact file paths to avoid wasting tokens searching the codebase.

### Key File Map (Read Before Touching That Area)
```
Scoring logic:        src/lib/scoring.ts
PPR algorithm:        src/lib/bracket-ppr.ts
ESPN sync:            src/lib/espn.ts
Auth:                 src/lib/auth.ts + src/lib/auth.config.ts
Picks API:            src/app/api/picks/route.ts
Leaderboard API:      src/app/api/leaderboard/route.ts
Scores API:           src/app/api/scores/route.ts
Cron:                 src/app/api/cron/sync/route.ts
Database schema:      prisma/schema.prisma
Demo data:            src/lib/demo-data.ts + src/lib/demo-users-2025.ts
Demo engine:          src/lib/demo-game-sequence.ts
Demo context:         src/lib/demo-context.tsx
Picks form:           src/components/picks/picks-form.tsx
Leaderboard table:    src/components/leaderboard/leaderboard-table.tsx
Bracket component:    src/components/bracket/advancing-bracket.tsx
Admin panel:          src/app/admin/
Global styles:        src/app/globals.css
Types:                src/types/index.ts
```

### When to Start a New Thread
- Switching to a completely different feature area
- Claude seems to be losing context or repeating itself
- Something went wrong and you want a clean start
- A session has gotten very long

### When to Continue the Same Thread
- Iterating on the same feature
- Fixing bugs in code just written
- Small follow-up changes

### If Things Go Wrong
- Stop Claude immediately — don't let it keep going
- Start a new thread rather than correcting mid-stream
- Always ask Claude to explain its plan BEFORE it writes code
- If the plan sounds wrong, correct it before a single line is written

### Model Choice
- **Sonnet:** Planning, discussing, spec writing, simple changes, boilerplate
- **Opus:** Complex algorithmic work, schema design, leaderboard caching, scoring engine

### Be Critical
Claude Code has a tendency to be agreeable. Push back with:
- "Is this the right approach or just the easiest one?"
- "What could go wrong with this?"
- "Are there any edge cases you haven't handled?"
- "Is this going to scale to 10,000 users?"

---

## Build Strategy — 2025 Data First

Build and validate ALL features using 2025 historical data BEFORE touching live 2026 data.

**2025 validation checklist:**
- [ ] All 265 entries display correctly
- [ ] Optimal 8 = exactly 99 pts: Arkansas(20)+BYU(12)+Ole Miss(12)+Colo.St(12)+McNeese(12)+Drake(11)+Michigan(10)+New Mexico(10)
- [ ] Champion Jig Samani = 79 pts, efficiency 80% (79/99)
- [ ] 10-way tie at 62nd-70th handled as T62-T70
- [ ] Bar chart race animates correctly through all 2025 rounds
- [ ] Max Score collision detection correct with same-region pick combinations
- [ ] Expected score correct using Silver Bulletin March 16 2025 file
- [ ] S-Curve tiebreaker resolves Optimal 8 correctly
- [ ] Percentile calculations correct across all 6 ranking dimensions
- [ ] Hall of Champions values match hardcoded data
- [ ] Team normalization matches teams correctly across all data sources

---

## Pre-Launch Checklist (All Must Pass Before March 14)
- [ ] SSL on both domains, HTTP redirects to HTTPS
- [ ] sleeper8s.com redirects to slipper8s.com
- [ ] DNS propagated
- [ ] All env vars set in production
- [ ] Database backup configured and tested
- [ ] All 2025 validation items pass
- [ ] Email sending tested (magic link + notifications)
- [ ] ESPN poller detecting bracket correctly
- [ ] Manual game result override tested
- [ ] Admin Excel export tested (manual + automated + final)
- [ ] Admin panel (Sumeet + brother only)
- [ ] Terms of Service + Privacy Policy live
- [ ] Load test passed (1,000 simultaneous users)
- [ ] robots.txt + sitemap.xml
- [ ] Open Graph tags verified via WhatsApp link preview test
- [ ] Sentry receiving test errors
- [ ] Maintenance mode page working
- [ ] Percentile calculations verified
- [ ] Bug reporting button live and admin alert tested
- [ ] Demo environment live with 2025 data
- [ ] "March Madness" removed from all copy
- [ ] Rebranding complete (Super 8s → Slipper8s)
- [ ] Leaderboard caching verified under load
- [ ] Vercel Pro plan active

---

## Not in V1
In-app payments, native apps, "March Madness" usage, SMS notifications, WebSockets, NCAAW bracket, What If bracket (planned V2)

---

## Open Questions
1. KenPom API scope: verify first session before building
2. Silver Bulletin scraping: verify authenticated download works before building
3. Historical player deduplication: some players used different emails across years — need admin merge tool
4. Notification email volume: Resend free tier is 100/day — may need paid plan during tournament
5. Google Workspace: set up Sumeet@slipper8s.com and help@slipper8s.com before launch

---

*Slipper8s — Where sleeper picks become glass slippers | slipper8s.com*
