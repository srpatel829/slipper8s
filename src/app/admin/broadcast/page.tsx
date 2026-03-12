"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Mail, Send, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

const AUDIENCES = [
  { value: "all", label: "All Registered Users", desc: "Every user who completed registration" },
  { value: "with_entries", label: "Users with Entry Slips", desc: "Only users who have submitted entry slips" },
  { value: "paid", label: "Paid Users", desc: "Only users marked as paid" },
  { value: "opted_in", label: "Opted-In Users", desc: "Users with notifications enabled" },
]

export default function AdminBroadcastPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState("all")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    sent?: number
    failed?: number
    totalUsers?: number
  } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSend() {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, audience }),
      })
      const data = await res.json()
      setResult(data)
      if (data.success) {
        setShowConfirm(false)
      }
    } catch {
      setResult({ success: false })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          Broadcast Email
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send an email to all players or a subset. Use sparingly.
        </p>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        {/* Audience */}
        <div>
          <label className="text-sm font-semibold mb-2 block">Audience</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAudience(a.value)}
                className={`text-left p-3 rounded-lg border transition-colors ${
                  audience === a.value
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                }`}
              >
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="text-sm font-semibold mb-2 block">
            Subject Line
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Important update about your Slipper8s pool"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Will be prefixed with &ldquo;Slipper8s:&rdquo; automatically
          </p>
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="text-sm font-semibold mb-2 block">
            Message
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message here. Use line breaks for paragraphs."
            rows={8}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Plain text — line breaks become separate paragraphs in the email
          </p>
        </div>

        {/* Preview */}
        {(subject || message) && (
          <div className="border border-border/50 rounded-lg p-4 bg-background/50">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Preview
            </p>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Slipper8s: {subject || "(no subject)"}
              </p>
              <div className="text-sm text-muted-foreground whitespace-pre-line">
                Hey [Player Name],{"\n\n"}
                {message || "(no message)"}
              </div>
            </div>
          </div>
        )}

        {/* Send */}
        {!showConfirm ? (
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!subject.trim() || !message.trim()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send Broadcast
          </Button>
        ) : (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">
                  Are you sure you want to send this?
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  This will send an email to{" "}
                  <strong className="text-foreground">
                    {AUDIENCES.find((a) => a.value === audience)?.label?.toLowerCase()}
                  </strong>
                  . This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleSend} disabled={sending} variant="destructive" size="sm" className="gap-1.5">
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {sending ? "Sending..." : "Yes, send it"}
                  </Button>
                  <Button onClick={() => setShowConfirm(false)} variant="outline" size="sm" disabled={sending}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div
            className={`rounded-lg p-4 ${
              result.success
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
              <p className="text-sm font-semibold">
                {result.success
                  ? `Sent successfully: ${result.sent} of ${result.totalUsers} emails delivered`
                  : "Failed to send broadcast"}
              </p>
            </div>
            {result.failed && result.failed > 0 && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {result.failed} email{result.failed > 1 ? "s" : ""} failed to deliver
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
