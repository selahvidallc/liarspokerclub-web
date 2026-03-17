import ScorerClient from "./ScorerClient"

type Player = {
  id: string
  display_name: string
  is_active: boolean
}

type Game = {
  id: string
  scorekeeper_user_id: string
}

type GameSettings = {
  id: string
  title: string
  cards_per_hand: number
  base_bet: string
  bet_ladder: number[] | null
  settlement_mode: string
  nut_enabled: boolean
  skunk_enabled: boolean
  track_bid_trail: boolean
  digit_order_mode: string
}

type HandProgress = {
  game_id: string
  cards_per_hand: number
  current_hand_number: number
  cards_played_in_current_hand: number
  cards_remaining_in_current_hand: number
  hand_complete: boolean
}

async function getPlayers(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}/players`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ game_id: string; players: Player[] }>
}

async function getSettings(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}/settings`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<GameSettings>
}

async function getHandProgress(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}/hand-progress`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<HandProgress>
}

async function getGame(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<Game>
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params

  if (!gameId || gameId === "undefined" || !isUuid(gameId)) {
    return (
      <main style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Scorer</h1>
        <p>Invalid game id.</p>
      </main>
    )
  }

  const [playerData, settings, progress, game] = await Promise.all([
    getPlayers(gameId),
    getSettings(gameId),
    getHandProgress(gameId),
    getGame(gameId),
  ])

  return (
    <ScorerClient
      gameId={gameId}
      players={playerData.players.filter((p) => p.is_active)}
      settings={settings}
      progress={progress}
      appUserId={game.scorekeeper_user_id}
    />
  )
}