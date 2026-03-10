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

export default function AddPlayersClient({
  gameId,
  users,
  currentPlayers,
}: {
  gameId: string
  users: User[]
  currentPlayers: Player[]
}) {
  const router = useRouter()

  const [selectedUserId, setSelectedUserId] = useState("")
  const [msg, setMsg] = useState("")
  const [working, setWorking] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [creatingPlayer, setCreatingPlayer] = useState(false)

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
        { method: "POST" }
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

  function openCreateModal() {
    setMsg("")
    setNewDisplayName("")
    setNewEmail("")
    setShowCreateModal(true)
  }

  function closeCreateModal() {
    if (creatingPlayer) return
    setShowCreateModal(false)
  }

  async function createAndAddPlayer() {
    setMsg("")

    if (!newDisplayName.trim() || !newEmail.trim()) {
      setMsg("Display name and email are required.")
      return
    }

    setCreatingPlayer(true)
    try {
      const createRes = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: newDisplayName.trim(),
          email: newEmail.trim(),
        }),
      })

      if (!createRes.ok) {
        const text = await createRes.text()
        setMsg(`Error creating player: ${text}`)
        return
      }

      const newUser: User = await createRes.json()

      const addRes = await fetch(
        `${API_BASE}/games/${gameId}/players?user_id=${newUser.id}`,
        { method: "POST" }
      )

      if (!addRes.ok) {
        const text = await addRes.text()
        setMsg(
          `Player created (${newUser.display_name}) but could not be added to this game: ${text}`
        )
        return
      }

      setShowCreateModal(false)
      setNewDisplayName("")
      setNewEmail("")
      setMsg(`Player created and added: ${newUser.display_name}`)
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setCreatingPlayer(false)
    }
  }

  return (
    <>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Game Roster
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Manage Players
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Add existing players, remove players from this table, or create a new
            player and add them instantly.
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

        <div className="grid gap-6">
          <section className="lp-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Current Roster</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Players already assigned to this game.
                </p>
              </div>

              <span className="lp-badge">
                {currentPlayers.length} Player{currentPlayers.length === 1 ? "" : "s"}
              </span>
            </div>

            {currentPlayers.length === 0 ? (
              <div className="lp-card-soft">
                <p className="m-0 text-slate-300">No players added yet.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                        disabled={working || creatingPlayer}
                        className="lp-button-secondary shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lp-card">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Add Existing Player</h2>
              <p className="mt-1 text-sm text-slate-400">
                Select from players not already on this table.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={working || creatingPlayer}
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
                disabled={working || creatingPlayer}
                className="lp-button"
              >
                Add Player
              </button>
            </div>

            <div className="mt-4">
              <button
                onClick={openCreateModal}
                disabled={working || creatingPlayer}
                className="lp-button-secondary"
              >
                Create New Player
              </button>
            </div>
          </section>

          <section className="lp-card">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Next Step</h2>
              <p className="mt-1 text-sm text-slate-400">
                Go back to the game, start scoring, or review the scoreboard.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={`/games/${gameId}`}
                className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                Back to Table →
              </a>

              <a
                href={`/games/${gameId}/scorer`}
                className="lp-button inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                Start Scoring →
              </a>

              <a
                href={`/games/${gameId}/scoreboard`}
                className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                View Scoreboard →
              </a>
            </div>
          </section>
        </div>
      </main>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={closeCreateModal}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Create New Player</h2>
              <p className="mt-1 text-sm text-slate-400">
                Create a player and immediately add them to this game.
              </p>
            </div>

            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Display Name
                </label>
                <input
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  disabled={creatingPlayer}
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={creatingPlayer}
                  placeholder="john@example.com"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  onClick={closeCreateModal}
                  disabled={creatingPlayer}
                  className="lp-button-secondary"
                >
                  Cancel
                </button>

                <button
                  onClick={createAndAddPlayer}
                  disabled={creatingPlayer}
                  className="lp-button"
                >
                  {creatingPlayer ? "Creating..." : "Create + Add to Game"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}