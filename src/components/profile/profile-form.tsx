"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { User, Mail, AtSign, Globe, Heart, Bell, Shield, Loader2, Save, LogOut, Calendar, Phone } from "lucide-react"
import { signOut } from "next-auth/react"
import type { Gender } from "@/generated/prisma"

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

interface ProfileUser {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  email: string
  country: string | null
  state: string | null
  gender: Gender | null
  favoriteTeamId: string | null
  notificationsEnabled: boolean
  dateOfBirth: Date | null
  phone: string | null
  role: string
  isPaid: boolean
  createdAt: Date
  favoriteTeam: { id: string; name: string; seed: number; conference: string | null } | null
}

interface TeamOption {
  id: string
  name: string
  seed: number
  conference: string | null
}

interface ProfileFormProps {
  user: ProfileUser
  teams: TeamOption[]
}

function getSeedColor(seed: number): string {
  if (seed <= 4) return "#C0392B"
  if (seed <= 8) return "#E67E22"
  if (seed <= 12) return "#D4AC0D"
  return "#27AE60"
}

export function ProfileForm({ user, teams }: ProfileFormProps) {
  const router = useRouter()
  const [country, setCountry] = useState(user.country ?? "")
  const [state, setState] = useState(user.state ?? "")
  const [gender, setGender] = useState(user.gender ?? "")
  const [favoriteTeamId, setFavoriteTeamId] = useState(user.favoriteTeamId ?? "")
  const [notifications, setNotifications] = useState(user.notificationsEnabled)
  const [dateOfBirth, setDateOfBirth] = useState(
    user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split("T")[0] : ""
  )
  const [phone, setPhone] = useState(user.phone ?? "")
  const [saving, setSaving] = useState(false)

  const selectedTeam = teams.find(t => t.id === favoriteTeamId)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: country && country !== "none" ? country : null,
          state: state && state !== "none" ? state : null,
          gender: gender || null,
          favoriteTeamId: favoriteTeamId && favoriteTeamId !== "none" ? favoriteTeamId : null,
          notificationsEnabled: notifications,
          dateOfBirth: dateOfBirth || null,
          phone: phone || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to save")
        return
      }
      toast.success("Profile updated")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Fixed info card */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          Account Info
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <AtSign className="h-3 w-3" /> Username
            </Label>
            <p className="text-sm font-medium">@{user.username}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Role
            </Label>
            <p className="text-sm font-medium">{user.role}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Username and email cannot be changed. Contact an admin if you need help.
        </p>
      </div>

      {/* Editable fields */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Location & Demographics
          <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>
        </h2>

        <div className="space-y-4">
          {/* Country */}
          <div className="space-y-1.5">
            <Label className="text-sm">Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-10 bg-muted/50 border-border">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Response</SelectItem>
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">See how you rank among players in your country</p>
          </div>

          {/* State */}
          {country === "United States" && (
            <div className="space-y-1.5">
              <Label className="text-sm">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="h-10 bg-muted/50 border-border">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Response</SelectItem>
                  {US_STATES.map(s => (
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
        </div>
      </div>

      {/* Favorite team */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-400" />
          Favorite Team
        </h2>
        <div className="space-y-1.5">
          <Select value={favoriteTeamId} onValueChange={setFavoriteTeamId}>
            <SelectTrigger className="h-10 bg-muted/50 border-border">
              <SelectValue placeholder="Select your favorite team" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="none">No favorite</SelectItem>
              {teams.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-bold px-1 py-0.5 rounded text-white"
                      style={{ backgroundColor: getSeedColor(t.seed) }}
                    >
                      {t.seed}
                    </span>
                    {t.name}
                    {t.conference && (
                      <span className="text-muted-foreground text-xs">({t.conference})</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            See how you rank among fans of your team and conference
          </p>
          {selectedTeam && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-muted/30 rounded-lg">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                style={{ backgroundColor: getSeedColor(selectedTeam.seed) }}
              >
                #{selectedTeam.seed}
              </span>
              <span className="text-sm font-medium">{selectedTeam.name}</span>
              {selectedTeam.conference && (
                <span className="text-xs text-muted-foreground">· {selectedTeam.conference}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional info */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Additional Info
          <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>
        </h2>

        <div className="space-y-4">
          {/* Date of Birth */}
          <div className="space-y-1.5">
            <Label className="text-sm">Date of Birth</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="h-10 bg-muted/50 border-border max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              May be required for future prize verification (age 18+)
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-sm flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> Phone Number
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="h-10 bg-muted/50 border-border max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              For future score update notifications via text (coming soon)
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          Notifications
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email notifications</p>
            <p className="text-xs text-muted-foreground">
              Daily recaps, deadline reminders, and play-in slot updates.
              Mandatory emails (welcome, confirmation, final results) always send.
            </p>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save changes
          </>
        )}
      </Button>

      {/* Account info */}
      <div className="text-[11px] text-muted-foreground space-y-1 pt-4 border-t border-border">
        <p>Account created: {new Date(user.createdAt).toLocaleDateString()}</p>
        <p>Payment status: {user.isPaid ? "Paid" : "Unpaid"}</p>
      </div>

      {/* Sign out */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">
              Sign out of your Slipper8s account on this device.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
