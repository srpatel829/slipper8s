# Slipper8s — Tasks.md
## Session Task Tracker

**Last updated:** 2026-03-08
**Launch target:** March 14 (registration open), March 19 (tournament starts)

---

## COMPLETED (across all sessions)

### Schema & Core Architecture
- [x] Expanded Prisma schema (Season, League, Entry, EntryPick, Checkpoint, ScoreSnapshot, AuditLog, user profile fields)
- [x] Google OAuth provider added alongside magic link
- [x] Registration flow with username auto-suggestion, availability check, profanity filter
- [x] Rebrand Super 8s → Slipper8s across entire codebase
- [x] Rewrite picks system to use Entry/EntryPick models
- [x] Multi-entry support (Entry-based scoring)
- [x] Leaderboard caching with Upstash Redis (in-memory fallback)
- [x] Score snapshot system for leaderboard history and timeline
- [x] Collision-aware max possible score calculation
- [x] Expected score calculation using Silver Bulletin 2025 probabilities
- [x] ESPN sync with smart cron scheduling, wins recalculation
- [x] Automatic entry score recalculation after ESPN sync
- [x] Rate limiting (100 req/min per IP) on all API routes
- [x] Security headers middleware

### Pages & UI
- [x] Landing page with countdown timer, worked example, league callout, live entry counter
- [x] How to Play page with 25 FAQ questions and About section
- [x] Leaderboard: percentile column, tier name badges, team pills (green/yellow/red), spec columns
- [x] Leaderboard dimension tabs (Global, By Country, By State, By Gender, By Conference, Fanbase, Private Leagues)
- [x] Score history chart with default 4 lines (Optimal 8, Leader, You, Median)
- [x] Teams tab: spec seed colors, % Selected sort, mobile cards, dimension filters
- [x] My Picks: By Region and By Seed views, bracket view, pick summary
- [x] User profile/settings page with editable fields
- [x] Leagues page (create, join, list)
- [x] Live bracket page with region-based display and user pick highlighting
- [x] Simulator with zoom controls, mobile-friendly default zoom
- [x] Global Timeline Footer with 10 checkpoint scrubber and LIVE button
- [x] Mobile-first UI, bottom tab bar navigation
- [x] Mobile-first leaderboard card view
- [x] Light/dark mode toggle
- [x] Brand color palette: Light Blue / Dark Navy / Orange
- [x] Seed colors consolidated (red/orange/gold/green)
- [x] Team callout component with hover/tap popover on team logos
- [x] Custom 404 page, PWA manifest, apple-touch-icon
- [x] Maintenance mode page with admin toggle and redirect
- [x] Terms of Service + Privacy Policy pages

### Admin Panel
- [x] Admin dashboard with season status, game progress, health board
- [x] Admin season management page and API
- [x] Admin entry management (void/adjust scores)
- [x] Admin league management (search, delete)
- [x] Admin username rename with inline editing and audit logging
- [x] Admin conference mapping editor
- [x] Admin CSV export (entries, players, leaderboard with rank/percentile)
- [x] Admin cache management and force refresh
- [x] Admin play-in resolution monitor
- [x] Admin audit log viewer
- [x] Admin broadcast email feature
- [x] Admin maintenance mode toggle
- [x] Admin final results email trigger
- [x] Admin wins recalculation tool
- [x] Admin confirmation dialogs for destructive actions

### Email System
- [x] Complete email notification system (welcome, confirmation, entries locked)
- [x] Bracket announced + play-in resolved email templates
- [x] Daily recap email (automatic after last game of day finalizes)
- [x] Admin broadcast email
- [x] Email cron job

### Share Cards & SEO
- [x] Share card component with download and native share support
- [x] Square share cards (1080x1080) for social platforms
- [x] OG image generation
- [x] Open Graph meta tags on shareable pages
- [x] robots.txt + sitemap.xml

### DevOps & Monitoring
- [x] Sentry error tracking integration
- [x] Load testing script for pre-launch validation
- [x] Dev auth bypass for testing

### UI Polish (agitated-poitras session)
- [x] Consolidate color system: separate status, region, and seed colors
- [x] Default to light mode, simplify theme toggle
- [x] Fix countdown timer
- [x] Fix timeline to 11 checkpoint positions
- [x] Archetype classification for 2025 players
- [x] Fix leaderboard sort order, tie display (T4), archetype emojis
- [x] Fix score history chart default lines
- [x] Bracket view mobile layout fix
- [x] Bracket & Simulator zoom controls

---

## Infrastructure & DevOps (Pre-Launch Blockers — need user action)
- [ ] Upgrade Vercel to Pro ($20/mo) — required for 5-min cron
- [ ] Replace AUTH_SECRET with real secure value
- [ ] Add CRON_SECRET to .env and Vercel
- [ ] Add AUTH_URL to Vercel env vars
- [ ] Add RESEND_FROM_EMAIL to Vercel env vars
- [ ] DNS — point slipper8s.com to Vercel (48hr propagation)
- [ ] Verify Resend sending domain
- [ ] SSL on both domains, HTTP redirects to HTTPS
- [ ] sleeper8s.com redirects to slipper8s.com
- [ ] Run db:seed on production
- [ ] Database backup configured and tested
- [ ] Set up Google OAuth credentials in Google Cloud Console

---

## STILL TODO — Code

### High Priority (pre-launch)
- [ ] Optimal 8 with S-Curve tiebreaker calculation
- [ ] Admin checkpoint management UI
- [ ] 2025 validation checklist (all items must pass — see CLAUDE.md)
- [ ] Visual verification of all pages (dev server never ran after UI polish)
- [ ] Share card: during/post tournament variants

### Medium Priority
- [ ] Silver Bulletin Excel ingestion + validation pipeline
- [ ] KenPom API integration
- [ ] Team name normalization dictionary (~360 programs)
- [ ] Historical data migration (2019-2025)

### Lower Priority (post-launch / 2027)
- [ ] Real-time in-app notifications (websockets/SSE)
- [ ] Historical bar chart race replay (2019-2024)

---

## Not in V1 (Explicitly Deferred)
- In-app payments
- Native apps
- SMS notifications
- NCAAW bracket
- Head-to-head comparison
