import { Resend } from "resend"

const resend = new Resend(process.env.AUTH_RESEND_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Slipper8s <noreply@slipper8s.com>"
const APP_URL = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://slipper8s.com"

// ─── Welcome Email (mandatory — sends on first registration) ────────────────

export async function sendWelcomeEmail(to: string, firstName: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to Slipper8s! 🏀",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#f97316;line-height:48px;text-align:center;font-size:24px;">🏀</div>
      <h1 style="color:#ffffff;font-size:24px;margin:16px 0 4px;">Welcome to Slipper8s!</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0;">Where sleeper picks become glass slippers</p>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#e4e4e7;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! You're all set for the 2026 college basketball tournament pool.
      </p>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong style="color:#e4e4e7;">How it works:</strong> Pick 8 teams from the tournament bracket. Your score = seed x wins. Higher seeds are worth more when they win, so those sleeper picks can pay off big.
      </p>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 24px;">
        You can update your picks as many times as you want before the entry deadline.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/picks" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          Make Your Picks
        </a>
      </div>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#a1a1aa;font-size:13px;line-height:1.6;margin:0 0 12px;">
        <strong style="color:#e4e4e7;">Playing with friends?</strong> Create a private league and share the invite code.
      </p>
      <a href="${APP_URL}/leagues" style="color:#f97316;font-size:13px;text-decoration:none;font-weight:500;">
        Create a Private League →
      </a>
    </div>
    <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">
      Slipper8s — slipper8s.com
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

// ─── Entry Confirmation Email (mandatory — sends on every pick save) ────────

export async function sendEntryConfirmationEmail(
  to: string,
  firstName: string,
  picks: { name: string; seed: number; region: string }[],
  entryNumber?: number,
) {
  const picksHtml = picks
    .map((p) => `<li style="color:#e4e4e7;font-size:14px;padding:4px 0;">#${p.seed} ${p.name} <span style="color:#71717a;">(${p.region})</span></li>`)
    .join("")

  const entryLabel = entryNumber && entryNumber > 1 ? ` (Entry ${entryNumber})` : ""

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Slipper8s picks are saved${entryLabel} ✓`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#22c55e;line-height:40px;text-align:center;font-size:20px;">✓</div>
      <h1 style="color:#ffffff;font-size:20px;margin:12px 0 4px;">Picks Confirmed${entryLabel}</h1>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">${firstName}, your picks have been saved</p>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#a1a1aa;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;font-weight:600;">Your 8 Teams</p>
      <ol style="margin:0;padding:0 0 0 20px;">${picksHtml}</ol>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <p style="color:#a1a1aa;font-size:13px;margin:0 0 12px;">You can edit your picks anytime before the entry deadline.</p>
      <a href="${APP_URL}/picks" style="color:#f97316;font-size:13px;text-decoration:none;font-weight:500;">
        Edit Your Picks →
      </a>
    </div>
    <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">
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

// ─── Entries Locked Email (mandatory — sends when deadline passes) ──────────

export async function sendEntriesLockedEmail(to: string, firstName: string) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Entries are locked — the tournament is LIVE! 🔒",
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#8b5cf6;line-height:40px;text-align:center;font-size:20px;">🔒</div>
      <h1 style="color:#ffffff;font-size:20px;margin:12px 0 4px;">Entries Are Locked!</h1>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">The tournament is live — let the games begin</p>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#e4e4e7;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! All entries are now locked. No more changes allowed.
      </p>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Follow along on the leaderboard as the tournament unfolds. Your score updates automatically after every game.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/leaderboard" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          View Leaderboard
        </a>
      </div>
    </div>
    <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">
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
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:40px;height:40px;border-radius:50%;background:#eab308;line-height:40px;text-align:center;font-size:20px;">⏰</div>
      <h1 style="color:#ffffff;font-size:20px;margin:12px 0 4px;">24 Hours Left!</h1>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">Entry deadline: ${deadlineStr}</p>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#e4e4e7;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hey ${firstName}! Just a reminder — picks lock in less than 24 hours.
      </p>
      <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:0 0 20px;">
        Make sure your 8 teams are exactly how you want them. Once the deadline passes, no changes allowed.
      </p>
      <div style="text-align:center;">
        <a href="${APP_URL}/picks" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
          Review Your Picks
        </a>
      </div>
    </div>
    <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">
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
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:#f97316;line-height:48px;text-align:center;font-size:24px;">🏆</div>
      <h1 style="color:#ffffff;font-size:22px;margin:16px 0 4px;">Tournament Complete!</h1>
      <p style="color:#a1a1aa;font-size:13px;margin:0;">Here's how you finished, ${firstName}</p>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:24px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-around;text-align:center;margin-bottom:20px;">
        <div>
          <p style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Rank</p>
          <p style="color:#f97316;font-size:28px;font-weight:700;margin:0;">#${rank}</p>
        </div>
        <div>
          <p style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Percentile</p>
          <p style="color:#e4e4e7;font-size:28px;font-weight:700;margin:0;">Top ${percentile}%</p>
        </div>
        <div>
          <p style="color:#a1a1aa;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Score</p>
          <p style="color:#e4e4e7;font-size:28px;font-weight:700;margin:0;">${score}</p>
        </div>
      </div>
      <p style="color:#71717a;font-size:12px;text-align:center;margin:0;">Out of ${totalEntries} entries</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${APP_URL}/leaderboard" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
        View Full Leaderboard
      </a>
    </div>
    <p style="color:#52525b;font-size:12px;text-align:center;margin:0;">
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
