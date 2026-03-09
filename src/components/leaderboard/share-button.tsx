"use client"

import { ShareCard } from "@/components/share-card"

interface LeaderboardShareButtonProps {
  name: string
  rank: number
  score: number
  percentile: number
  teamsAlive: number
  totalEntries: number
  seasonCompleted?: boolean
}

export function LeaderboardShareButton({
  name,
  rank,
  score,
  percentile,
  teamsAlive,
  totalEntries,
  seasonCompleted = false,
}: LeaderboardShareButtonProps) {
  return (
    <ShareCard
      name={name}
      rank={rank}
      score={score}
      percentile={percentile}
      teamsAlive={teamsAlive}
      totalEntries={totalEntries}
      type={seasonCompleted ? "post" : "during"}
    />
  )
}
