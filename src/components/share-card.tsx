"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Share2, Download, Copy, Check, X } from "lucide-react"

interface ShareCardProps {
  name: string
  rank?: number
  score?: number
  percentile?: number
  teamsAlive?: number
  totalEntries?: number
  type: "pre" | "during" | "post"
}

export function ShareCard({
  name,
  rank,
  score,
  percentile,
  teamsAlive,
  totalEntries,
  type,
}: ShareCardProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://slipper8s.com"

  // Build OG image URL
  const params = new URLSearchParams()
  params.set("type", type)
  if (name) params.set("name", name)
  if (rank != null) params.set("rank", String(rank))
  if (score != null) params.set("score", String(score))
  if (percentile != null) params.set("percentile", String(percentile))
  if (teamsAlive != null) params.set("alive", String(teamsAlive))
  if (totalEntries != null) params.set("total", String(totalEntries))

  const imageUrl = `${appUrl}/api/og?${params.toString()}`
  const shareUrl = appUrl

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: type === "pre"
            ? "Join me on Slipper8s!"
            : `I'm ranked #${rank} on Slipper8s!`,
          text: type === "pre"
            ? `I'm in for the 2026 Slipper8s tournament pool. Pick 8 teams, score = seed × wins. Join me!`
            : `I'm ranked #${rank} (Top ${percentile}%) with ${score} pts on Slipper8s!`,
          url: shareUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink()
    }
  }

  function handleDownload() {
    const link = document.createElement("a")
    link.href = imageUrl
    link.download = `slipper8s-${type}-card.png`
    link.click()
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8"
        onClick={() => setOpen(true)}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm">Share Your Results</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Card preview */}
            <div className="p-5">
              <div className="bg-background rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Share card preview"
                  className="w-full h-auto"
                  loading="eager"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              <Button onClick={handleShare} size="sm" className="gap-1.5 flex-1">
                <Share2 className="h-3.5 w-3.5" />
                {typeof navigator !== "undefined" && "share" in navigator ? "Share" : "Share Link"}
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm" className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Save Image
              </Button>
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
