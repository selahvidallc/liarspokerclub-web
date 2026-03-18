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

export default function ChangeHandSetupClient({
  gameId,
  gameTitle,
  settlementMode,
  scorekeeperUserId,
  users,
  currentPlayers,
  currentCardsPerHand,
}: {
  gameId: string
  gameTitle: string
  settlementMode: string
  scorekeeperUserId: string
  users: User[]
  currentPlayers: Player[]
  currentCardsPerHand: number
}) {
  const router = useRouter()

  const [selectedUserId, setSelectedUserId] = useState("")
  const [cardsPerHand, setCardsPerHand] = useState(String(currentCardsPerHand))
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

  async function addOrReactivatePlayer(userId: string) {
    setMsg("")
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
        const text = await res.text()
        setMsg(`Error: ${text}`)
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
        const text = await res.text()
        setMsg(`Error: ${text}`)
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

    const parsed = parseInt(cardsPerHand, 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
      setMsg("Cards per hand must be at least 1.")
      return
    }

    setWorking(true)
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/update-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cards_per_hand: parsed,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`Error saving next-hand settings: ${text}`)
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
        <h2 className="text-2xl font-bold text-white">Roster for Next Hand</h2>
        <p className="mt-1 text-sm text-slate-400">
          This keeps you in the same game:{" "}
          <span className="font-semibold text-slate-200">{gameTitle}</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Settlement mode remains locked: {settlementMode}
        </p>
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

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="lp-card-soft">
          <h3 className="mb-4 text-lg font-bold text-white">Next Hand Settings</h3>

          <div className="grid gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Settlement Mode
              </label>
              <input
                value={settlementMode}
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
                type="number"
                min="1"
                max="50"
                value={cardsPerHand}
                onChange={(e) => setCardsPerHand(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Hand Type
              </label>
              <input
                value="Hand-type switching not wired yet"
                readOnly
                className="opacity-70"
              />
            </div>
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

      <div className="grid gap-6 lg:grid-cols-2">
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