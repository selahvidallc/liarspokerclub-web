"use client"
import GameSessionActions from "../GameSessionActions"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

type Player = {
  id: string
  display_name: string
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

function faceToInternal(face: string) {
  if (face === "10") return "0"
  if (face === "A") return "1"
  return face
}

function money(v: number | string | undefined) {
  if (v === undefined) return ""
  const n = typeof v === "string" ? Number(v) : v
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

export default function ScorerClient({
  gameId,
  players,
  settings,
  appUserId,
}: {
  gameId: string
  players: Player[]
  settings: GameSettings
  appUserId: string
}) {
  const router = useRouter()

  const [bidOwner, setBidOwner] = useState("")
  const [bidOwnerWon, setBidOwnerWon] = useState(false)

  const [count, setCount] = useState(3)
  const [face, setFace] = useState("7")

  const [nut, setNut] = useState(false)
  const [skunk, setSkunk] = useState(false)

  const [betAmount, setBetAmount] = useState("")
  const [notes, setNotes] = useState("")

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [cardSaved, setCardSaved] = useState(false)

  const handNumber = 1
  const cardsPlayed = 0
  const cardsRemaining = settings.cards_per_hand
  const nextCardNumber = 1
  const handWillBeCompleteAfterSave = nextCardNumber >= settings.cards_per_hand

  const resolvedBet = useMemo(() => {
    if (betAmount.trim()) return Number(betAmount)

    if (settings.bet_ladder && settings.bet_ladder.length > 0) {
      let idx = nextCardNumber - 1
      if (idx < 0) idx = 0
      if (idx >= settings.bet_ladder.length) idx = settings.bet_ladder.length - 1
      return Number(settings.bet_ladder[idx])
    }

    return Number(settings.base_bet)
  }, [betAmount, nextCardNumber, settings.bet_ladder, settings.base_bet])

  async function submit() {
    setMsg("")
    setCardSaved(false)

    if (!bidOwner) {
      setMsg("Pick the bid owner.")
      return
    }

    const finalBidRaw = `${count}x${faceToInternal(face)}`

    const payload = {
      hand_number: handNumber,
      bid_owner_user_id: bidOwner,
      bid_owner_won: bidOwnerWon,
      final_bid_raw: finalBidRaw,
      bet_amount: betAmount.trim() ? betAmount.trim() : null,
      is_nut: nut,
      is_skunk: skunk,
      notes: notes.trim() ? notes.trim() : null,
    }

    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/hands/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": appUserId,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      setMsg(`Saved! Hand #${data.hand_number} — rows created: ${data.rows_created}`)
      setCardSaved(true)
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  function playAnotherCardInSameHand() {
    router.refresh()
  }

  function playAnotherHand() {
    router.refresh()
  }

  async function finalizeCumCum() {
    setMsg("")
    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/finalize`, {
        method: "POST",
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`Finalize failed: ${text}`)
        return
      }

      setMsg("Session finalized.")
      router.push(`/games/${gameId}/session-summary`)
      router.refresh()
    } catch (e: any) {
      setMsg(`Finalize failed: ${e?.message || String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-white">
        Scorer
      </h1>

      <div className="mb-6 text-sm text-slate-400">
        Game: <code className="rounded bg-white/5 px-2 py-1 text-slate-200">{gameId}</code>
      </div>

      <section className="lp-card mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{settings.title}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Settlement Mode: <span className="font-semibold text-slate-200">{settings.settlement_mode}</span>
            </p>
          </div>

          <div className="lp-badge">
            Hand #{handNumber}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="lp-card-soft">
            <div className="text-sm text-slate-400">Cards Per Hand</div>
            <div className="mt-1 text-lg font-bold text-white">{settings.cards_per_hand}</div>
          </div>

          <div className="lp-card-soft">
            <div className="text-sm text-slate-400">Card In This Hand</div>
            <div className="mt-1 text-lg font-bold text-white">
              {nextCardNumber} of {settings.cards_per_hand}
            </div>
          </div>

          <div className="lp-card-soft">
            <div className="text-sm text-slate-400">Cards Remaining After Save</div>
            <div className="mt-1 text-lg font-bold text-white">
              {Math.max(0, cardsRemaining - 1)}
            </div>
          </div>

          <div className="lp-card-soft">
            <div className="text-sm text-slate-400">Current Card Bet</div>
            <div className="mt-1 text-lg font-bold text-white">{money(resolvedBet)}</div>
          </div>
        </div>

        <div className="mt-4 lp-card-soft">
          <div className="text-sm text-slate-400">Ladder</div>
          <div className="mt-1 font-semibold text-slate-100">
            {settings.bet_ladder && settings.bet_ladder.length > 0
              ? settings.bet_ladder.map((v) => money(v)).join(", ")
              : `Flat ${money(settings.base_bet)}`}
          </div>
        </div>
      </section>

      {msg && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
            cardSaved
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          <div className="whitespace-pre-wrap">{msg}</div>
        </div>
      )}

      {cardSaved && (
        <section className="lp-card mb-6">

          {!handWillBeCompleteAfterSave ? (
            <>
              <div className="mb-4 text-lg font-bold text-white">
                Card saved. This hand is not complete yet.
              </div>

            </>
          ) : (
            <>
              <div className="mb-4 text-lg font-bold text-white">
                Hand complete. Review the scoreboard, start a new hand, or finalize the session.
              </div>

              <GameSessionActions
                gameId={gameId}
                handComplete={false}
                appUserId={appUserId}
              />
            </>
          )}

        </section>
      )}

      {!cardSaved && (
        <section className="lp-card">
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Bid Owner
              </label>
              <select
                value={bidOwner}
                onChange={(e) => setBidOwner(e.target.value)}
              >
                <option value="">Select</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Outcome
              </label>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="radio"
                    name="outcome"
                    checked={bidOwnerWon === true}
                    onChange={() => setBidOwnerWon(true)}
                    className="w-auto"
                  />
                  Bid Owner WON
                </label>

                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="radio"
                    name="outcome"
                    checked={bidOwnerWon === false}
                    onChange={() => setBidOwnerWon(false)}
                    className="w-auto"
                  />
                  Bid Owner LOST
                </label>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Bid Count
                </label>
                <input
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value || "1", 10))}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Face
                </label>
                <select value={face} onChange={(e) => setFace(e.target.value)}>
                  {["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Bet Amount Override (optional)
              </label>
              <input
                placeholder="Leave blank to use ladder/default"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Flags
              </label>
              <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={nut}
                    onChange={() => {
                      const next = !nut
                      setNut(next)
                      if (next) setSkunk(false)
                    }}
                    className="w-auto"
                  />
                  Nut (double)
                </label>

                <label className={`flex items-center gap-2 ${nut ? "opacity-50" : "text-slate-200"}`}>
                  <input
                    type="checkbox"
                    checked={skunk}
                    disabled={nut}
                    onChange={() => setSkunk(!skunk)}
                    className="w-auto"
                  />
                  Skunk (double)
                </label>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Notes (optional)
              </label>
              <textarea
                className="min-h-[96px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button onClick={submit} disabled={saving} className="lp-button">
                {saving ? "Saving..." : "Save Card"}
              </button>

              <a href={`/games/${gameId}/scoreboard`} className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold">
                Go to Scoreboard →
              </a>

              <a href={`/games/${gameId}`} className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold">
                Back to Table →
              </a>
 
              <button onClick={finalizeCumCum} disabled={saving} className="lp-button">
                Finalize Session
              </button>

              <a
                href="/games/new"
                className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                Start New Game
              </a>

              <a
                href={`/info?gameId=${gameId}`}
                className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                Liars Poker Info
              </a>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}