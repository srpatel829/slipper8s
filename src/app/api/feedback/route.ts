import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit, getClientIp } from "@/lib/rate-limit"
import { Resend } from "resend"

const resend = new Resend(process.env.AUTH_RESEND_KEY)
const ADMIN_EMAIL = process.env.FEEDBACK_NOTIFY_EMAIL ?? "sumeet@slipper8s.com"
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Slipper8s <noreply@slipper8s.com>"

export async function POST(req: NextRequest) {
  const rateLimitResponse = rateLimit(getClientIp(req))
  if (rateLimitResponse) return rateLimitResponse

  const session = await auth()

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const message = (body.message as string)?.trim()
  const page = (body.page as string)?.trim() || null

  if (!message || message.length < 5) {
    return NextResponse.json(
      { error: "Feedback must be at least 5 characters" },
      { status: 400 }
    )
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Feedback must be under 2000 characters" },
      { status: 400 }
    )
  }

  // Save to database
  const feedback = await prisma.feedback.create({
    data: {
      userId: session?.user?.id ?? null,
      userName: session?.user?.name ?? null,
      userEmail: session?.user?.email ?? null,
      message,
      page,
    },
  })

  // Send email notification (fire and forget)
  sendFeedbackNotification(feedback).catch((err) =>
    console.error("[feedback] Email notification failed:", err)
  )

  return NextResponse.json({ success: true })
}

async function sendFeedbackNotification(feedback: {
  id: string
  userName: string | null
  userEmail: string | null
  message: string
  page: string | null
  createdAt: Date
}) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[Slipper8s Feedback] from ${feedback.userName ?? "Anonymous"}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h2 style="color:#ffffff;font-size:18px;margin:0 0 16px;">New Feedback Received</h2>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">From</p>
      <p style="color:#e4e4e7;font-size:14px;margin:0 0 16px;">${feedback.userName ?? "Anonymous"} ${feedback.userEmail ? `(${feedback.userEmail})` : ""}</p>
      ${feedback.page ? `<p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Page</p><p style="color:#e4e4e7;font-size:14px;margin:0 0 16px;">${feedback.page}</p>` : ""}
      <p style="color:#a1a1aa;font-size:12px;margin:0 0 4px;">Message</p>
      <p style="color:#e4e4e7;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${feedback.message}</p>
    </div>
    <p style="color:#71717a;font-size:11px;margin:0;">ID: ${feedback.id} | ${feedback.createdAt.toISOString()}</p>
  </div>
</body>
</html>`,
    })
  } catch (err) {
    console.error("[feedback] Failed to send notification:", err)
  }
}
