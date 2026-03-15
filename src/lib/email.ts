import { Resend } from "resend"

const resend = new Resend(process.env.AUTH_RESEND_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Slipper8s <noreply@slipper8s.com>"
const APP_URL = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://slipper8s.com"

// ─── Welcome Email (mandatory — sends on first registration) ────────────────
// Two variants: pre-bracket (before selections are live) and live (bracket is out)

export async function sendWelcomeEmail(to: string, firstName: string, variant: "pre-bracket" | "live" = "pre-bracket") {
  // Build social share URLs for the "share with friends" section
  const shareUrl = APP_URL
  const shareText = `I'm registered to play Slipper8s for 2026!\nYou should sign up and see if you can beat me!\nPick 8 Teams | Seed x Wins = Score | Highest Score Wins!`
  const bareUrl = shareUrl.replace(/^https?:\/\//, "")
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(bareUrl)}`
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`

  const timingBlock = variant === "pre-bracket"
    ? `
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
        The committee will announce the bracket at 6pm ET on Sunday, March 15th. Slipper8s will go live shortly thereafter. Please log back in then to make your selections.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
        You can update your picks as many times as you want before the entry slip deadline (when the first game tips off on Thursday, March 19th at 12:15pm ET).
      </p>`
    : `
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
        The bracket is live! Head over to make your picks now. You can update them as many times as you want before the entry slip deadline.
      </p>`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to Slipper8s 2026! 🏀",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#00A9E0;line-height:48px;text-align:center;font-size:24px;">🏀</div>
      <h1 style="color:#111;font-size:24px;margin:16px 0 4px;">Welcome to Slipper8s!</h1>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! You&rsquo;re all set for the 2026 edition of Slipper8s!
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong style="color:#222;">How it works:</strong> Pick 8 teams from the tournament bracket. Your score = seed &times; wins. Higher seeds are worth more when they win, so those sleeper picks could pay off big.
      </p>
      ${timingBlock}
      <div style="text-align:center;">
        <a href="${APP_URL}/picks" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          Make Your Picks
        </a>
      </div>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 12px;">
        <strong style="color:#222;">Playing with friends?</strong> Create a private league and share the invite link.
      </p>
      <a href="${APP_URL}/leagues" style="color:#00A9E0;font-size:13px;text-decoration:none;font-weight:500;">
        Create a Private League &rarr;
      </a>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 16px;">
        <strong style="color:#222;">Most importantly,</strong> please share this game with your family, friends, colleagues, and on your social media &mdash; this game only grows with your help!
      </p>
      <p style="color:#888;font-size:12px;margin:0 0 12px;">Share the link directly:</p>
      <div style="background:#f5f6fa;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
        <a href="${shareUrl}" style="color:#00A9E0;font-size:13px;text-decoration:none;word-break:break-all;">${shareUrl}</a>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
        <tr>
          <td style="padding:0 6px 0 0;">
            <a href="${twitterShareUrl}" target="_blank" style="display:inline-block;background:#000000;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;line-height:1;">
              &#x1D54F; Post
            </a>
          </td>
          <td style="padding:0 6px;">
            <a href="${facebookShareUrl}" target="_blank" style="display:inline-block;background:#1877F2;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;line-height:1;">
              Facebook
            </a>
          </td>
          <td style="padding:0 0 0 6px;">
            <a href="${linkedInShareUrl}" target="_blank" style="display:inline-block;background:#0A66C2;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;line-height:1;">
              LinkedIn
            </a>
          </td>
        </tr>
      </table>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Slipper8s &mdash; slipper8s.com
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send welcome email:", error)
    return { success: false, error }
  }
}

// ─── Entry Slip Confirmation Email (mandatory — sends on every pick save) ────

export async function sendEntryConfirmationEmail(
  to: string,
  firstName: string,
  picks: { name: string; seed: number; region: string }[],
  entryNumber?: number,
) {
  const picksHtml = picks
    .map((p) => `<li style="color:#222;font-size:14px;padding:4px 0;">#${p.seed} ${p.name} <span style="color:#888;">(${p.region})</span></li>`)
    .join("")

  const entryLabel = entryNumber && entryNumber > 1 ? ` (Entry Slip ${entryNumber})` : ""

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Slipper8s picks are saved${entryLabel} ✓`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#22c55e;line-height:40px;text-align:center;font-size:20px;">✓</div>
      <h1 style="color:#111;font-size:20px;margin:12px 0 4px;">Picks Confirmed${entryLabel}</h1>
      <p style="color:#555;font-size:13px;margin:0;">${firstName}, your picks have been saved</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#555;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;font-weight:600;">Your 8 Teams</p>
      <ol style="margin:0;padding:0 0 0 20px;">${picksHtml}</ol>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <p style="color:#555;font-size:13px;margin:0 0 12px;">You can edit your picks anytime before the entry slip deadline.</p>
      <a href="${APP_URL}/picks" style="color:#00A9E0;font-size:13px;text-decoration:none;font-weight:500;">
        Edit Your Picks →
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Slipper8s — slipper8s.com
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send entry confirmation:", error)
    return { success: false, error }
  }
}

// ─── Entry Slips Locked Email (mandatory — sends when deadline passes) ──────

export async function sendEntriesLockedEmail(to: string, firstName: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Entry slips are locked — the tournament is LIVE! 🔒",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#8b5cf6;line-height:40px;text-align:center;font-size:20px;">🔒</div>
      <h1 style="color:#111;font-size:20px;margin:12px 0 4px;">Entry Slips Are Locked!</h1>
      <p style="color:#555;font-size:13px;margin:0;">The tournament is live — let the games begin</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#222;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! All entry slips are now locked. No more changes allowed.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Follow along on the leaderboard as the tournament unfolds. Your score updates automatically after every game.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/leaderboard" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          View Leaderboard
        </a>
      </div>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Slipper8s — slipper8s.com
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send entries locked email:", error)
    return { success: false, error }
  }
}

// ─── Deadline Reminder Email (optional — 24 hours before deadline) ──────────

export async function sendDeadlineReminderEmail(to: string, firstName: string, deadlineStr: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "⏰ 24 hours left to submit your Slipper8s picks!",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#eab308;line-height:40px;text-align:center;font-size:20px;">⏰</div>
      <h1 style="color:#111;font-size:20px;margin:12px 0 4px;">24 Hours Left!</h1>
      <p style="color:#555;font-size:13px;margin:0;">Entry slip deadline: ${deadlineStr}</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#222;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! Just a reminder — picks lock in less than 24 hours.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Make sure your 8 teams are exactly how you want them. Once the deadline passes, no changes allowed.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/picks" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          Review Your Picks
        </a>
      </div>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Slipper8s — slipper8s.com
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send deadline reminder:", error)
    return { success: false, error }
  }
}

// ─── Final Results Email (mandatory — after tournament ends) ────────────────

export async function sendFinalResultsEmail(
  to: string,
  firstName: string,
  rank: number,
  percentile: number,
  score: number,
  totalEntries: number,
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Slipper8s final results are in! 🏆 #${rank}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#00A9E0;line-height:48px;text-align:center;font-size:24px;">🏆</div>
      <h1 style="color:#111;font-size:22px;margin:16px 0 4px;">Tournament Complete!</h1>
      <p style="color:#555;font-size:13px;margin:0;">Here's how you finished, ${firstName}</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-around;text-align:center;margin-bottom:20px;">
        <div>
          <p style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Rank</p>
          <p style="color:#00A9E0;font-size:28px;font-weight:700;margin:0;">#${rank}</p>
        </div>
        <div>
          <p style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Percentile</p>
          <p style="color:#222;font-size:28px;font-weight:700;margin:0;">Top ${percentile}%</p>
        </div>
        <div>
          <p style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Score</p>
          <p style="color:#222;font-size:28px;font-weight:700;margin:0;">${score}</p>
        </div>
      </div>
      <p style="color:#888;font-size:12px;text-align:center;margin:0;">Out of ${totalEntries} entry slips</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${APP_URL}/leaderboard" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
        View Full Leaderboard
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Thanks for playing! See you next year. — Slipper8s
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send final results:", error)
    return { success: false, error }
  }
}

// ─── Daily Recap Email (optional — one per game day, after last game finalizes)

export async function sendDailyRecapEmail(
  to: string,
  firstName: string,
  data: {
    rank: number
    percentile: number
    score: number
    totalEntries: number
    teamsRemaining: number
    rankChange: number // positive = moved up, negative = moved down
    roundLabel: string
  },
) {
  const rankChangeText =
    data.rankChange > 0
      ? `⬆️ Moved up ${data.rankChange} spot${data.rankChange > 1 ? "s" : ""}`
      : data.rankChange < 0
        ? `⬇️ Dropped ${Math.abs(data.rankChange)} spot${Math.abs(data.rankChange) > 1 ? "s" : ""}`
        : "➡️ Rank unchanged"

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Slipper8s Daily Recap: #${data.rank} · ${data.score} pts 🏀`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#00A9E0;line-height:40px;text-align:center;font-size:20px;">🏀</div>
      <h1 style="color:#111;font-size:20px;margin:12px 0 4px;">Daily Recap — ${data.roundLabel}</h1>
      <p style="color:#555;font-size:13px;margin:0;">All games are final for today</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Hey ${firstName}! Here's where you stand after today's games.
      </p>
      <div style="display:flex;justify-content:space-around;text-align:center;margin-bottom:16px;">
        <div>
          <p style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Rank</p>
          <p style="color:#00A9E0;font-size:24px;font-weight:700;margin:0;">#${data.rank}</p>
        </div>
        <div>
          <p style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Score</p>
          <p style="color:#222;font-size:24px;font-weight:700;margin:0;">${data.score}</p>
        </div>
        <div>
          <p style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Alive</p>
          <p style="color:${data.teamsRemaining > 0 ? "#27AE60" : "#C0392B"};font-size:24px;font-weight:700;margin:0;">${data.teamsRemaining}/8</p>
        </div>
      </div>
      <div style="text-align:center;padding:8px;background:#f0f1f5;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;">
        <p style="color:#222;font-size:14px;margin:0;">${rankChangeText}</p>
        <p style="color:#888;font-size:12px;margin:4px 0 0;">Top ${data.percentile}% · ${data.totalEntries} entry slips</p>
      </div>
      <div style="text-align:center;">
        <a href="${APP_URL}/leaderboard" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          View Full Leaderboard
        </a>
      </div>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      You can turn off daily recaps in your profile settings. — Slipper8s
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send daily recap:", error)
    return { success: false, error }
  }
}

// ─── Bracket Announced / Entry Slips Open Email (mandatory — when bracket is released)

export async function sendBracketAnnouncedEmail(to: string, firstName: string, deadlineStr: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "The bracket is out — Slipper8s entry slips are OPEN! 🏀",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#00A9E0;line-height:48px;text-align:center;font-size:24px;">🏀</div>
      <h1 style="color:#111;font-size:22px;margin:16px 0 4px;">The Bracket Is Out!</h1>
      <p style="color:#555;font-size:13px;margin:0;">Slipper8s entry slips are now open for 2026</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! The tournament bracket has been released and it's time to make your picks.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
        <strong style="color:#222;">Pick 8 teams.</strong> Score = seed × wins. Higher seeds score more when they win — so those sleeper picks can pay off big.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        <strong style="color:#b45309;">Deadline:</strong> <span style="color:#222;">${deadlineStr}</span>
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/picks" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          Make Your Picks
        </a>
      </div>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 12px;">
        <strong style="color:#222;">Playing with friends?</strong> Create or join a private league for bragging rights.
      </p>
      <a href="${APP_URL}/leagues" style="color:#00A9E0;font-size:13px;text-decoration:none;font-weight:500;">
        Private Leagues →
      </a>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Slipper8s — slipper8s.com
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send bracket announced email:", error)
    return { success: false, error }
  }
}

// ─── Bracket Announced — Incomplete Registration Variant ────────────────────
// Sent to users who signed in but never finished registration

export async function sendBracketAnnouncedIncompleteEmail(to: string, firstName: string | null, deadlineStr: string) {
  const greeting = firstName ? `Hey ${firstName}!` : "Hey!"
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "The bracket is out — finish signing up to play Slipper8s! 🏀",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#00A9E0;line-height:48px;text-align:center;font-size:24px;">🏀</div>
      <h1 style="color:#111;font-size:22px;margin:16px 0 4px;">The Bracket Is Out!</h1>
      <p style="color:#555;font-size:13px;margin:0;">Don't miss your chance to play Slipper8s 2026</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 16px;">
        ${greeting} The tournament bracket has been released and entry slips are open — but you still need to finish signing up before you can make your picks.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
        <strong style="color:#222;">It only takes a minute.</strong> Complete your registration, then pick 8 teams. Score = seed × wins — sleeper picks can pay off big.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        <strong style="color:#b45309;">Deadline:</strong> <span style="color:#222;">${deadlineStr}</span>
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/register" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          Complete Registration
        </a>
      </div>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Slipper8s — slipper8s.com
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send bracket announced (incomplete) email:", error)
    return { success: false, error }
  }
}

// ─── Play-In Slot Resolved Email (optional — when a play-in game resolves) ──

export async function sendPlayInResolvedEmail(
  to: string,
  firstName: string,
  resolvedTeamName: string,
  seed: number,
  region: string,
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your play-in pick resolved — you have ${resolvedTeamName}! 🏀`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#27AE60;line-height:40px;text-align:center;font-size:20px;">✓</div>
      <h1 style="color:#111;font-size:20px;margin:12px 0 4px;">Play-In Resolved!</h1>
      <p style="color:#555;font-size:13px;margin:0;">Your play-in slot has a winner</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#222;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! Your play-in pick in the <strong>${region}</strong> region has been resolved.
      </p>
      <div style="text-align:center;padding:16px;background:#f0f1f5;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;">
        <p style="color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Your Team</p>
        <p style="color:#00A9E0;font-size:22px;font-weight:700;margin:0;">#${seed} ${resolvedTeamName}</p>
      </div>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 20px;">
        ${resolvedTeamName} won the play-in game and will represent the #${seed} seed in the ${region} region of your bracket. No action needed on your part — your entry slip has been updated automatically.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/picks" style="display:inline-block;background:#00A9E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          View Your Picks
        </a>
      </div>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      You can turn off optional notifications in your profile settings. — Slipper8s
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send play-in resolved email:", error)
    return { success: false, error }
  }
}

// ─── Admin Broadcast Email (admin-triggered — to all players or subset) ──────

export async function sendBroadcastEmail(
  to: string,
  firstName: string,
  subject: string,
  messageHtml: string,
) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Slipper8s: ${subject}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#00A9E0;line-height:48px;text-align:center;font-size:24px;">📢</div>
      <h1 style="color:#111;font-size:20px;margin:12px 0 4px;">${subject}</h1>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#222;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName},
      </p>
      <div style="color:#555;font-size:14px;line-height:1.6;">
        ${messageHtml}
      </div>
    </div>
    <p style="color:#999;font-size:12px;text-align:center;margin:0;">
      Slipper8s — slipper8s.com
    </p>
  </div>
</body>
</html>`,
    })
    return { success: true }
  } catch (error) {
    console.error("[email] Failed to send broadcast email:", error)
    return { success: false, error }
  }
}
