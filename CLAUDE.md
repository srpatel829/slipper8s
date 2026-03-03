# Slipper8s — CLAUDE.md
## Working Instructions for Claude Code Sessions

**Full product specification: Slipper8s_Spec_v9.docx — read it before making architectural decisions.**
**This file is the daily brief. The spec is the source of truth.**

---

## ⚠️ CRITICAL REMINDERS — DO BEFORE LAUNCH

**Remind user to ask "what do we still need to do before going live?" before each milestone.**

1. **Upgrade Vercel to Pro** ($20/mo) by March 16 — required for 5-min cron. Then change `vercel.json` cron back from `"0 12 * * *"` to `"*/5 * * * *"`. Downgrade back to Hobby after April 6.
2. **Replace AUTH_SECRET** with real secure value — run `openssl rand -base64 32`, update in both `.env` locally AND Vercel Environment Variables. Current placeholder is `slipper8s-secret-2026-replace-this-later`.
3. **Add CRON_SECRET** — generate with `openssl rand -base64 32`, add to both `.env` and Vercel env vars.
4. **Add AUTH_URL** — set to `https://slipper8s.vercel.app` in Vercel env vars (required for magic links to work on production domain).
5. **Add RESEND_FROM_EMAIL** — set sending email address in Vercel env vars.
6. **Set up Upstash Redis** — leaderboard caching is NOT implemented yet, critical for launch.
7. **Run db:seed** — seed AppSettings singleton after migration.
8. **DNS** — point slipper8s.com to Vercel by March 10 (48hr propagation).
9. **Verify Resend domain** — magic links won't deliver without verified sending domain.

---

## What We Are Building

Slipper8s (slipper8s.com) is a free college basketball tournament prediction game. Players pick 8 teams. Scoring = seed x wins. Highest total wins. 10-year history (265 players in 2025). Moving from Google Forms/Sheets to a proper web app for 2026.

---

## First Thing Every Session

1. Read this file
2. Check what was built last session (review /server, /client, recent git commits)
3. Tell the user your plan before writing any code
4. Do not assume — verify data source structures before building against them

---

## Tech Stack (Actual — forked from rrpatel2009/super-8s)

- **Frontend + Backend:** Next.js 15 (App Router, RSC + API routes), deployed on Vercel
- **Database:** Neon PostgreSQL (serverless, auto-pauses off-season) via Prisma 7
- **Cache:** Upstash Redis or Vercel KV — NOT YET IMPLEMENTED, must add before launch
- **Email:** Resend (magic links only so far) — no SendGrid, no MJML templates yet
- **Auth:** NextAuth v5 magic links only — NO Google OAuth yet
- **File storage:** Not yet implemented — profile photos deferred
- **Error tracking:** Sentry — NOT YET INTEGRATED
- **SMS:** Phone number stored as optional field — NO SMS in 2026, email only
- **Repo:** github.com/srpatel829/slipper8s (forked from rrpatel2009/super-8s)
- **Live URL:** slipper8s.vercel.app

---

## Build Strategy — 2025 Data First, Always

Do not touch live 2026 data until every 2025 validation item passes.

Files in `/data/historical/`:
- `Super_8s_2025.xlsx` — 265 entries, primary validation source
- `Sbcb_Mens_Odds_March_16_2025.xlsx` — Silver Bulletin pre-tournament probabilities
- `Sbcb_Mens_Odds_April_6_2025.xlsx` — Silver Bulletin final state
- Additional historical files 2019-2024 for player profiles and Hall of Champions

**2025 validation checklist — every item must pass before 2026:**
- [ ] All 265 entries display correctly
- [ ] Optimal 8 = exactly 99 pts: Arkansas(20)+BYU(12)+Ole Miss(12)+Colo.St(12)+McNeese(12)+Drake(11)+Michigan(10)+New Mexico(10)
- [ ] Champion Jig Samani = 79 pts, efficiency 80% (79/99)
- [ ] 10-way tie at 62nd-70th handled as T62-T70
- [ ] Bar chart race animates correctly through all 2025 rounds
- [ ] Max Possible Score collision detection correct with same-region pick combinations
- [ ] Expected score correct using Silver Bulletin March 16 2025 file (marginal probabilities, not cumulative)
- [ ] S-Curve tiebreaker resolves Optimal 8 correctly
- [ ] Percentile calculations correct across all 6 ranking dimensions
- [ ] Hall of Champions values match hardcoded data
- [ ] Team normalization matches teams correctly across all data sources

---

## Player Registration & Profile Fields

### Required at Registration (4 fields — no more)
1. **First name**
2. **Last name**
3. **Email** (used for magic link login — never shown publicly)
4. **Username** — auto-suggested default (e.g. `SheelP` from name), player may override once at registration only. Set once, never changeable after. Unique enforced. 4-20 chars, letters/numbers/underscores only. Filtered through profanity blocklist (`bad-words` library). Admin can rename any username if something slips through.

### Optional Fields (shown with explanation of why we're asking)
5. **Favorite team** → *"See how you rank among fans of your team and conference"* — conference auto-assigned from team selection (team-to-conference mapping table in DB, season-specific). If not filled: excluded from fan/conference leaderboard tabs.
6. **Country** → *"See how you rank among players in your country"* — if not filled: excluded from country leaderboard tab, appears in global only.
7. **State** → *"See how you rank among players in your state"* — only shown if Country = USA. If not filled: excluded from state leaderboard tab.
8. **Gender** → *"See how you rank among players of your gender"* — if not filled: excluded from gender leaderboard tab.
9. **Profile photo** → *"Put a face to your name on the leaderboard"* — 5MB limit, resized to 400x400px server-side, stored on Cloudinary/S3. If not filled: default avatar shown.
10. **Date of birth** → *"May be required for future prize verification (age 18+)"* — optional, stored securely, not displayed publicly.
11. **Phone number** → *"For future score update notifications via text (coming soon)"* — optional, encrypted at rest, not used for any functionality in 2026.

### Username Rules (summary)
- Auto-suggested at registration, player can override
- Set ONCE — no changes after registration complete
- Unique across all players — system rejects duplicates in real time
- Profanity filtered automatically
- Admin retains ability to rename any username via admin panel
- Displayed on leaderboard as secondary identifier alongside real name

---

## Non-Negotiable Architectural Rules

### 1. Leaderboard Caching
Never query the database on a user page load for leaderboard data. Serve from cache only. Cache invalidates ONLY when a game result changes scores. 50,000 users refreshing = zero database queries between game results.

### 2. Single Internal Poller, No User-Triggered External API Calls
One background service polls ESPN on schedule. User requests never trigger an ESPN API call.
```
No games today:               every 2-3 hours
Games scheduled, not started: every 5 minutes
Game in progress:             every 60 seconds
All today's games complete:   every 2-3 hours
Tournament complete:          stop until next season
```

### 3. Completed Games Are Immutable
Once is_complete = true, never re-fetch. Historical data (2015-2025) hardcoded — never queries any external API.

### 4. Score Recalculation Is Sequential, Never Parallel
Queue all recalculations. Correct order every time:
1. Save game result (is_complete = true)
2. Update team wins
3. Recalculate all entry scores
4. Recalculate max possible scores (batch job, async)
5. Recalculate Optimal 8
6. Recalculate efficiency %
7. Update rankings AND percentiles for all 6 dimensions
8. Save score snapshots including rank and percentile (BEFORE invalidating cache)
9. Invalidate leaderboard cache
10. Notify affected players

If any step fails, roll back to last good snapshot state.

### 5. Validate All External API Responses
Alert admin if ESPN response structure changes. Alert if Silver Bulletin Excel column structure changes. Never silently ingest malformed data.

### 6. Draft Picks Saved Server-Side
Bracket picker state saves to database as player makes picks. Not just on final submit. Survives session expiry, tab close, phone calls.

### 7. Deadline Is Server-Side UTC Only
Stored and enforced in UTC. Server timestamp is authoritative. In-flight submissions after deadline rejected. Millisecond precision. Deadline date changes each year — confirm exact time before building countdown.

### 8. Season-Specific Data Structures
Bracket, seeds, conference mappings, S-Curve rankings are all season-specific. Never hardcode the bracket. Year references are variables, not hardcoded values.

---

## Scoring Rules

**Basic score:** sum of (seed x wins) for each of the player's 8 teams.

**Play-in games:** no points. Player picks the slot. Display as "11) TEX/XAV (Midwest)" before play-in resolves. Auto-update to winning team after. Seed value unchanged.

### Maximum Possible Score — Bracket-Path Collision Analysis

The naive calculation (seed x remaining games) is WRONG. Never use it.

**Collision resolution rule:** When two of a player's picks collide, the HIGHER-SEEDED team (larger seed number) survives. Exception: identical seeds at Final Four or Championship — route through either one, math is identical.

**Algorithm:**
1. Map all 8 picks to current bracket positions
2. Trace each team's forward path through bracket
3. Identify collision points (where two picks would meet)
4. At each collision, route through the higher-seeded pick
5. Check for further downstream collisions for the survivor
6. Sum optimal-path scores assuming all surviving picks win every remaining game

**Unit tests required before implementation:**
no collisions, one collision, multiple collisions same region, three-way collision, cross-region collision at Final Four, already-resolved collision, all 8 picks eliminated, identical seed collision at Final Four/Championship.

Performance: batch job triggered by game results, NOT per-user-request.

### Optimal 8

Top 8 teams by (wins x seed) at current state.

**Tiebreaker:** Use S-Curve ranking to assign positions ordinally where tied teams can be disambiguated (lower S-Curve number = better rank = higher position). For the final remaining slot, if two or more teams are still tied after all other positions are assigned, show them with slashes (e.g. McNeese/Texas). Never show more than 8 positions.

Example: 4 teams tied for 6th-highest score. S-Curve assigns spots 6 and 7. Remaining 2 teams show as slashes in spot 8.

S-Curve must be ingested before Optimal 8 can run.

### Expected Score — CORRECT FORMULA

Silver Bulletin win probabilities are CUMULATIVE (probability of reaching AT LEAST that round). Derive marginal (per-round) probabilities:

```
P(win R64)    = rd2_win
P(win R32)    = rd3_win - rd2_win
P(win S16)    = rd4_win - rd3_win
P(win E8)     = rd5_win - rd4_win
P(win F4)     = rd6_win - rd5_win
P(win Champ)  = rd7_win - rd6_win
Expected wins = sum of all marginal probabilities for REMAINING rounds only
Expected score for one team = seed × expected wins
Player's total expected score = sum of expected scores across all 8 picks
```

**Example — 1-seed with cumulative probabilities 99%, 85%, 70%, 50%, 35%, 25%:**
- Marginal wins: 0.99 + 0.85 + 0.70 + 0.50 + 0.35 + 0.25 = 3.64
- Expected score = 1 × 3.64 = **3.64 pts**

**Example — 12-seed with cumulative probabilities 45%, 20%, 8%, 3%, 1%, 0.5%:**
- Marginal wins: 0.45 + 0.20 + 0.08 + 0.03 + 0.01 + 0.005 = 0.775
- Expected score = 12 × 0.775 = **9.3 pts** (higher than the 1-seed — Cinderella value)

**Mid-tournament rule:** Use actual wins for completed rounds + marginal probabilities for remaining rounds only.

Validate against 2025 Silver Bulletin data before launch.

---

## Tier Names & Percentile Rankings

### Tier Names (Exact — Positions 1-68)
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

### Percentile Rankings — Universal, Not Just Below 68th
Percentile shown alongside absolute rank everywhere in the app for ALL players regardless of rank. Both metrics are equally important.

Show in: all 6 ranking dimensions on dashboard, leaderboard rows, player profile history per year, share cards, notifications.

Format: "Top 0.1%", "Top 18%", "Top 45%"

Store both absolute rank and percentile per year in player history for cross-year comparison.

---

## Data Architecture

### Team Name Normalization — Build First
Build canonical team name dictionary before any other data work. Master list of ~360 programs with canonical name + all known variants. Every ingestion pipeline normalizes through this before storing.

### Program vs TeamSeason
- **Program:** Permanent entity. Florida Gators. Never changes.
- **TeamSeason:** Seasonal instance. Florida 2025 = 1-seed, 6 wins, champion. Florida 2026 = new record.

Historical TeamSeason records (2015-2025) are IMMUTABLE.

### Key Data Model
```
Season:           year, entry_deadline_utc, status, sponsor_details
Program:          canonical_name, aliases[], current_conference, logo_url
TeamSeason:       program_id, season_id, seed, region, s_curve_rank,
                  kenpom_rank, bpi_rating, bpi_rank, games_won, eliminated,
                  is_playin_slot, resolved_team_id, record, champion_flags,
                  win_probabilities_by_round[], last_updated
BracketPosition:  teamseason_id, region, bracket_half, slot — enables collision detection
ConferenceMapping: program_id, conference, season_id — season-specific
Player:           canonical_id, email, display_name, gender, country, state,
                  favorite_program_id, phone_encrypted, date_of_birth (optional),
                  notifications_enabled, account_status
Entry:            player_id, season_id, league_id, nickname, picks[8],
                  playin_resolved_picks[], score, max_possible_score,
                  expected_score, teams_left, archetype_labels[], draft_in_progress
League:           name, admin_player_id, invite_code (8+ alphanumeric), season_id
GameResult:       teamseason_id, round, win_bool, score, game_date_utc, is_complete
WinProbability:   teamseason_id, round, probability, source, fetched_at
ScoreSnapshot:    entry_id, game_result_id, score, rank, percentile, saved_at
LeaderboardCache: league_id, season_id, snapshot_json, last_updated
UpsetHistory:     teamseason_id, game_date, opponent, result, was_underdog, score
```

### Historical Data Migration Rules
- One idempotent migration script per year (running twice = no duplicates)
- Log every anomaly — never silently drop or misassign
- Lock scripts after successful validated run
- Expect inconsistencies: different column names, mixed types, missing fields across years

---

## Data Sources

### KenPom (kenpom.com + kenpom.substack.com)
**FIRST SESSION: Make authenticated test API call. Document every available endpoint and field. Design features based on what is actually available — not assumptions.**
- API ($95/yr) preferred for stability
- If API does not expose game log data, web scrape kenpom.com with stored credentials
- Tournament probabilities: Substack post, fetched once at bracket announcement, stored internally, never re-fetched
- Document which fields come from API vs scraping

### Silver Bulletin (natesilver.net)
- Authenticated Substack scraper on schedule
- Downloads Excel file, validates column structure on every import — alert if changed
- Check every 2 hours during active tournament days, compare file timestamp to last ingested

### ESPN Unofficial JSON API
- Single poller only, never user-triggered
- Validate response structure on every call, alert on change
- Document all discovered endpoints (research before coding)

---

## Key Display Rules

### Seed Colors — Supplementary, Never Sole Indicator
```
Seeds 1-4:   Red    #C0392B
Seeds 5-8:   Orange #E67E22
Seeds 9-12:  Gold   #D4AC0D
Seeds 13-16: Green  #27AE60
```
Always show seed number alongside color. Grayscale users must have full info from number alone. Relative units (rem/em). Test at 150% text scale.

### Multiple Entry Naming
- Single entry: Ankur Patel
- Multi with nickname: Arjun (Ankur Patel 2)
- Multi without nickname: Ankur Patel 2
- NEVER just "Ankur Patel" for a multi-entry

### Tier Names (exact — see above)
### Copy Rules
- Never use "March Madness" — use "the tournament", "the big dance", "college basketball tournament"
- Never use "midnight" — deadline is 12pm ET
- Deadline stored UTC, displayed in user's local time with ET shown
- Deadline date changes each year — do not hardcode March 19

---

## About Page & FAQ Content

The About section and all FAQ content is approved final copy in Section 11.1 of the spec. Implement exactly as written — do not reword Sumeet's personal voice in the About section.

---

## Security

- All secrets in environment variables. Never hardcoded. Never in Git.
- Create .env.example with all required variables listed (no values)
- Rate limit own API: max 100 requests/minute per IP
- Server-side pick validation: max 8, no duplicates, valid teams, before deadline
- Admin panel: admin flag + re-authentication. Not accessible to regular players.
- Super-admins: Sumeet Patel (primary) + his brother (secondary)
- Phone numbers encrypted at rest
- Profile photos: 5MB limit, resize to 400x400px server-side, store on Cloudinary/S3
- Soft delete: anonymize personal data, retain game history linked to anonymized ID

---

## Share Cards

Server-rendered images at stable URLs. Open Graph meta tags on all shareable pages. Enables rich previews in WhatsApp, iMessage, Twitter, Slack. Post-deadline living card includes percentile rank alongside absolute rank.

---

## Performance

Client-side polling every 60 seconds. Leaderboard pagination: 50 per page, own row pinned. Load test script in codebase. Simulate 1,000 simultaneous leaderboard requests before launch.

---

## Not in V1
In-app payments, native apps, "March Madness" usage, SMS notifications, historical bar chart races 2019-2024, NCAAW bracket, WebSockets, head-to-head comparison.

---

## Open Questions (Pause and Ask Before Building Affected Features)
1. Exact deadline time: 12:00pm or 12:15pm ET on March 19?
2. KenPom API scope: verify first session before building any KenPom features
3. Silver Bulletin scraping: verify authenticated download works before building
4. Historical data scope: full 2019-2025 player profiles or Hall of Champions summary only?
5. DNS: point slipper8s.com to hosting by March 10 — DNS takes 48 hours to propagate

---

---

## Leaderboard Design

### Tabs
Global | By State | By Country | By Conference | By Gender | Private Leagues

Each tab uses the same layout, filtered to that dimension.

### Default View (5 columns — compact, scannable)

| Rank | Player | Score | Max Score | Expected | Percentile |
|---|---|---|---|---|---|
| 1 | **Sheel Patel** / SheelATL 🎯 | 24 | 67 | 31.4 | Top 4% |

- **Rank** — standard competition ranking (1, 2, T3, T3, 5...)
- **Player** — real name bold, username + archetype emoji below in smaller text
- **Score** — actual points earned so far
- **Max Score** — Score + PPR (ceiling if all remaining picks win every game). PPR not shown as separate column.
- **Expected** — expected score based on Silver Bulletin marginal probabilities
- **Percentile** — "Top 4%", "Top 18%" etc.

Archetype emoji shown in player cell. Full archetype name shown only in expanded view. Hover over emoji shows tooltip with archetype name and description.

### Expanded Row (click any row to expand)

Shows 8 team pills in a horizontal strip, ordered LEFT TO RIGHT by remaining expected value (highest first).

**Team pill format:** `#12 McNeese` — seed number + team name in the pill itself. Region shown in hover callout only.

**Pill colors (background color IS the status — no separate icons):**
- 🟩 **Green** = won most recent round, still alive
- 🟨 **Yellow** = still alive, has not played in most recent round yet
- 🟥 **Red** = eliminated (no strikethrough needed — red conveys it)

**Color legend** shown once above the leaderboard (or as a ? tooltip).

**Hover/tap callout on each pill:**
```
#12 McNeese St.  |  South Region
Wins: 4  |  Pts: 48
Exp. remaining: 8.3 pts
Next: vs #1 Duke
Win probability: 18%
```

**Bottom of expanded row:** Score | Max Score | Expected (totals summary)

### Strategic Value
Players can scan the leaderboard and instantly see what teams people ahead/behind them need to win or lose. Ordering by expected value means the most impactful remaining picks are always leftmost.

---

## Picks View (My Picks Tab)

- **Views:** By Region and By Seed only — All Teams view removed as redundant
- **Seed group names (exact):**
  - Seeds 1-4: **Chalk**
  - Seeds 5-8: **Dark Horses**
  - Seeds 9-12: **Sleepers**
  - Seeds 13-16: **Bracket Busters**

---

## Team Display Rules

### Logo Box
- Team logo displayed prominently
- **Seed number** shown inside/on the pill
- **Region badge** in top-left corner of logo box:
  - S = South, W = West, E = East, MW = Midwest
  - 4 distinct colors, one per region (colors chosen during design phase)
- **Eliminated teams:** logo grays out when team is eliminated

---

## Teams Tab

Sortable data table. Default sort: % Selected (high to low). Clicking any column header sorts by that column, click again to reverse.

**Columns (in order):**
Logo/Seed/Region | Team | Picked (count) | Picked (%) | Status | Wins | Games Left | Score | Max Score | Expected | Next Game | Win Prob

**% Selected calculation:** picks for that team ÷ total entries × 100. Each team's % is independent — all teams combined will exceed 100% since each player picks 8 teams. No footnote needed.

**Status:** Alive or Eliminated. Eliminated teams' logos grayed out.

---

## Score History Chart

### Default Lines (5 lines when tournament complete, 4 during)

**During tournament:**
1. **Optimal 8 (Rolling)** — best possible picks using only results known so far. Dashed or visually distinct. Labeled "Optimal 8 (Rolling)"
2. **[Name] (Leader)** — current best human player by name
3. **[Your name]** — logged in player
4. **[Name] (Median)** — player sitting at exact middle of leaderboard by name

**After tournament completes — adds 5th line:**
5. **Optimal 8 (Hindsight)** — true best 8 picks knowing all final results

Footnote on historical years: "Rolling Optimal 8 shows the best possible score using only results known at each point. Hindsight Optimal 8 shows the true best picks given all final results."

If logged-in player IS the leader or median, show 3 or 4 lines — never duplicate.

### X-Axis — 10 Fixed Checkpoints
```
Round of 64 Day 1
Round of 64 Day 2
Round of 32 Day 1
Round of 32 Day 2
Sweet 16 Day 1
Sweet 16 Day 2
Elite 8 Day 1
Elite 8 Day 2
Final Four
National Championship
```
Each checkpoint only appears when ALL games in that session are final.

### Player Filter
Add any additional players on top of the 4-5 defaults.

### Dimension Super-Filter
Global | By State | By Country | By Conference | By Gender | Private League
Leader and Median recalculate relative to selected dimension.

### Leader/Median Toggle (two modes)
- **Option 2 (default):** "Current" — shows how today's leader/median scored throughout the tournament
- **Option 1:** "Historical" — shows who was actually leading/at median after each round
Brief explanation shown when toggling. Option 2 is default.

### Optimal 8 Technical Note — FLAG FOR CLAUDE CODE
Rolling Optimal 8 recalculates after every game goes final. Must be stored as a snapshot at each checkpoint — not recalculated retroactively. Both Rolling and Hindsight Optimal 8 snapshots must be persisted in DB at each checkpoint. These are different calculations — build and validate separately.

---

## "No Response" Handling for Optional Profile Fields

Players who don't fill in optional fields (country, state, gender, favorite team/conference) are NOT excluded from the app. Each dimension has a "No Response" bucket:

- Country dropdown includes "No Response" as a selectable option
- State dropdown includes "No Response"
- Conference filter includes "No Response"
- Gender filter includes "No Response"
- Each "No Response" is dimension-specific and independent

**Stats page headline numbers** (e.g. "47 countries participating") exclude No Response — only count actual responses.

**Leaderboard and chart:** Players with No Response appear in Global view always. They appear in dimension-specific views only if they provided that data, OR if viewing the "No Response" filter for that dimension.

---

## Simulator

### Default View
- Actual results shown for completed games (locked, cannot change)
- Future games: blank for manual exploration

### For Players Who Submitted a Pre-Tournament Bracket
- Actual results for completed games (locked)
- Their bracket picks pre-loaded for future games where their pick is still alive
- Where their pick was eliminated: actual winner fills that slot as default
- **Rule:** Follow the TEAM not the path — if player picked Texas A&M to advance through a slot where their earlier pick was eliminated, Texas A&M still loads until they are actually eliminated
- Result: No blanks ever for players who submitted a bracket — always a complete picture
- Players can change any future slot to explore "what if" scenarios

### Pre-Tournament Bracket
- Optional submission before tournament starts only
- Cannot submit or modify once tournament begins
- Players who didn't submit see actual results + blanks for future games

### Right Side Panel
Shows leaderboard panel with dimension selector (Global, Private League, State, etc.) — updates in real time as simulator scenarios change.

### Views Available
By Region and By Seed (same as My Picks). No "All Teams" view.

---

## Global Timeline Footer

### What It Is
A global time controller shown as a persistent footer on EVERY page of the app. Controls what time period all data on screen reflects simultaneously — leaderboard, picks, teams, scores, bracket, simulator all sync to selected time position.

### Controls (two only — nothing else)
1. **Scrubber** — move through time across all game checkpoints
2. **LIVE button** — snap instantly back to current state

### LIVE Button Behavior
- At current state: grayed out or shows "LIVE ●" with pulsing red dot
- When scrubbed back: turns bright/active, one tap returns to current
- When new results arrive while user is scrubbed back: do NOT auto-advance. User stays where they are until they deliberately tap LIVE.

### Checkpoint Rules — FLAG FOR CLAUDE CODE — COMPLEX FEATURE
- Individual game goes final → creates a game-level checkpoint (63 total possible)
- All games in a session complete → session checkpoint marker appears (up to 10)
- In-progress games → NO checkpoint, NO scoring updates, wait for final
- Expected scores update only when games are final, not during live play
- Timeline scrubber can only go up to current moment — cannot scrub into future

### Historical vs Live
- Historical (2017-2025): all results hardcoded, timeline plays back fully — straightforward
- Live (2026): has three simultaneous states — past (locked), in-progress (no checkpoint yet), future (empty). This is significantly more complex.
- **Recommendation to Claude Code:** Build and fully validate historical playback before attempting live 2026 version. Patterns are the same but live adds real-time state management complexity.

### Architecture Notes — FLAG FOR CLAUDE CODE
1. "Current timeline position" must be global state — every component reads from it
2. Every data query must be time-aware: "give me leaderboard as of game X" not just "give me current"
3. Past positions read from score snapshots in DB; current position reads live data
4. Session checkpoint only triggers when LAST game of that session finalizes
5. No perspective switching on timeline — players always see their own view. Timeline only controls time, not whose perspective.
6. Dimension filters (global, state, etc.) stay on their respective pages — NOT on the timeline footer

### What the Demo Has That We Are NOT Keeping
- Extra filtering on the timeline footer
- Ability to view from another player's perspective
- Multiple color scheme options (blue vs orange) — we use ONE color scheme in light and dark mode only

---

## Light/Dark Mode
- Offer light mode and dark mode toggle
- ONE color scheme only — light and dark versions of the same Slipper8s palette
- No alternative color scheme options
- Color scheme to be defined during design phase in Claude Code

---

## Pre-Launch Checklist Additions (March 16)
- [ ] SSL on both domains, HTTP redirects to HTTPS
- [ ] sleeper8s.com redirects to slipper8s.com
- [ ] DNS propagated
- [ ] All env vars set in production
- [ ] Database backup configured and tested
- [ ] All 2025 validation items pass
- [ ] Email sending tested
- [ ] ESPN poller detecting bracket correctly
- [ ] KenPom data on team cards
- [ ] Silver Bulletin integration tested with 2025 files
- [ ] Admin panel (Sumeet + brother only)
- [ ] Terms of Service + Privacy Policy live
- [ ] Load test passed (1,000 simultaneous users)
- [ ] robots.txt + sitemap.xml
- [ ] Open Graph tags verified via WhatsApp link preview test
- [ ] Sentry receiving test errors
- [ ] Maintenance mode page working
- [ ] Percentile calculations verified across all 6 dimensions

---

## File Structure (Actual Next.js Codebase)
```
/src/app              Next.js App Router pages and API routes
/src/app/api          API routes (cron/sync, admin, leaderboard, picks, auth)
/src/app/(protected)  Authenticated pages (picks, leaderboard, scores, simulator)
/src/app/admin        Admin panel pages
/src/app/demo         Demo mode (no auth, full app, in-memory)
/src/lib              Core logic (scoring.ts, espn.ts, bracket-ppr.ts, prisma.ts)
/src/components       React components
/src/generated/prisma Prisma client (generated — never edit directly)
/prisma               Schema, migrations, seed
/data/historical      Excel files 2015-2025 (read-only)
/docs                 Spec, deploy guide, MVP plan
/public               Static assets
.env                  Local secrets (never commit)
.env.example          All required env var names (no values)
vercel.json           Cron config (currently daily — change to */5 before launch)
CLAUDE.md             This file
Slipper8s_Spec_v9.docx  Full product specification
```

---

*Slipper8s — Where sleeper picks become glass slippers | slipper8s.com*
