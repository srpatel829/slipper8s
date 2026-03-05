import { prisma } from "@/lib/prisma"
import { SettingsForm } from "@/components/admin/settings-form"

export const dynamic = "force-dynamic"

async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: "main" },
    create: { id: "main", picksDeadline: null, payoutStructure: [], defaultCharities: [] },
    update: {},
  })
}

export default async function AdminSettingsPage() {
  const settings = await getSettings()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Pool Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure picks deadline, payout structure, and default charities.
        </p>
      </div>
      <SettingsForm
        initialDeadline={settings.picksDeadline?.toISOString() ?? null}
        initialPayouts={settings.payoutStructure as Array<{ place: number; label: string; amount: string }>}
        initialCharities={settings.defaultCharities as Array<{ name: string; url?: string }>}
        initialMaintenanceMode={settings.maintenanceMode}
      />
    </div>
  )
}
