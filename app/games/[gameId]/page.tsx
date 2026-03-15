const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

import GameSessionActions from "./GameSessionActions"

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
}

type HandProgress = {
  game_id: string
  cards_per_hand: number
  current_hand_number: number
  cards_played_in_current_hand: number
  cards_remaining_in_current_hand: number
  hand_complete: boolean
}

async function getGame(gameId: string): Promise<Game> {
  const res = await fetch(`${API_BASE}/games/${gameId}`, { cache: "no-store" })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Game fetch failed (${res.status}): ${text}`)
  }
  return res.json()
}

type PlayersResponse = {
  game_id: string
  players: Player[]
}

async function getPlayers(gameId: string): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/games/${gameId}/players`, { cache: "no-store" })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Players fetch failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as PlayersResponse
  return data.players ?? []
}

async function getHandProgress(gameId: string): Promise<HandProgress | null> {
  const res = await fetch(`${API_BASE}/games/${gameId}/hand-progress`, { cache: "no-store" })
  if (!res.ok) {
    return null
  }
  return res.json()
}

function formatBetLadder(ladder: number[] | null) {
  if (!ladder || ladder.length === 0) return "Flat Bet"
  return ladder.map((n) => `$${Number(n).toFixed(2)}`).join(", ")
}

function formatYesNo(value: boolean) {
  return value ? "Yes" : "No"
}

export default async function GameTablePage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params

  const [game, players, progress] = await Promise.all([
    getGame(gameId),
    getPlayers(gameId),
    getHandProgress(gameId),
  ])

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Table / Game Home
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            {game.title || "Liar's Poker Game"}
          </h1>

          <div className="mt-2 text-sm text-slate-400">
            Game ID:{" "}
            <code className="rounded-lg bg-white/5 px-2 py-1 text-slate-200">
              {game.id}
            </code>
          </div>
        </div>

      </div>

      <section className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="lp-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">Game Settings</h2>
            <span className="lp-badge">{game.status}</span>
          </div>

          <div className="grid gap-3">
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

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Nut Enabled</div>
                <div className="mt-1 font-semibold text-slate-100">
                  {formatYesNo(game.nut_enabled)}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Skunk Enabled</div>
                <div className="mt-1 font-semibold text-slate-100">
                  {formatYesNo(game.skunk_enabled)}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Bid Trail</div>
                <div className="mt-1 font-semibold text-slate-100">
                  {formatYesNo(game.track_bid_trail)}
                </div>
              </div>
            </div>

            <div className="lp-card-soft flex items-start justify-between gap-4">
              <div className="text-sm text-slate-400">Digit Order Mode</div>
              <div className="text-right font-semibold text-slate-100">
                {game.digit_order_mode}
              </div>
            </div>
          </div>
        </div>

        <div className="lp-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold text-white">Current Progress</h2>
            {progress?.hand_complete ? (
              <span className="lp-badge-success inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                Hand Complete
              </span>
            ) : (
              <span className="lp-badge-neutral inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                In Progress
              </span>
            )}
          </div>

          {progress ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Current Hand</div>
                <div className="mt-1 text-xl font-bold text-white">
                  {progress.current_hand_number}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Current Card In Hand</div>
                <div className="mt-1 text-xl font-bold text-white">
                  {progress.cards_played_in_current_hand + 1}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Cards Per Hand</div>
                <div className="mt-1 font-semibold text-slate-100">
                  {progress.cards_per_hand}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Cards Remaining</div>
                <div className="mt-1 font-semibold text-slate-100">
                  {progress.cards_remaining_in_current_hand}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Hand Complete</div>
                <div className="mt-1 font-semibold text-slate-100">
                  {formatYesNo(progress.hand_complete)}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Finalized At</div>
                <div className="mt-1 font-semibold text-slate-100 break-all">
                  {game.finalized_at ?? "-"}
                </div>
              </div>
            </div>
          ) : (
            <div className="lp-card-soft">
              <p className="m-0 text-slate-300">
                No progress found yet. Start scoring when ready.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="lp-card mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Players at This Table</h2>
            <p className="mt-1 text-sm text-slate-400">
              Active roster for this game.
            </p>
          </div>

          <a
            href={`/games/${gameId}/players`}
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Edit Roster
          </a>
        </div>

        {players.length === 0 ? (
          <div className="lp-card-soft">
            <p className="m-0 text-slate-300">No players added yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {players.map((player) => (
              <div key={player.id} className="lp-card-soft">
                <div className="text-lg font-bold text-white">
                  {player.display_name}
                </div>
                <div className="mt-1 break-all text-sm text-slate-400">
                  {player.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <GameSessionActions
        gameId={gameId}
        handComplete={Boolean(progress?.hand_complete)}
      />
    </main>
  )
}