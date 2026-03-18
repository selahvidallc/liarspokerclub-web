"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

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

function parseLadder(input: string): number[] | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const parts = trimmed
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)

  if (parts.length === 0) return null

  const nums = parts.map((p) => Number(p))
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null

  return nums
}

export default function ChangeHandSetupClient({
  gameId,
  gameTitle,
  settlementMode,
  scorekeeperUserId,
  users,
  currentPlayers,
  currentCardsPerHand,
  currentBaseBet,
  currentBetLadder,
  currentNutEnabled,
  currentSkunkEnabled,
  currentTrackBidTrail,
  currentDigitOrderMode,
  presets,
}: {
  gameId: string
  gameTitle: string
  settlementMode: string
  scorekeeperUserId: string
  users: User[]
  currentPlayers: Player[]
  currentCardsPerHand: number
  currentBaseBet: string
  currentBetLadder: number[] | null
  currentNutEnabled: boolean
  currentSkunkEnabled: boolean
  currentTrackBidTrail: boolean
  currentDigitOrderMode: string
  presets: Preset[]
}) {
  const router = useRouter()

  const [selectedUserId, setSelectedUserId] = useState("")
  const [mode, setMode] = useState<"custom" | "preset">("custom")
  const [selectedPresetId, setSelectedPresetId] = useState("")
  const [cardsPerHand, setCardsPerHand] = useState(String(currentCardsPerHand))
  const [baseBet, setBaseBet] = useState(currentBaseBet)
  const [betLadder, setBetLadder] = useState(
    currentBetLadder && currentBetLadder.length > 0
      ? currentBetLadder.join(", ")
      : ""
  )
  const [nutEnabled, setNutEnabled] = useState(currentNutEnabled)
  const [skunkEnabled, setSkunkEnabled] = useState(currentSkunkEnabled)
  const [trackBidTrail, setTrackBidTrail] = useState(currentTrackBidTrail)
  const [digitOrderMode, setDigitOrderMode] = useState(currentDigitOrderMode)
  const [msg, setMsg] = useState("")
  const [working, setWorking] = useState(false)

  const activePlayers = useMemo(
    () => currentPlayers.filter((p) => p.is_active !== false),
    [currentPlayers]
  )

  const inactivePlayers = useMemo(
    () => currentPlayers.filter((p) => p.is_active === false),
    [currentPlayers]
  )

  const activeIds = useMemo(
    () => new Set(activePlayers.map((p) => p.id)),
    [activePlayers]
  )

  const availableUsers = useMemo(
    () => users.filter((u) => !activeIds.has(u.id)),
    [users, activeIds]
  )

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) || null,
    [presets, selectedPresetId]
  )

  async function addOrReactivatePlayer(userId: string) {
    setMsg("")
    if (!userId) {
      setMsg("Select a user first.")
      return
    }

    setWorking(true)
    try {
      const res = await fetch(
        `${API_BASE}/games/${gameId}/players?user_id=${userId}`,
        {
          method: "POST",
          headers: {
            "X-User-Id": scorekeeperUserId,
          },
        }
      )

      if (!res.ok) {
        setMsg(`Error: ${await res.text()}`)
        return
      }

      setSelectedUserId("")
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setWorking(false)
    }
  }

  async function removePlayer(userId: string) {
    setMsg("")
    setWorking(true)

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/players/${userId}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": scorekeeperUserId,
        },
      })

      if (!res.ok) {
        setMsg(`Error: ${await res.text()}`)
        return
      }

      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setWorking(false)
    }
  }

  async function startNextHandSameGame() {
    setMsg("")

    let payload: any = {}

    if (mode === "preset") {
      if (!selectedPresetId) {
        setMsg("Select a preset first.")
        return
      }

      payload = {
        preset_id: selectedPresetId,
      }
    } else {
      const parsedCards = parseInt(cardsPerHand, 10)
      if (!Number.isFinite(parsedCards) || parsedCards < 1) {
        setMsg("Cards per hand must be at least 1.")
        return
      }

      const parsedLadder = parseLadder(betLadder)
      if (betLadder.trim() && parsedLadder === null) {
        setMsg("Bet ladder must be comma-separated numbers, like: 10, 15, 20")
        return
      }

      payload = {
        cards_per_hand: parsedCards,
        base_bet: baseBet.trim() || null,
        bet_ladder: parsedLadder,
        nut_enabled: nutEnabled,
        skunk_enabled: skunkEnabled,
        track_bid_trail: trackBidTrail,
        digit_order_mode: digitOrderMode,
      }
    }

    setWorking(true)
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/update-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": scorekeeperUserId,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        setMsg(`Error saving next-hand settings: ${await res.text()}`)
        return
      }

      router.push(`/games/${gameId}/scorer?start_next_hand=1`)
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="lp-card">
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-white">Next Hand Setup</h2>
        <p className="mt-1 text-sm text-slate-400">
          Same game: <span className="font-semibold text-slate-200">{gameTitle}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Settlement mode stays locked: {settlementMode}
        </p>
      </div>

      {msg && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
            msg.startsWith("Error")
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          {msg}
        </div>
      )}

      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <div className="lp-card-soft">
          <h3 className="mb-4 text-lg font-bold text-white">Rules for Next Hand</h3>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Settlement Mode
              </label>
              <input value={settlementMode} readOnly className="opacity-70" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "custom" | "preset")}
              >
                <option value="custom">Custom</option>
                <option value="preset">Preset</option>
              </select>
            </div>

            {mode === "preset" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Preset
                  </label>
                  <select
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                  >
                    <option value="">Select a preset</option>
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPreset && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
                    <div className="font-semibold text-white">{selectedPreset.name}</div>
                    <div className="mt-2">
                      Cards Per Hand: {selectedPreset.cards_per_hand}
                    </div>
                    <div>Base Bet: {String(selectedPreset.base_bet)}</div>
                    <div>
                      Bet Ladder:{" "}
                      {selectedPreset.bet_ladder?.length
                        ? selectedPreset.bet_ladder.join(", ")
                        : "Flat"}
                    </div>
                    <div>Nut: {selectedPreset.nut_enabled ? "Yes" : "No"}</div>
                    <div>Skunk: {selectedPreset.skunk_enabled ? "Yes" : "No"}</div>
                    <div>
                      Track Bid Trail: {selectedPreset.track_bid_trail ? "Yes" : "No"}
                    </div>
                    <div>Digit Order Mode: {selectedPreset.digit_order_mode}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Cards Per Hand
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={cardsPerHand}
                    onChange={(e) => setCardsPerHand(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Base Bet
                  </label>
                  <input
                    value={baseBet}
                    onChange={(e) => setBaseBet(e.target.value)}
                    placeholder="5.00"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Bet Ladder
                  </label>
                  <input
                    value={betLadder}
                    onChange={(e) => setBetLadder(e.target.value)}
                    placeholder="10, 15, 20, 25, 30"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Leave blank to keep a flat/default structure.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Digit Order Mode
                  </label>
                  <input
                    value={digitOrderMode}
                    onChange={(e) => setDigitOrderMode(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-2 text-slate-200">
                    <input
                      type="checkbox"
                      checked={nutEnabled}
                      onChange={() => setNutEnabled(!nutEnabled)}
                      className="w-auto"
                    />
                    Nut
                  </label>

                  <label className="flex items-center gap-2 text-slate-200">
                    <input
                      type="checkbox"
                      checked={skunkEnabled}
                      onChange={() => setSkunkEnabled(!skunkEnabled)}
                      className="w-auto"
                    />
                    Skunk
                  </label>

                  <label className="flex items-center gap-2 text-slate-200">
                    <input
                      type="checkbox"
                      checked={trackBidTrail}
                      onChange={() => setTrackBidTrail(!trackBidTrail)}
                      className="w-auto"
                    />
                    Track Bid Trail
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Add Player</h3>
            <p className="mt-1 text-sm text-slate-400">
              Add an existing user to the same game for the next hand.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={working}
            >
              <option value="">Select a user</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name} ({u.email})
                </option>
              ))}
            </select>

            <button
              onClick={() => addOrReactivatePlayer(selectedUserId)}
              disabled={working}
              className="lp-button"
            >
              Add Player
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Active Players</h3>
            <p className="mt-1 text-sm text-slate-400">
              These players will be included in the next hand.
            </p>
          </div>

          {activePlayers.length === 0 ? (
            <div className="lp-card-soft">
              <p className="m-0 text-slate-300">No active players in this game.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {activePlayers.map((p) => (
                <div key={p.id} className="lp-card-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-bold text-white">
                        {p.display_name}
                      </div>
                      <div className="mt-1 break-all text-sm text-slate-400">
                        {p.id}
                      </div>
                    </div>

                    <button
                      onClick={() => removePlayer(p.id)}
                      disabled={working}
                      className="lp-button-secondary shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Inactive Players</h3>
            <p className="mt-1 text-sm text-slate-400">
              These players remain in session history and can be reactivated.
            </p>
          </div>

          {inactivePlayers.length === 0 ? (
            <div className="lp-card-soft">
              <p className="m-0 text-slate-300">No inactive players.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {inactivePlayers.map((p) => (
                <div key={p.id} className="lp-card-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-lg font-bold text-white">
                        {p.display_name}
                      </div>
                      <div className="mt-1 break-all text-sm text-slate-400">
                        {p.id}
                      </div>
                    </div>

                    <button
                      onClick={() => addOrReactivatePlayer(p.id)}
                      disabled={working}
                      className="lp-button shrink-0"
                    >
                      Reactivate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={startNextHandSameGame}
          disabled={working}
          className="lp-button"
        >
          Start Next Hand
        </button>

        <a
          href={`/games/${gameId}/scoreboard`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Back to Scoreboard
        </a>

        <a
          href={`/games/${gameId}`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Back to Table
        </a>
      </div>
    </section>
  )
}