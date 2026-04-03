"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

type User = {
  id: string
  email: string
  display_name: string
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

type SyncResult = {
  id: string
  email: string
  display_name: string
  created: boolean
}

export default function NewGameClient({
  presets,
}: {
  presets: Preset[]
}) {
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const defaultPreset =
    presets.find((p) => p.name.includes("5 Card Progressive 10-15-20-25-30")) ||
    presets[0] ||
    null

  const [mode, setMode] = useState<"preset" | "custom">("preset")
  const [presetId, setPresetId] = useState(defaultPreset?.id ?? "")

  const [title, setTitle] = useState("")
  const [createdBy, setCreatedBy] = useState("")
  const [scorekeeper, setScorekeeper] = useState("")
  const [appUser, setAppUser] = useState<SyncResult | null>(null)

  const [settlementMode, setSettlementMode] = useState("PER_HAND")

  const [cardsPerHand, setCardsPerHand] = useState<number>(5)
  const [baseBet, setBaseBet] = useState("5.00")
  const [betLadder, setBetLadder] = useState("10,15,20,25,30")

  const [nutEnabled, setNutEnabled] = useState(true)
  const [skunkEnabled, setSkunkEnabled] = useState(true)
  const [trackBidTrail, setTrackBidTrail] = useState(false)

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [syncingUser, setSyncingUser] = useState(true)

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === presetId) || null,
    [presetId, presets]
  )

  useEffect(() => {
    if (!isLoaded) return

    const email = user?.primaryEmailAddress?.emailAddress
    if (!email) {
      setSyncingUser(false)
      setMsg("No signed-in user email found.")
      return
    }

    const syncUser = async () => {
      try {
        setSyncingUser(true)

        const res = await fetch(`${API_BASE}/users/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            display_name:
              user.fullName ||
              user.username ||
              user.firstName ||
              "Player",
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.detail || "Failed to sync signed-in user")
        }

        setAppUser(data)
        setCreatedBy(data.id)
        setScorekeeper(data.id)
      } catch (e: any) {
        setMsg(`Error: ${e?.message || String(e)}`)
      } finally {
        setSyncingUser(false)
      }
    }

    syncUser()
  }, [isLoaded, user])
  useEffect(() => {
    if (title) return

    const now = new Date()

    const formatted =
      "Liar's Poker - " +
      now.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }) +
      " " +
      now.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })

    setTitle(formatted)
  }, [])
  function parseLadder(input: string): number[] {
    return input
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x))
  }

  async function submit() {
    setMsg("")

    if (!createdBy || !scorekeeper) {
      setMsg("Signed-in user is not ready yet.")
      return
    }

    const payload =
      mode === "preset"
        ? {
            created_by_user_id: createdBy,
            scorekeeper_user_id: scorekeeper,
            title,
            preset_id: presetId || null,
            settlement_mode: settlementMode,
          }
        : {
            created_by_user_id: createdBy,
            scorekeeper_user_id: scorekeeper,
            title,
            settlement_mode: settlementMode,
            cards_per_hand: cardsPerHand,
            base_bet: baseBet,
            bet_ladder: parseLadder(betLadder),
            nut_enabled: nutEnabled,
            skunk_enabled: skunkEnabled,
            track_bid_trail: trackBidTrail,
            digit_order_mode: "LP_STANDARD_2_LOW_0_SECOND_ACE_HIGH",
          }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`Error: ${text}`)
        return
      }

      const data = await res.json()
      setMsg(`Game created: ${data.id}`)

      router.push(`/games/${data.id}`)
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Create New Game
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Set up the game, choose a preset or custom rules, and start the table.
        </p>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <a
          href="/dashboard"
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          ← Dashboard
        </a>

        <a
          href="/info"
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Liar&apos;s Poker Info
        </a>
      </div>
      {msg && (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
            msg.startsWith("Error")
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {msg}
        </div>
      )}

      <div className="grid gap-6">
        <section className="lp-card">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white">Game Setup</h2>
            <p className="mt-1 text-sm text-slate-400">
              Basic game information and scorekeeping setup.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="lp-interactive-panel">
              <label className="lp-form-label">Title</label>
              <input
                className="lp-input-strong"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter game name"
              />
            </div>

            <div className="lp-interactive-panel">
              <label className="lp-form-label">Settlement Mode</label>
              <select
                className="lp-select-strong"
                value={settlementMode}
                onChange={(e) => setSettlementMode(e.target.value)}
              >
                <option value="PER_HAND">Per Hand</option>
                <option value="CUMULATIVE_SESSION">
                  Cumulative Session (Cum Cum)
                </option>
              </select>
            </div>

            <div className="lp-interactive-panel">
              <label className="lp-form-label">Created By</label>
              <input
                className="lp-input-strong opacity-70"
                value={appUser?.display_name || ""}
                readOnly
                placeholder={syncingUser ? "Syncing signed-in user..." : "Not available"}
              />
            </div>

            <div className="lp-interactive-panel">
              <label className="lp-form-label">Scorekeeper</label>
              <input
                className="lp-input-strong opacity-70"
                value={appUser?.display_name || ""}
                readOnly
                placeholder={syncingUser ? "Syncing signed-in user..." : "Not available"}
              />
            </div>
          </div>
        </section>

        <section className="lp-card">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-white">Rules Source</h2>
            <p className="mt-1 text-sm text-slate-400">
              Use a saved preset or create a custom rule set for this game.
            </p>
          </div>

          <div className="lp-interactive-panel mb-6">
            <div className="mb-3 lp-interactive-title">Choose Rules Mode</div>
            <div className="lp-toggle-row">
              <label className="flex items-center gap-2 text-slate-200">
                <input
                  type="radio"
                  checked={mode === "preset"}
                  onChange={() => setMode("preset")}
                  className="w-auto"
                />
                Use Preset
              </label>

              <label className="flex items-center gap-2 text-slate-200">
                <input
                  type="radio"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                  className="w-auto"
                />
                Custom
              </label>
            </div>
          </div>

          {mode === "preset" ? (
            <div className="grid gap-4">
              <div className="lp-interactive-panel">
                <label className="lp-form-label">Preset</label>
                <select
                  className="lp-select-strong"
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                >
                  <option value="">Select</option>
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPreset && (
                <div className="rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-lg font-bold text-white">
                      {selectedPreset.name}
                    </div>
                    {selectedPreset.is_favorite && (
                      <span className="lp-badge">Favorite</span>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <div className="text-slate-300">Cards Per Hand</div>
                      <div className="mt-1 font-semibold text-white">
                        {selectedPreset.cards_per_hand}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-300">Digit Order Mode</div>
                      <div className="mt-1 font-semibold text-white">
                        {selectedPreset.digit_order_mode}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="text-slate-300">Bet Structure</div>
                      <div className="mt-1 font-semibold text-white">
                        {selectedPreset.bet_ladder &&
                        selectedPreset.bet_ladder.length > 0
                          ? selectedPreset.bet_ladder.join(", ")
                          : `Flat ${selectedPreset.base_bet}`}
                      </div>
                    </div>

                    <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
                      <span
                        className={`lp-badge-neutral inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedPreset.nut_enabled ? "" : "opacity-60"
                        }`}
                      >
                        Nut {selectedPreset.nut_enabled ? "Enabled" : "Disabled"}
                      </span>
                      <span
                        className={`lp-badge-neutral inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedPreset.skunk_enabled ? "" : "opacity-60"
                        }`}
                      >
                        Skunk {selectedPreset.skunk_enabled ? "Enabled" : "Disabled"}
                      </span>
                      <span
                        className={`lp-badge-neutral inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          selectedPreset.track_bid_trail ? "" : "opacity-60"
                        }`}
                      >
                        Bid Trail {selectedPreset.track_bid_trail ? "On" : "Off"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="lp-interactive-panel">
                <label className="lp-form-label">Cards Per Hand</label>
                <input
                  className="lp-input-strong"
                  type="number"
                  min={1}
                  value={cardsPerHand}
                  onChange={(e) =>
                    setCardsPerHand(parseInt(e.target.value || "1", 10))
                  }
                />
              </div>

              <div className="lp-interactive-panel">
                <label className="lp-form-label">Base Bet</label>
                <input
                  className="lp-input-strong"
                  value={baseBet}
                  onChange={(e) => setBaseBet(e.target.value)}
                  placeholder="5.00"
                />
              </div>

              <div className="lp-interactive-panel md:col-span-2">
                <label className="lp-form-label">Bet Ladder (comma separated)</label>
                <input
                  className="lp-input-strong"
                  value={betLadder}
                  onChange={(e) => setBetLadder(e.target.value)}
                  placeholder="10,15,20,25,30"
                />
              </div>

              <div className="lp-interactive-panel md:col-span-2">
                <label className="lp-form-label">Options</label>
                <div className="lp-toggle-row">
                  <label className="flex items-center gap-2 text-slate-200">
                    <input
                      type="checkbox"
                      checked={nutEnabled}
                      onChange={() => setNutEnabled(!nutEnabled)}
                      className="w-auto"
                    />
                    Nut Enabled
                  </label>

                  <label className="flex items-center gap-2 text-slate-200">
                    <input
                      type="checkbox"
                      checked={skunkEnabled}
                      onChange={() => setSkunkEnabled(!skunkEnabled)}
                      className="w-auto"
                    />
                    Skunk Enabled
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
              </div>

              <div className="md:col-span-2">
                <div className="rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4">
                  <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">
                    Custom Rule Preview
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-sm text-slate-300">Cards Per Hand</div>
                      <div className="mt-1 font-semibold text-white">
                        {cardsPerHand}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-slate-300">Base Bet</div>
                      <div className="mt-1 font-semibold text-white">
                        {baseBet}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="text-sm text-slate-300">Parsed Ladder</div>
                      <div className="mt-1 font-semibold text-white">
                        {parseLadder(betLadder).length > 0
                          ? parseLadder(betLadder).join(", ")
                          : "No ladder values detected"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="lp-action-strip flex flex-wrap gap-3">
          <button
            onClick={submit}
            disabled={saving || syncingUser || !appUser}
            className="lp-button"
          >
            {saving
              ? "Creating..."
              : syncingUser
              ? "Preparing User..."
              : "Create Game"}
          </button>

          <a
            href="/dashboard"
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            ← Dashboard
          </a>

          <a
            href="/info"
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Liar&apos;s Poker Info →
          </a>
        </div>
      </div>
    </main>
  )
}