"use client"

import GameSessionActions from "../GameSessionActions"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

type Player = {
  id: string
  display_name: string
  is_active?: boolean
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
  awaiting_next_hand?: boolean
  next_hand_number?: number
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
const editablePanelClass =
  "rounded-2xl border-2 border-sky-400/50 bg-sky-400/10 p-4 shadow-sm ring-1 ring-sky-300/10"

const editableTitleClass =
  "mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-sky-300"

const previewPanelClass =
  "rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50"

export default function ScorerClient({
  gameId,
  players,
  settings,
  progress,
  appUserId,
  startNextHand,
  startFromHandNumber,
}: {
  gameId: string
  players: Player[]
  settings: GameSettings
  progress: HandProgress
  appUserId: string
  startNextHand: boolean
  startFromHandNumber: number | null
}) {
  const router = useRouter()

  const [bidOwner, setBidOwner] = useState("")
  const [bidOwnerWon, setBidOwnerWon] = useState<boolean | null>(null)
  const [count, setCount] = useState("3")
  const [face, setFace] = useState("7")
  const [nut, setNut] = useState(false)
  const [skunk, setSkunk] = useState(false)
  const [betAmount, setBetAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const forcingNextHand =
    startNextHand &&
    startFromHandNumber !== null &&
    progress.current_hand_number === startFromHandNumber

  const effectiveHandNumber = forcingNextHand
    ? startFromHandNumber + 1
    : progress.current_hand_number

  const cardsPlayed = forcingNextHand
    ? 0
    : progress.cards_played_in_current_hand

  const cardsRemaining = forcingNextHand
    ? settings.cards_per_hand
    : progress.cards_remaining_in_current_hand

  const nextCardNumber = cardsPlayed + 1

  const handIsActuallyComplete = progress.hand_complete && !forcingNextHand

  useEffect(() => {
    if (handIsActuallyComplete) {
      router.push(`/games/${gameId}/scoreboard?handComplete=1`)
      router.refresh()
    }
  }, [handIsActuallyComplete, gameId, router])

    useEffect(() => {
    if (bidOwnerWon === true) {
      setSkunk(false)
    } else if (bidOwnerWon === false) {
      setNut(false)
    } else {
      setNut(false)
      setSkunk(false)
    }

  }, [bidOwnerWon])
  const resolvedBet = useMemo(() => {
    if (betAmount.trim()) return Number(betAmount)

    if (settings.bet_ladder && settings.bet_ladder.length > 0) {
      let idx = nextCardNumber - 1
      if (idx < 0) idx = 0
      if (idx >= settings.bet_ladder.length) idx = settings.bet_ladder.length - 1
      return Number(settings.bet_ladder[idx])
    }
  const selectedBidOwnerName =
    players.find((p) => p.id === bidOwner)?.display_name || ""

  const opponentCount = Math.max(0, players.length - 1)

  const previewText =
    bidOwner && bidOwnerWon !== null
      ? `${selectedBidOwnerName} ${
          bidOwnerWon ? "wins" : "loses"
        } ${money(resolvedBet)} against ${opponentCount} opponent${
          opponentCount === 1 ? "" : "s"
        }.`
      : "Select a bid owner and outcome to preview this card."

    return Number(settings.base_bet)
  }, [betAmount, nextCardNumber, settings.bet_ladder, settings.base_bet])

  async function submit() {
    setMsg("")

    if (handIsActuallyComplete) {
      setMsg("This hand is already complete. Start the next hand from the scoreboard.")
      return
    }

    if (!bidOwner) {
      setMsg("Pick the bid owner.")
      return
    }

    if (bidOwnerWon === null) {
      setMsg("Select whether the bid owner won or lost.")
      return
    }

    const parsedCount = parseInt(count, 10)
    if (!Number.isFinite(parsedCount) || parsedCount < 1) {
      setMsg("Bid count must be at least 1.")
      return
    }

    const finalBidRaw = `${parsedCount}x${faceToInternal(face)}`
    const ownerName =
      players.find((p) => p.id === bidOwner)?.display_name || "Unknown"

    const confirmationLines = [
      `Bid Owner: ${ownerName}`,
      `Outcome: ${bidOwnerWon ? "Bid Owner WON" : "Bid Owner LOST"}`,
      `Bid: ${parsedCount}x${face}`,
      `Dollar Amount: ${money(resolvedBet)}`,
    ]

    const ok = window.confirm(
      `${confirmationLines.join("\n")}\n\nIs this correct?`
    )

    if (!ok) {
      return
    }
    const payload = {
      hand_number: effectiveHandNumber,
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

      if (!res.ok) {
        setMsg(`Error: ${data?.detail || "Failed to save card"}`)
        return
      }

      const completed = Number(data.card_number) >= settings.cards_per_hand

      if (completed) {
        router.push(`/games/${gameId}/scoreboard?handComplete=1`)
        router.refresh()
        return
      }

      setMsg(
        `Saved card ${data.card_number} of ${settings.cards_per_hand} for Hand #${data.hand_number}.`
      )
      setBidOwner("")
      setBidOwnerWon(null)
      setCount("3")
      setFace("7")
      setNut(false)
      setSkunk(false)
      setBetAmount("")
      setNotes("")
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function finalizeCumCum() {
    setMsg("")
    setSaving(true)

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/finalize`, {
        method: "POST",
        headers: {
          "X-User-Id": appUserId,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`Finalize failed: ${text}`)
        return
      }

      setMsg("Session finalized.")
      router.push(`/games/${gameId}/scoreboard`)
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
      Game:{" "}
      <code className="rounded bg-white/5 px-2 py-1 text-slate-200">
        {gameId}
      </code>
    </div>

    <section className="lp-card mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">{settings.title}</h2>
          <p className="mt-1 text-sm text-slate-400">
            Settlement Mode:{" "}
            <span className="font-semibold text-slate-200">
              {settings.settlement_mode}
            </span>
          </p>
        </div>

        <div className="lp-badge">Hand #{effectiveHandNumber}</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="lp-card-soft">
          <div className="text-sm text-slate-400">Cards Per Hand</div>
          <div className="mt-1 text-lg font-bold text-white">
            {settings.cards_per_hand}
          </div>
        </div>

        <div className="lp-card-soft">
          <div className="text-sm text-slate-400">Card In This Hand</div>
          <div className="mt-1 text-lg font-bold text-white">
            {handIsActuallyComplete
              ? `${settings.cards_per_hand} of ${settings.cards_per_hand}`
              : `${nextCardNumber} of ${settings.cards_per_hand}`}
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
          <div className="mt-1 text-lg font-bold text-white">
            {money(resolvedBet)}
          </div>
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
      <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <div className="whitespace-pre-wrap">{msg}</div>
      </div>
    )}

    {!handIsActuallyComplete ? (
      <section className="lp-card">
        <div className="mb-4 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-4 py-3">
          <div className="lp-interactive-title">
            Scoring Entry · Hand #{effectiveHandNumber} · Card {nextCardNumber} of{" "}
            {settings.cards_per_hand}
          </div>
          <div className="lp-interactive-help">
            Blue-highlighted areas are editable scoring fields for the current card.
          </div>
        </div>

        <div className="grid gap-5">
          <div className={editablePanelClass}>
            <div className={editableTitleClass}>Step 1 · Bid Owner</div>
            <label className="lp-form-label">Bid Owner</label>
            <select
              className="lp-select-strong"
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

          <div className={editablePanelClass}>
            <div className={editableTitleClass}>Step 2 · Outcome</div>
            <label className="lp-form-label">Outcome</label>
            <div className="lp-toggle-row">
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
            <div className={editablePanelClass}>
              <div className={editableTitleClass}>Step 3A · Bid Count</div>
              <label className="lp-form-label">Bid Count</label>
              <input
                className="lp-input-strong"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={count}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "")
                  setCount(value)
                }}
                placeholder="3"
              />
            </div>

            <div className={editablePanelClass}>
              <div className={editableTitleClass}>Step 3B · Bid Face</div>
              <label className="lp-form-label">Face</label>
              <select
                className="lp-select-strong"
                value={face}
                onChange={(e) => setFace(e.target.value)}
              >
                {["2", "3", "4", "5", "6", "7", "8", "9", "10", "A"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lp-interactive-panel">
            <label className="lp-form-label">Bet Amount Override (optional)</label>
            <input
              className="lp-input-strong"
              placeholder="Leave blank to use ladder/default"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
            />
          </div>

          <div className={editablePanelClass}>
            <div className={editableTitleClass}>Optional · Nut / Skunk</div>
            <label className="lp-form-label">Flags</label>
            <div className="lp-toggle-row">
              {bidOwnerWon === true && (
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={nut}
                    onChange={() => setNut(!nut)}
                    className="w-auto"
                  />
                  Nut (double)
                </label>
              )}

              {bidOwnerWon === false && (
                <label className="flex items-center gap-2 text-slate-200">
                  <input
                    type="checkbox"
                    checked={skunk}
                    onChange={() => setSkunk(!skunk)}
                    className="w-auto"
                  />
                  Skunk (double)
                </label>
              )}

              {bidOwnerWon === null && (
                <div className="text-sm text-slate-400">
                  Select whether the bid owner won or lost to see the available flag.
                </div>
              )}
            </div>
          </div>
          <div className="lp-interactive-panel">
            <label className="lp-form-label">Notes (optional)</label>
            <textarea
              className="lp-textarea-strong min-h-[96px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className={previewPanelClass}>
            <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-200">
              Card Preview
            </div>
            <div className="mt-1 font-semibold">{previewText}</div>
          </div>
          <div className="lp-action-strip flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={submit}
              disabled={saving || handIsActuallyComplete}
              className="lp-button"
            >
              {saving
                ? "Saving..."
                : handIsActuallyComplete
                ? "Hand Complete"
                : "Save Card"}
            </button>

            <a
              href={`/games/${gameId}/scoreboard`}
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Go to Scoreboard →
            </a>

            <a
              href={`/games/${gameId}`}
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Back to Table →
            </a>

            <button
              onClick={finalizeCumCum}
              disabled={saving}
              className="lp-button"
            >
              Finalize Session
            </button>

            <a
              href={`/info?gameId=${gameId}`}
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Liars Poker Info
            </a>
          </div>
        </div>
      </section>
    ) : (
      <section className="lp-card mb-6">
        <div className="mb-4 text-lg font-bold text-white">
          This hand is complete. Start the next hand, view the scoreboard, or end
          the session.
        </div>

        <p className="mb-4 text-sm text-slate-400">
          You cannot score more cards in this hand. Choose the next session action
          below.
        </p>

        <GameSessionActions
          gameId={gameId}
          handComplete={true}
          appUserId={appUserId}
          appUserRole="scorer"
        />
      </section>
    )}
  </main>
  )
}