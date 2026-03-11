"use client"

import { useState } from "react"
import { MessageSquarePlus, X, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { usePathname } from "next/navigation"

export function FeedbackButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || message.trim().length < 5) {
      toast.error("Please write at least 5 characters")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), page: pathname }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to submit feedback")
        return
      }
      toast.success("Thanks for your feedback!")
      setMessage("")
      setOpen(false)
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Floating feedback button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-1.5 bg-primary text-primary-foreground shadow-lg rounded-full px-3.5 py-2 text-xs font-semibold hover:bg-primary/90 transition-all hover:shadow-xl hover:scale-105 active:scale-95"
        title="Send feedback"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 mb-0 sm:mb-0 bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-sm">Send Feedback</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Help us improve Slipper8s
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Found a bug? Have a suggestion? Tell us anything..."
                  className="w-full h-32 px-3.5 py-2.5 bg-muted/50 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground/60"
                  maxLength={2000}
                  autoFocus
                />
                <div className="flex justify-between mt-1.5">
                  <p className="text-[10px] text-muted-foreground">
                    Your name and email are attached automatically if logged in.
                  </p>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {message.length}/2000
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || message.trim().length < 5}
                  className="flex-1 flex items-center justify-center gap-2 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Submit Feedback
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 px-4 text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
