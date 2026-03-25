import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import NewGameClient from "./NewGameClient"
import type { AppRole } from "@/lib/roles"
import { canCreateGame } from "@/lib/roles"

type SyncResult = {
  id: string
  email: string
  display_name: string
  role: AppRole
  created: boolean
}

type Preset = {
  id: string
  name: string
  cards_per_hand: number
  base_bet: string
  bet_ladder: number[] | null
  nut_enabled: boolean
  skunk_enabled: boolean
  track_bid_trail: boolean
  digit_order_mode: string
  is_favorite: boolean
}

async function syncCurrentUser(): Promise<SyncResult> {
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress
  if (!email) throw new Error("No signed-in user email found")

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/users/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      display_name:
        user?.fullName || user?.username || user?.firstName || "Player",
    }),
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`User sync failed (${res.status}): ${text}`)
  }

  return res.json()
}

async function getPresets() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/presets/games?favorites_only=false`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ presets: Preset[] }>
}

export default async function Page() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const appUser = await syncCurrentUser()

  if (!canCreateGame(appUser.role)) {
    redirect("/dashboard")
  }

  const presetData = await getPresets()

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>
        Create New Game
      </h1>

      <NewGameClient presets={presetData.presets} />
    </main>
  )
}