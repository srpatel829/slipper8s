"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trophy, Check, X, Loader2 } from "lucide-react"

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
]

const COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "India",
  "Germany", "France", "Brazil", "Mexico", "Japan", "South Korea",
  "China", "Nigeria", "South Africa", "Philippines", "Other",
]

function generateUsername(firstName: string, lastName: string): string {
  if (!firstName || !lastName) return ""
  const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "")
  const first = clean(firstName)
  const last = clean(lastName)
  if (!first || !last) return ""
  // e.g. "SheelP" from "Sheel Patel"
  return `${first.charAt(0).toUpperCase()}${first.slice(1).toLowerCase()}${last.charAt(0).toUpperCase()}`
}

export default function RegisterPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [usernameManual, setUsernameManual] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle")
  const [country, setCountry] = useState("")
  const [state, setState] = useState("")
  const [gender, setGender] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Redirect if already registered
  useEffect(() => {
    if (status === "authenticated" && session?.user?.registrationComplete) {
      router.replace("/leaderboard")
    }
  }, [status, session, router])

  // Auto-suggest username from name
  useEffect(() => {
    if (!usernameManual && firstName && lastName) {
      const suggested = generateUsername(firstName, lastName)
      setUsername(suggested)
    }
  }, [firstName, lastName, usernameManual])

  // Debounced username availability check
  const checkUsername = useCallback(async (value: string) => {
    if (!value || value.length < 4) {
      setUsernameStatus("invalid")
      return
    }
    if (!/^[a-zA-Z0-9_]{4,20}$/.test(value)) {
      setUsernameStatus("invalid")
      return
    }
    setUsernameStatus("checking")
    try {
      const res = await fetch(`/api/username?q=${encodeURIComponent(value)}`)
      const data = await res.json()
      setUsernameStatus(data.available ? "available" : "taken")
    } catch {
      setUsernameStatus("idle")
    }
  }, [])

  useEffect(() => {
    if (!username) {
      setUsernameStatus("idle")
      return
    }
    const timer = setTimeout(() => checkUsername(username), 400)
    return () => clearTimeout(timer)
  }, [username, checkUsername])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          country: country || null,
          state: state || null,
          gender: gender || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Registration failed")
        return
      }

      // Force session refresh and redirect
      router.replace("/leaderboard")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    router.replace("/login")
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-court p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(ellipse, oklch(0.72 0.18 42), transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg glow-blue">
            <Trophy className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Complete Your Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Set up your Slipper8s account</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Required fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-sm">First name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Sheel"
                  required
                  className="h-10 bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-sm">Last name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Patel"
                  required
                  className="h-10 bg-muted/50 border-border"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm">Username *</Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsernameManual(true)
                    setUsername(e.target.value)
                  }}
                  placeholder="SheelP"
                  required
                  minLength={4}
                  maxLength={20}
                  pattern="^[a-zA-Z0-9_]{4,20}$"
                  className="h-10 bg-muted/50 border-border pr-9"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                  {usernameStatus === "taken" && <X className="h-4 w-4 text-red-500" />}
                  {usernameStatus === "invalid" && <X className="h-4 w-4 text-amber-500" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                4-20 characters, letters/numbers/underscores. Set once, cannot be changed.
              </p>
              {usernameStatus === "taken" && (
                <p className="text-xs text-red-500">This username is already taken</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                Optional — helps you see how you rank in different groups
              </p>
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label className="text-sm">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="h-10 bg-muted/50 border-border">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">See how you rank among players in your country</p>
            </div>

            {/* State (only if USA) */}
            {country === "United States" && (
              <div className="space-y-1.5">
                <Label className="text-sm">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="h-10 bg-muted/50 border-border">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">See how you rank among players in your state</p>
              </div>
            )}

            {/* Gender */}
            <div className="space-y-1.5">
              <Label className="text-sm">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-10 bg-muted/50 border-border">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="NO_RESPONSE">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">See how you rank among players of your gender</p>
            </div>

            {/* Error */}
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || usernameStatus === "taken" || usernameStatus === "invalid" || usernameStatus === "checking" || !firstName.trim() || !lastName.trim() || !username.trim()}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold glow-blue-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Setting up...
                </>
              ) : (
                "Complete registration"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
