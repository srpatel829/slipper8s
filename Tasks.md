# Slipper8s — Tasks.md
## Session Task Tracker

**Last updated:** 2026-03-03
**Launch target:** March 16 (pre-launch ready), Tournament starts ~March 19

---

## COMPLETED (this session)
- [x] Restore CLAUDE.md from HEAD~1
- [x] Expanded Prisma schema (Season, League, Entry, EntryPick, Checkpoint, ScoreSnapshot, AuditLog, user profile fields)
- [x] Google OAuth provider added alongside magic link
- [x] Registration flow with username auto-suggestion, availability check, profanity filter
- [x] Rebrand Super 8s → Slipper8s across entire codebase
- [x] Landing page with countdown timer, worked example, league callout
- [x] Leaderboard: percentile column, tier name badges, team pills (green/yellow/red)
- [x] How to Play page with FAQ and About sections
- [x] SessionProvider wrapper for client-side auth hooks
- [x] Registration redirect in protected layout
- [x] Private Leagues CRUD (API + UI: create, join, list, delete)
- [x] Leaderboard dimension tabs (Global, By Country, By State, By Gender)
- [x] Updated leaderboard + API to pass user profile fields for dimension filtering

---

## Infrastructure & DevOps (Pre-Launch Blockers — need user action)
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
- [ ] Set up Google OAuth credentials in Google Cloud Console

---

## High Priority — Code (pre-launch)
- [ ] Admin season setup wizard (create season, set deadline, link to AppSettings)
- [ ] Email notifications: welcome email, entry confirmation, entries locked
- [ ] Mobile-first leaderboard card view (<768px)
- [ ] Bottom tab bar navigation for mobile
- [ ] Leaderboard caching with Upstash Redis (never query DB on page load)
- [ ] Open Graph meta tags on shareable pages
- [ ] Share cards: pre-tournament entry card (auto-generated)
- [ ] robots.txt + sitemap.xml
- [ ] Terms of Service + Privacy Policy pages

---

## Medium Priority — Code
- [ ] Score History Chart on real leaderboard (requires ScoreSnapshot data pipeline)
- [ ] Max Possible Score — bracket-path collision analysis improvements
- [ ] Optimal 8 with S-Curve tiebreaker
- [ ] Expected Score using Silver Bulletin marginal probabilities
- [ ] Multi-entry support (use Entry model instead of Pick model)
- [ ] Conference mapping for By Conference dimension
- [ ] Global Timeline Footer (scrubber through game checkpoints)
- [ ] League-specific leaderboard tab (fetch league members' scores)
- [ ] Admin: conference mapping editor
- [ ] Admin: username management (rename)
- [ ] Admin: entry management (void/adjust)
- [ ] Admin: checkpoint management
- [ ] Admin: audit log viewer

---

## Lower Priority — Code (post-launch)
- [ ] Silver Bulletin Excel ingestion + validation
- [ ] KenPom API integration
- [ ] Team name normalization dictionary
- [ ] Historical data migration (2019-2025)
- [ ] Daily recap emails (optional)
- [ ] Real-time in-app notifications (websockets/SSE)
- [ ] Share card: during/post tournament
- [ ] Sentry error monitoring integration
- [ ] Load testing: 1,000 simultaneous requests
- [ ] Historical bar chart race replay

---

## Not in V1 (Explicitly Deferred)
- In-app payments
- Native apps
- SMS notifications
- Historical bar chart races 2019-2024
- NCAAW bracket
- WebSockets (use polling)
- Head-to-head comparison
