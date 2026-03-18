import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import ChangeHandSetupClient from "./ChangeHandSetupClient"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

type Game = {
  id: string
  title: string
  created_by_user_id: string
  scorekeeper_user_id: string
  nut_enabled: boolean
  skunk_enabled: boolean
  track_bid_trail: boolean
  digit_order_mode: string
  base_bet: string | number
  cards_per_hand: number
  bet_ladder: number[] | null
  settlement_mode: string
  status: string
  finalized_at: string | null
}

type Player = {
  id: string
  display_name: string
  is_active?: boolean
}

type PlayersResponse = {
  game_id: string
  players: Player[]
}

type User = {
  id: string
  email: string
  display_name: string
}

type Preset = {
  id: string
  name: string
  cards_per_hand: number
  base_bet: string | number
  bet_ladder: number[] | null
  nut_enabled: boolean
  skunk_enabled: boolean
  track_bid_trail: boolean
  digit_order_mode: string
}

type SyncResult = {
  id: string
  email: string
  display_name: string
  role: "player" | "scorer"
  created: boolean
}

async function syncCurrentUser(): Promise<SyncResult> {
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress
  if (!email) throw new Error("No signed-in user email found")

  const res = await fetch(`${API_BASE}/users/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      display_name:
        user?.fullName || user?.username || user?.firstName || "Player",
    }),
    cache: "no-store",
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function getGame(gameId: string): Promise<Game> {
  const res = await fetch(`${API_BASE}/games/${gameId}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function getPlayers(gameId: string): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/games/${gameId}/players`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())

  const data = (await res.json()) as PlayersResponse
  return data.players ?? []
}

async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function getPresets(): Promise<Preset[]> {
  const res = await fetch(`${API_BASE}/presets`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { gameId } = await params

  const [appUser, game] = await Promise.all([
    syncCurrentUser(),
    getGame(gameId),
  ])

  // 🔒 ACCESS CONTROL
  if (
    appUser.role !== "scorer" ||
    appUser.id !== game.scorekeeper_user_id
  ) {
    redirect(`/games/${gameId}/scoreboard`)
  }

  const [players, users, presets] = await Promise.all([
    getPlayers(gameId),
    getUsers(),
    getPresets(),
  ])

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Next Hand Setup
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Change Players / Hand Type
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Stay in this same game and prepare the next hand.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/games/${gameId}`}
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Back to Table
          </Link>

          <Link
            href={`/games/${gameId}/scoreboard`}
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            View Scoreboard
          </Link>
        </div>
      </div>

      <ChangeHandSetupClient
        gameId={gameId}
        gameTitle={game.title}
        settlementMode={game.settlement_mode}
        scorekeeperUserId={game.scorekeeper_user_id}
        users={users}
        currentPlayers={players}
        currentCardsPerHand={game.cards_per_hand}
        currentBaseBet={String(game.base_bet)}
        currentBetLadder={game.bet_ladder}
        currentNutEnabled={game.nut_enabled}
        currentSkunkEnabled={game.skunk_enabled}
        currentTrackBidTrail={game.track_bid_trail}
        currentDigitOrderMode={game.digit_order_mode}
        presets={presets}
      />
    </main>
  )
}