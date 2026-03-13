import GameSessionActions from "../GameSessionActions"

type HandPlayerRow = {
  player_id: string
  display_name: string
  cards: Record<string, number>
  hand_total: number
}

type HandBoard = {
  hand_number: number
  cards: string[]
  players: HandPlayerRow[]
  card_totals: Record<string, number>
  hand_total_sum: number
}

type HandSummaryRow = {
  hand_number: number
  totals: Record<string, number>
}

type SessionSummaryPlayer = {
  player_id: string
  display_name: string
  session_total: number
}

type SessionScoreboardResponse = {
  game_id: string
  hands: HandBoard[]
  hand_summary: HandSummaryRow[]
  session_summary: SessionSummaryPlayer[]
}

function money(v: number | string | undefined) {
  if (v === undefined) return ""
  const n = typeof v === "string" ? Number(v) : v
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

function amountClass(v: number) {
  if (v > 0) return "money-positive"
  if (v < 0) return "money-negative"
  return "text-slate-300"
}

type HandProgress = {
  game_id: string
  cards_per_hand: number
  current_hand_number: number
  cards_played_in_current_hand: number
  cards_remaining_in_current_hand: number
  hand_complete: boolean
}

async function getHandProgress(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}/hand-progress`, {
    cache: "no-store",
  })

  if (!res.ok) {
    return null as HandProgress | null
  }

  return res.json() as Promise<HandProgress | null>
}

async function getScoreboardSession(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}/scoreboard/session`, {
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Scoreboard session fetch failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<SessionScoreboardResponse>
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
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Scoreboard
        </h1>
        <p className="mt-4 text-slate-300">Invalid game id.</p>
      </main>
    )
  }

  const [data, progress] = await Promise.all([
    getScoreboardSession(gameId),
    getHandProgress(gameId),
  ])

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Scoreboard
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Session Scoreboard
          </h1>

          <div className="mt-2 text-sm text-slate-400">
            Game:{" "}
            <code className="rounded-lg bg-white/5 px-2 py-1 text-slate-200">
              {data.game_id}
            </code>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={`/games/${gameId}`}
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Back to Table
          </a>

          <a
            href={`/games/${gameId}/scorer`}
            className="lp-button inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Go to Scorer
          </a>
        </div>
      </div>

      <div className="grid gap-6">
        {data.hands.map((hand) => (
          <section key={hand.hand_number} className="lp-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Hand {hand.hand_number}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Player-by-player totals for each card and the hand total.
                </p>
              </div>

              <span className="lp-badge">
                {hand.players.length} Player{hand.players.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-[560px] table-fixed">
                <thead>
                  <tr className="bg-white/5">
                    <th className="w-[120px] px-2 py-3 text-left">Player</th>
                    {hand.cards.map((card) => (
                      <th key={card} className="w-[82px] px-2 py-3 text-right">
                        {card}
                      </th>
                    ))}
                    <th className="w-[90px] px-2 py-3 text-right">Hand Total</th>
                  </tr>
                </thead>

                <tbody>
                  {hand.players.map((p) => (
                    <tr key={p.player_id}>
                      <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3 align-top">
                        <div className="truncate font-semibold leading-tight text-white">
                          {p.display_name}
                        </div>
                        <div className="truncate text-[11px] leading-tight text-slate-500">
                          {p.player_id}
                        </div>
                      </td>

                      {hand.cards.map((card) => {
                        const v = Number(p.cards[card] ?? 0)
                        return (
                          <td
                            key={card}
                            className={`w-[82px] px-2 py-3 text-right whitespace-nowrap ${amountClass(v)}`}
                          >
                            {v === 0 ? "-" : money(v)}
                          </td>
                        )
                      })}

                      <td
                        className={`w-[90px] px-2 py-3 text-right whitespace-nowrap font-bold ${amountClass(
                          Number(p.hand_total)
                        )}`}
                      >
                        {money(p.hand_total)}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-white/5">
                    <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3 font-extrabold text-white">
                      Hand Total
                    </td>

                    {hand.cards.map((card) => {
                      const total = Number(hand.card_totals[card] ?? 0)
                      return (
                        <td
                          key={card}
                          className={`w-[82px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                            total
                          )}`}
                        >
                          {money(total)}
                        </td>
                      )
                    })}

                    <td
                      className={`w-[90px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                        Number(hand.hand_total_sum)
                      )}`}
                    >
                      {money(hand.hand_total_sum)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="lp-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Session Summary (Cum Cum)
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Rollup of every hand into cumulative session totals.
              </p>
            </div>

            <span className="lp-badge">
              {data.hand_summary.length} Hand{data.hand_summary.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[500px] table-fixed">
              <thead>
                <tr className="bg-white/5">
                  <th className="w-[120px] px-2 py-3 text-left">Player</th>
                  {data.hand_summary.map((h) => (
                    <th key={h.hand_number} className="w-[82px] px-2 py-3 text-right">
                      Hand {h.hand_number}
                    </th>
                  ))}
                  <th className="w-[96px] px-2 py-3 text-right">Session Total</th>
                </tr>
              </thead>

              <tbody>
                {data.session_summary.map((p) => {
                  const handAmounts = data.hand_summary.map((h) => ({
                    hand_number: h.hand_number,
                    value: Number(h.totals[p.player_id] ?? 0),
                  }))

                  return (
                    <tr key={p.player_id}>
                      <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3">
                        <div className="truncate font-semibold leading-tight text-white">
                          {p.display_name}
                        </div>
                      </td>

                      {handAmounts.map((h) => (
                        <td
                          key={h.hand_number}
                          className={`w-[82px] px-2 py-3 text-right whitespace-nowrap ${amountClass(
                            h.value
                          )}`}
                        >
                          {h.value === 0 ? "-" : money(h.value)}
                        </td>
                      ))}

                      <td
                        className={`w-[96px] px-2 py-3 text-right whitespace-nowrap font-bold ${amountClass(
                          Number(p.session_total)
                        )}`}
                      >
                        {money(p.session_total)}
                      </td>
                    </tr>
                  )
                })}

                <tr className="bg-white/5">
                  <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3 font-extrabold text-white">
                    Session Total
                  </td>

                  {data.hand_summary.map((h) => {
                    const total = Object.values(h.totals).reduce(
                      (sum, v) => sum + Number(v || 0),
                      0
                    )

                    return (
                      <td
                        key={h.hand_number}
                        className={`w-[82px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                          total
                        )}`}
                      >
                        {money(total)}
                      </td>
                    )
                  })}

                  <td
                    className={`w-[96px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                      data.session_summary.reduce(
                        (sum, p) => sum + Number(p.session_total || 0),
                        0
                      )
                    )}`}
                  >
                    {money(
                      data.session_summary.reduce(
                        (sum, p) => sum + Number(p.session_total || 0),
                        0
                      )
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="lp-card">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
            <p className="mt-1 text-sm text-slate-400">
              Move between the main game screens.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`/games/${gameId}`}
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Back to Table
            </a>

            <a
              href={`/games/${gameId}/players`}
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Manage Players
            </a>

            <a
              href={`/games/${gameId}/scorer`}
              className="lp-button inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Enter Scores
            </a>
            <a
              href={`/info?gameId=${gameId}`}
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Liar&apos;s Poker Info
            </a>
          </div>
        </section>
      </div>
      <GameSessionActions
        gameId={gameId}
        handComplete={Boolean(progress?.hand_complete)}
      />
    </main>
  )
}