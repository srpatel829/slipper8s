"use client"

/**
 * CharityInput — Standalone charity preference input.
 *
 * Extracted from PicksForm so it can be rendered independently
 * (e.g. below the bracket in the demo picks page).
 */

import { Heart } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface CharityInputProps {
  charity: string
  setCharity: (value: string) => void
  disabled?: boolean
}

export function CharityInput({ charity, setCharity, disabled }: CharityInputProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 max-w-md">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-rose-400" />
        <Label htmlFor="charity-input" className="text-sm font-semibold">
          Charity preference
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Charities should be 501(c)(3) organizations.
      </p>
      <Input
        id="charity-input"
        placeholder="e.g. a 501(c)(3) organization"
        value={charity}
        onChange={(e) => setCharity(e.target.value)}
        disabled={disabled}
        className="bg-muted/50"
      />
      <p className="text-[10px] text-muted-foreground">
        Top 4 finishers&apos; charities are shown on the leaderboard.
      </p>
    </div>
  )
}
