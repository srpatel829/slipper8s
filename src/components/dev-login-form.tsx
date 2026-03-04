"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function DevLoginForm() {
  const [email, setEmail] = useState("dev@slipper8s.com")

  return (
    <div className="border-2 border-amber-500/50 bg-amber-500/10 rounded-xl p-4 mt-4">
      <p className="text-xs font-semibold text-amber-400 mb-3">Dev Mode</p>
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 text-sm bg-muted/50 border-border"
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 border-amber-500/50 text-amber-400 hover:bg-amber-500/20 shrink-0"
        >
          <a href={`/api/dev-login?email=${encodeURIComponent(email)}`}>
            Dev Login
          </a>
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Bypasses OAuth/email — dev only
      </p>
    </div>
  )
}
