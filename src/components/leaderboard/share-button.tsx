"use client"

import { ShareCard } from "@/components/share-card"

interface LeaderboardShareButtonProps {
  name: string
  rank: number
  score: number
  percentile: number
  teamsAlive: number
  totalEntries: number
}

export function LeaderboardShareButton({
  name,
  rank,
  score,
  percentile,
  teamsAlive,
  totalEntries,
}: LeaderboardShareButtonProps) {
  return (
    <ShareCard
      name={name}
      rank={rank}
      score={score}
      percentile={percentile}
      teamsAlive={teamsAlive}
      totalEntries={totalEntries}
      type="during"
    />
  )
}
