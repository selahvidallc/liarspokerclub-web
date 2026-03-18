const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

import Link from "next/link"
import ChangeHandSetupClient from "./ChangeHandSetupClient"

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

type User = {
  id: string
  email: string
  display_name: string
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

async function getGame(gameId: string): Promise<Game> {
  const res = await fetch(`${API_BASE}/games/${gameId}`, { cache: "no-store" })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Game fetch failed (${res.status}): ${text}`)
  }
  return res.json()
}

async function getPlayers(gameId: string): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/games/${gameId}/players`, {
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Players fetch failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as PlayersResponse
  return data.players ?? []
}

async function getUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, { cache: "no-store" })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Users fetch failed (${res.status}): ${text}`)
  }
  return res.json()
}

function formatBetLadder(ladder: number[] | null) {
  if (!ladder || ladder.length === 0) return "Flat Bet"
  return ladder.map((n) => `$${Number(n).toFixed(2)}`).join(", ")
}

export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params

  const [game, players, users] = await Promise.all([
    getGame(gameId),
    getPlayers(gameId),
    getUsers(),
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

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="lp-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">Current Game</h2>
            <span className="lp-badge">{game.status}</span>
          </div>

          <div className="grid gap-3">
            <div className="lp-card-soft flex items-start justify-between gap-4">
              <div className="text-sm text-slate-400">Title</div>
              <div className="text-right font-semibold text-slate-100">
                {game.title}
              </div>
            </div>

            <div className="lp-card-soft flex items-start justify-between gap-4">
              <div className="text-sm text-slate-400">Settlement Mode</div>
              <div className="text-right font-semibold text-slate-100">
                {game.settlement_mode}
              </div>
            </div>

            <div className="lp-card-soft flex items-start justify-between gap-4">
              <div className="text-sm text-slate-400">Cards Per Hand</div>
              <div className="text-right font-semibold text-slate-100">
                {game.cards_per_hand}
              </div>
            </div>

            <div className="lp-card-soft flex items-start justify-between gap-4">
              <div className="text-sm text-slate-400">Base Bet</div>
              <div className="text-right font-semibold text-slate-100">
                ${Number(game.base_bet).toFixed(2)}
              </div>
            </div>

            <div className="lp-card-soft flex items-start justify-between gap-4">
              <div className="text-sm text-slate-400">Bet Ladder</div>
              <div className="text-right font-semibold text-slate-100">
                {formatBetLadder(game.bet_ladder)}
              </div>
            </div>
          </div>
        </div>

        <div className="lp-card">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Next Hand Settings</h2>
            <p className="mt-1 text-sm text-slate-400">
              Settlement mode stays locked once the session is running.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Settlement Mode
              </label>
              <input
                value={game.settlement_mode}
                readOnly
                className="opacity-70"
              />
              <p className="mt-2 text-xs text-slate-500">
                Locked for the current session.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Cards Per Hand
              </label>
              <input
                value={String(game.cards_per_hand)}
                readOnly
                className="opacity-70"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Hand Type
              </label>
              <input
                value="Current backend does not support changing hand type yet"
                readOnly
                className="opacity-70"
              />
            </div>
          </div>
        </div>
      </section>

      <ChangeHandSetupClient
        gameId={gameId}
        gameTitle={game.title}
        settlementMode={game.settlement_mode}
        scorekeeperUserId={game.scorekeeper_user_id}
        users={users}
        currentPlayers={players}
        currentCardsPerHand={game.cards_per_hand}
      />
    </main>
  )
}