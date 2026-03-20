"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react"
import { ScoreHistoryChart } from "./score-history-chart"

interface ScoreHistorySectionProps {
  /** Filtered user IDs from dimension tabs (for chart leader/median sync) */
  filteredUserIds?: Set<string>
}

export function ScoreHistorySection({ filteredUserIds }: ScoreHistorySectionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Score History
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <ScoreHistoryChart filteredUserIds={filteredUserIds} />
        </CardContent>
      )}
    </Card>
  )
}
