"use client"

import { useState } from "react"
import { Copy, Check, Share2 } from "lucide-react"

interface ShareCardProps {
  /** The URL to share */
  shareUrl: string
  /** The user's first name for personalization */
  firstName?: string
}

export function ShareCard({ shareUrl, firstName }: ShareCardProps) {
  const [copied, setCopied] = useState(false)

  const shareText = `I'm registered to play Slipper8s. You should sign up and see if you can beat me! ${shareUrl}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement("textarea")
      el.value = shareText
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Slipper8s — College Basketball Pool",
          text: `I'm registered to play Slipper8s. You should sign up and see if you can beat me!`,
          url: shareUrl,
        })
      } catch {
        // User cancelled or share failed — fall back to copy
        handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-foreground mb-3">Share with friends</p>

      {/* Visual share card preview */}
      <button
        onClick={handleNativeShare}
        className="block w-full text-left cursor-pointer"
      >
        <div className="bg-gradient-to-br from-primary to-blue-600 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
          <div className="p-4 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L15.09 8.26H22L17.55 12.5L19.64 18.74L12 14.5L4.36 18.74L6.45 12.5L2 8.26H8.91L12 2Z" />
                </svg>
              </div>
              <div>
                <div className="font-bold">Slipper8s</div>
                <div className="text-xs opacity-90">College Basketball Pool</div>
              </div>
            </div>
            <div className="text-sm font-semibold mb-2">
              I&apos;m registered to play Slipper8s
            </div>
            <div className="text-xs opacity-90">
              You should sign up and see if you can beat me!
            </div>
            <div className="text-xs opacity-75 mt-3 pt-3 border-t border-white/20">
              slipper8s.com
            </div>
          </div>
        </div>
      </button>

      {/* Copy / Share buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 h-8 text-xs px-3 border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </button>
        <button
          onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 h-8 text-xs px-3 border border-border rounded-lg hover:bg-accent transition-colors text-muted-foreground"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>
    </div>
  )
}
