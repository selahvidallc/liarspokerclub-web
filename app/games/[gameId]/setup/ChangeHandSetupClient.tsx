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
}

export default function ChangeHandSetupClient({
  gameId,
  gameTitle,
  settlementMode,
  scorekeeperUserId,
  users,
  currentPlayers,
}: {
  gameId: string
  gameTitle: string
  settlementMode: string
  scorekeeperUserId: string
  users: User[]
  currentPlayers: Player[]
}) {
  const router = useRouter()

  const [selectedUserId, setSelectedUserId] = useState("")
  const [msg, setMsg] = useState("")
  const [working, setWorking] = useState(false)

  const currentIds = useMemo(
    () => new Set(currentPlayers.map((p) => p.id)),
    [currentPlayers]
  )

  const availableUsers = useMemo(
    () => users.filter((u) => !currentIds.has(u.id)),
    [users, currentIds]
  )

  async function addPlayer() {
    setMsg("")

    if (!selectedUserId) {
      setMsg("Pick a user to add.")
      return
    }

    setWorking(true)
    try {
      const res = await fetch(
        `${API_BASE}/games/${gameId}/players?user_id=${selectedUserId}`,
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

  function startNextHandSameGame() {
    router.push(`/games/${gameId}/scorer`)
    router.refresh()
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white">Current Players</h3>
            <p className="mt-1 text-sm text-slate-400">
              Removing a player here should affect future hands only.
            </p>
          </div>

          {currentPlayers.length === 0 ? (
            <div className="lp-card-soft">
              <p className="m-0 text-slate-300">No players in this game.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {currentPlayers.map((p) => (
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
            <h3 className="text-lg font-bold text-white">Add Player</h3>
            <p className="mt-1 text-sm text-slate-400">
              Add an existing player to the same game for the next hand.
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
              onClick={addPlayer}
              disabled={working}
              className="lp-button"
            >
              Add Player
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
            <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Next step
            </div>
            <p className="mt-2 text-sm text-slate-300">
              Once the backend supports updating next-hand settings, this page will
              also save cards-per-hand / hand-type changes before starting the next
              hand.
            </p>
          </div>
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