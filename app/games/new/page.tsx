import NewGameClient from "./NewGameClient"

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

async function getPresets() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/presets/games?favorites_only=false`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ presets: Preset[] }>
}

export default async function Page() {
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