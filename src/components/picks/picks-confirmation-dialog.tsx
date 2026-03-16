"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"

interface PicksConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  firstName: string
  nickname: string | null
  teams: { name: string; shortName: string; seed: number; region: string; logoUrl: string | null; logoUrl2?: string | null }[]
  tps: number
  expectedScore: number | null
  archetypes: { key: string; label: string; emoji: string; description: string }[]
}

export function PicksConfirmationDialog({
  open,
  onOpenChange,
  firstName,
  nickname,
  teams,
  tps,
  expectedScore,
  archetypes,
}: PicksConfirmationDialogProps) {
  const entryLabel = nickname || "Main Entry Slip"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <DialogTitle className="text-xl">Picks Confirmed</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {firstName}, your picks for entry slip ID: [{entryLabel}] have been saved
          </DialogDescription>
        </DialogHeader>

        {/* Score summary */}
        <div className="text-center text-sm text-muted-foreground">
          Your 8 Teams with a max score of{" "}
          <span className="font-mono font-bold text-primary">{tps}</span>
          {expectedScore != null && (
            <>
              {" "}and expected score of{" "}
              <span className="font-mono font-bold text-foreground">
                {expectedScore.toFixed(1)}
              </span>
            </>
          )}
        </div>

        {/* Team list */}
        <div className="space-y-1.5 rounded-lg border border-border bg-card p-3">
          {teams.map((team, i) => (
            <div key={team.shortName + team.seed} className="flex items-center gap-2 text-sm">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                {i + 1}.
              </span>
              {team.logoUrl && team.logoUrl2 ? (
                <span className="flex items-center gap-0.5 shrink-0">
                  <img src={team.logoUrl} alt="" className="h-5 w-5 object-contain" />
                  <span className="text-[10px] text-muted-foreground">/</span>
                  <img src={team.logoUrl2} alt="" className="h-5 w-5 object-contain" />
                </span>
              ) : team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.shortName}
                  className="h-5 w-5 shrink-0 object-contain"
                />
              ) : (
                <div className="h-5 w-5 shrink-0 rounded bg-muted" />
              )}
              <span className="text-foreground">
                #{team.seed} {team.name}{" "}
                <span className="text-muted-foreground">({team.region})</span>
              </span>
            </div>
          ))}
        </div>

        {/* Archetypes section */}
        {archetypes.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Based on the picks you have made your archetype(s) are:
            </p>
            {archetypes.map((arch) => (
              <p key={arch.key} className="text-sm text-foreground">
                {arch.emoji}{" "}
                <span className="font-semibold">{arch.label}</span>:{" "}
                <span className="text-muted-foreground">{arch.description}</span>
              </p>
            ))}
          </div>
        )}

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground">
          You can edit your picks anytime before the entry slip deadline.
        </p>

        <DialogFooter className="sm:justify-center">
          <DialogClose asChild>
            <Button variant="default">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
