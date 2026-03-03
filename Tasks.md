# Slipper8s — Tasks.md
## Session Task Tracker

**Last updated:** 2026-03-03
**Launch target:** March 16 (pre-launch ready), Tournament starts ~March 19

---

## CRITICAL — Fix First
- [ ] **Restore CLAUDE.md** — Last commit (8177e24) wiped all 917 lines. Restore from HEAD~1.

---

## Infrastructure & DevOps (Pre-Launch Blockers)
- [ ] Upgrade Vercel to Pro ($20/mo) — required for 5-min cron
- [ ] Replace AUTH_SECRET with real secure value
- [ ] Add CRON_SECRET to .env and Vercel
- [ ] Add AUTH_URL to Vercel env vars
- [ ] Add RESEND_FROM_EMAIL to Vercel env vars
- [ ] Set up Upstash Redis for leaderboard caching
- [ ] DNS — point slipper8s.com to Vercel (48hr propagation, do by March 10)
- [ ] Verify Resend sending domain
- [ ] SSL on both domains, HTTP redirects to HTTPS
- [ ] sleeper8s.com redirects to slipper8s.com
- [ ] Run db:seed on production
- [ ] Database backup configured and tested

---

## Schema & Data Model Gaps (Spec v11 vs Current)
Current schema is MVP-level. Spec requires significant additions:
- [ ] Player model expansion: username, favorite_program, country, state, gender, dob, phone, profile_photo, notifications_enabled
- [ ] Program vs TeamSeason split (current: single Team model)
- [ ] ConferenceMapping (season-specific)
- [ ] BracketPosition model (for collision detection)
- [ ] ScoreSnapshot model (per checkpoint)
- [ ] CheckpointDimensionSnapshot model (6 dimensions)
- [ ] LeaderboardCache model
- [ ] WinProbability model (Silver Bulletin data)
- [ ] League model (private leagues with invite codes)
- [ ] Entry model (separate from Pick — supports multiple entries per player)
- [ ] UpsetHistory model
- [ ] Season model
- [ ] GameResult model refinement

---

## Auth & Registration (Spec Gaps)
- [ ] Google OAuth (spec says both magic link AND Google OAuth)
- [ ] Username system: auto-suggest, set-once, profanity filter, uniqueness
- [ ] Registration flow with required fields (first, last, email, username)
- [ ] Optional profile fields (favorite team, country, state, gender, dob, phone, photo)

---

## Scoring & Analytics (Spec Gaps)
- [ ] Max Possible Score — bracket-path collision analysis (partially done via bracket-ppr.ts, needs full spec compliance)
- [ ] Optimal 8 with S-Curve tiebreaker
- [ ] Expected Score using Silver Bulletin marginal probabilities
- [ ] Percentile rankings across all 6 dimensions
- [ ] Max Rank / Floor Rank computation
- [ ] Score recalculation pipeline (sequential 10-step process from spec)
- [ ] Tier names (Champion, Runner Up, Final 4, etc.)

---

## Leaderboard (Spec Gaps)
- [ ] Multi-tab leaderboard: Global | By State | By Country | By Conference | By Gender | Private Leagues
- [ ] "No Response" handling for optional profile fields
- [ ] Default view: Top 10 + your entries + bottom 2
- [ ] Expanded row with team pills (green/yellow/red status)
- [ ] Hover/tap callout on team pills
- [ ] Leaderboard caching — never query DB on page load
- [ ] Mobile card view (spec has exact card format)
- [ ] Pinned own row

---

## Score History Chart (Spec Gaps)
- [ ] 4-5 default lines: Rolling Optimal 8, Leader, You, Median, Hindsight Optimal 8
- [ ] 10 fixed X-axis checkpoints
- [ ] Player filter to add additional lines
- [ ] Dimension super-filter
- [ ] Leader/Median toggle (Current vs Historical mode)

---

## Global Timeline Footer (Complex Feature)
- [ ] Persistent footer on every page
- [ ] Scrubber through all game checkpoints
- [ ] LIVE button with pulsing indicator
- [ ] Time-aware data queries throughout app
- [ ] Checkpoint system (game-level + session-level)
- [ ] Historical playback (2017-2025) — build first
- [ ] Live 2026 with three states: past/in-progress/future

---

## Simulator (Spec Gaps)
- [ ] Pre-loaded bracket picks for players who submitted
- [ ] Follow-the-team logic for eliminated picks
- [ ] Right side leaderboard panel with dimension selector
- [ ] By Region and By Seed views

---

## Email Notifications
- [ ] Welcome email
- [ ] Bracket announced / entries open
- [ ] Entry confirmation (on every save)
- [ ] Entries locked / tournament is live
- [ ] Final results
- [ ] Entry deadline reminder (24hr, optional)
- [ ] Play-in slot resolved (optional)
- [ ] Daily recap (optional)
- [ ] Real-time in-app flash notifications (websockets/SSE — post-launch)

---

## Share Cards
- [ ] Pre-tournament card (auto-generated on entry)
- [ ] During/post tournament card (on demand)
- [ ] Server-side image generation (Satori or html-to-image)
- [ ] Open Graph meta tags on shareable pages

---

## Landing Page
- [ ] Above fold: logo, countdown, dual auth CTAs
- [ ] "See How 2025 Played Out" link
- [ ] Live entry counter
- [ ] 3-step how it works
- [ ] Florida/McNeese worked example
- [ ] Private league callout
- [ ] Mobile-first design

---

## Admin Panel (Spec Gaps)
- [ ] Green/red status board dashboard
- [ ] Season setup wizard
- [ ] Conference mapping editor
- [ ] Username management (rename)
- [ ] Entry management (void/adjust)
- [ ] Play-in resolution monitor
- [ ] Checkpoint management
- [ ] Winner announcement trigger
- [ ] Broadcast email
- [ ] Audit log
- [ ] Export CSV/Excel

---

## External Data Integrations
- [ ] Silver Bulletin Excel ingestion + validation
- [ ] KenPom API integration ($95/yr) — verify endpoints first
- [ ] Team name normalization dictionary (~360 programs)

---

## Mobile-First Design
- [ ] Bottom tab bar navigation
- [ ] Leaderboard card view (<768px)
- [ ] Touch-optimized timeline scrubber
- [ ] Region drill-down bracket
- [ ] All data tables need mobile card equivalents

---

## Content & Legal
- [ ] How to Play page (3 sections from spec)
- [ ] FAQ — 25 questions from spec Section 11.1
- [ ] About page — Sumeet's exact copy
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] robots.txt + sitemap.xml

---

## Testing & Validation
- [ ] 2025 validation checklist (all 265 entries, Optimal 8 = 99pts, champion = 79pts, etc.)
- [ ] Load test: 1,000 simultaneous leaderboard requests
- [ ] Max Possible Score unit tests (collision scenarios)
- [ ] Open Graph tag verification (WhatsApp link preview)
- [ ] Sentry integration
- [ ] Maintenance mode page

---

## Private Leagues
- [ ] League model: name, admin, invite code (8+ alphanumeric)
- [ ] Create/join league flow
- [ ] League-specific leaderboard tab
- [ ] League invite on share cards

---

## Historical Data
- [ ] Migration scripts per year (2019-2025, idempotent)
- [ ] Historical bar chart race replay (deferred from V1 per spec)
- [ ] Hall of Champions

---

## Not in V1 (Explicitly Deferred)
- In-app payments
- Native apps
- SMS notifications
- Historical bar chart races 2019-2024
- NCAAW bracket
- WebSockets (use polling)
- Head-to-head comparison
