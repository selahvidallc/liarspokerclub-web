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

export default function AddPlayersClient({
  gameId,
  users,
  currentPlayers,
  appUserId,
  isScorekeeper,
}: {
  gameId: string
  users: User[]
  currentPlayers: Player[]
  appUserId: string
  isScorekeeper: boolean
}) {
  const router = useRouter()

  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [msg, setMsg] = useState("")
  const [working, setWorking] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [creatingPlayer, setCreatingPlayer] = useState(false)

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

    if (!isScorekeeper) {
      setMsg("Error: Only the scorekeeper can change this game.")
      return
    }

    if (!userId) {
      setMsg("Pick a user first.")
      return
    }

    setWorking(true)
    try {
      const res = await fetch(
        `${API_BASE}/games/${gameId}/players?user_id=${userId}`,
        {
          method: "POST",
          headers: {
            "X-User-Id": appUserId,
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

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  async function addMultiplePlayers() {
    setMsg("")

    if (!isScorekeeper) {
      setMsg("Error: Only the scorekeeper can change this game.")
      return
    }

    if (selectedUserIds.length === 0) {
      setMsg("Select at least one player.")
      return
    }

    setWorking(true)
    try {
      for (const userId of selectedUserIds) {
        await fetch(
          `${API_BASE}/games/${gameId}/players?user_id=${userId}`,
          {
            method: "POST",
            headers: {
              "X-User-Id": appUserId,
            },
          }
        )
      }

      setSelectedUserIds([])
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setWorking(false)
    }
  }
  async function removePlayer(userId: string) {
    setMsg("")

    if (!isScorekeeper) {
      setMsg("Error: Only the scorekeeper can change this game.")
      return
    }

    setWorking(true)
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/players/${userId}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": appUserId,
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

  function openCreateModal() {
    if (!isScorekeeper) {
      setMsg("Error: Only the scorekeeper can change this game.")
      return
    }

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

    if (!isScorekeeper) {
      setMsg("Error: Only the scorekeeper can change this game.")
      return
    }

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
          role: "player",
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
        {
          method: "POST",
          headers: {
            "X-User-Id": appUserId,
          },
        }
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
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Game Roster
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              Manage Players
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              {isScorekeeper
                ? "Add existing players, remove players from this table, or create a new player and add them instantly."
                : "You can view the roster for this game, but only the scorekeeper can make changes."}
            </p>
          </div>

          <a
            href="/dashboard"
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Dashboard
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Active Players</h2>
                <p className="mt-1 text-sm text-slate-400">
                  These players are currently active in this game.
                </p>
              </div>

              <span className="lp-badge">
                {activePlayers.length} Player{activePlayers.length === 1 ? "" : "s"}
              </span>
            </div>

            {activePlayers.length === 0 ? (
              <div className="lp-card-soft">
                <p className="m-0 text-slate-300">No active players.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

                      {isScorekeeper && (
                        <button
                          onClick={() => removePlayer(p.id)}
                          disabled={working || creatingPlayer}
                          className="lp-button-secondary shrink-0"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lp-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Inactive Players</h2>
                <p className="mt-1 text-sm text-slate-400">
                  These players remain in game history and can be reactivated.
                </p>
              </div>

              <span className="lp-badge-neutral inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                {inactivePlayers.length} Inactive
              </span>
            </div>

            {inactivePlayers.length === 0 ? (
              <div className="lp-card-soft">
                <p className="m-0 text-slate-300">No inactive players.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {inactivePlayers.map((p) => (
                  <div key={p.id} className="lp-card-soft opacity-85">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-lg font-bold text-white">
                          {p.display_name}
                        </div>
                        <div className="mt-1 break-all text-sm text-slate-400">
                          {p.id}
                        </div>
                      </div>

                      {isScorekeeper && (
                        <button
                          onClick={() => addOrReactivatePlayer(p.id)}
                          disabled={working || creatingPlayer}
                          className="lp-button shrink-0"
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {isScorekeeper && (
            <section className="lp-card">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white">Add Existing Player</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select from users not already active in this game.
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
                  onClick={() => addOrReactivatePlayer(selectedUserId)}
                  disabled={working || creatingPlayer}
                  className="lp-button"
                >
                  Add Player
                </button>
              </div>
              <div className="mt-6">
                <div className="mb-3 text-sm font-semibold text-slate-300">
                  Or select multiple players:
                </div>

                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {availableUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id)

                    return (
                      <label
                        key={u.id}
                        className={`lp-card-soft cursor-pointer border ${
                          isSelected ? "ring-2 ring-blue-500" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserSelection(u.id)}
                          />
                          <div className="text-sm">
                            <div className="font-semibold text-white">
                              {u.display_name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>

                <div className="mt-4">
                  <button
                    onClick={addMultiplePlayers}
                    disabled={working || creatingPlayer}
                    className="lp-button"
                  >
                    Add Selected Players ({selectedUserIds.length})
                  </button>
                </div>
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
          )}

          <section className="lp-card mt-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Leave Player Setup</h2>
              <p className="mt-1 text-sm text-slate-400">
                Use these buttons instead of your browser back button.
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
                href={`/games/${gameId}/scorer`}
                className="lp-button inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                Go to Score Sheet
              </a>

              <a
                href={`/games/${gameId}/scoreboard`}
                className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                View Scoreboard
              </a>

              <a
                href="/dashboard"
                className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
              >
                Dashboard
              </a>
            </div>
          </section>
        </div>
      </main>

      {showCreateModal && isScorekeeper && (
        <div
          className="lp-overlay fixed inset-0 z-[1000] flex items-center justify-center p-6"
          onClick={closeCreateModal}
        >
          <div
            className="lp-modal w-full max-w-xl rounded-3xl p-6"
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