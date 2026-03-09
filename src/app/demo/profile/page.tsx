"use client"

import { useDemoContext } from "@/lib/demo-context"
import { Badge } from "@/components/ui/badge"
import { User, Mail, AtSign, Globe, Heart, Bell, Shield } from "lucide-react"

export default function DemoProfilePage() {
  const { currentPersona, session } = useDemoContext()
  const user = session.user

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
        {/* Account info */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <p className="text-sm font-medium">{user.name ?? "Demo User"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <AtSign className="h-3 w-3" /> Username
              </label>
              <p className="text-sm font-medium text-muted-foreground/60">
                (set at registration, cannot be changed)
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Role
              </label>
              <Badge variant="outline" className="text-xs">{user.role}</Badge>
            </div>
          </div>
        </div>

        {/* Payment status */}
        <div className="border-t border-border pt-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Payment
          </h2>
          <div className="flex items-center gap-2">
            {user.isPaid ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>
            ) : (
              <Badge variant="outline" className="text-red-400 border-red-500/30">Unpaid</Badge>
            )}
          </div>
        </div>

        {/* Optional fields */}
        <div className="border-t border-border pt-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Demographics
          </h2>
          <p className="text-xs text-muted-foreground">
            These fields help you see how you rank in different groups. They are editable anytime.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Country</label>
              <p className="text-sm text-muted-foreground/60 italic">Not set</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">State</label>
              <p className="text-sm text-muted-foreground/60 italic">Not set</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Gender</label>
              <p className="text-sm text-muted-foreground/60 italic">Not set</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-400" /> Favorite Team
              </label>
              <p className="text-sm text-muted-foreground/60 italic">Not set</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="border-t border-border pt-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </h2>
          <p className="text-xs text-muted-foreground">
            Email notifications for daily recaps, deadline reminders, and play-in resolution updates.
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Enabled</Badge>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          This is a demo view. In the real app, you can edit all fields.
        </p>
      </div>
    </div>
  )
}
