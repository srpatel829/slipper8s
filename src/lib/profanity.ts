// Simple profanity filter for username validation.
// Uses a basic blocklist approach. Not exhaustive but catches common cases.

const BLOCKED_WORDS = [
  "ass", "damn", "hell", "shit", "fuck", "bitch", "dick", "cock",
  "pussy", "cunt", "fag", "nigger", "nigga", "retard", "slut",
  "whore", "bastard", "piss", "crap", "twat", "wank",
]

export function isProfane(text: string): boolean {
  const lower = text.toLowerCase()
  return BLOCKED_WORDS.some((word) => lower.includes(word))
}
