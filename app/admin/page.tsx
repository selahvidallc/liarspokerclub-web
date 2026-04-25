"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import type { AppRole } from "@/lib/roles"
import { canAccessAdmin } from "@/lib/roles"
import Link from "next/link"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

type AppUser = {
  id: string
  email: string
  display_name: string
  role: AppRole
  created: boolean
}

type AdminUserRow = {
  id: string
  email: string
  display_name: string
  role: AppRole
}

const ROLE_OPTIONS: AppRole[] = [
  "player",
  "scorer",
  "club_admin",
  "super_admin",
]

export default function AdminPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [msg, setMsg] = useState("")
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState<AppRole>("player")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) return

    const run = async () => {
      try {
        setLoading(true)
        setError("")
        setMsg("")

        const email = user?.primaryEmailAddress?.emailAddress
        if (!email) {
          throw new Error("No signed-in user email found")
        }

        const syncRes = await fetch(`${API_BASE}/users/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            display_name:
              user.fullName || user.username || user.firstName || "Player",
          }),
        })

        const syncData = await syncRes.json()

        if (!syncRes.ok) {
          throw new Error(syncData?.detail || "Failed to sync user")
        }

        if (!canAccessAdmin(syncData.role)) {
          router.push("/dashboard")
          return
        }

        setAppUser(syncData)

        const usersRes = await fetch(`${API_BASE}/users`, {
          cache: "no-store",
        })

        const usersData = await usersRes.json()

        if (!usersRes.ok) {
          throw new Error(usersData?.detail || "Failed to load users")
        }

        setUsers(usersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [isLoaded, router, user])

  function updateLocalUser(
    id: string,
    patch: Partial<AdminUserRow>
  ) {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    )
  }

  async function saveUser(u: AdminUserRow) {
    try {
      setSavingId(u.id)
      setError("")
      setMsg("")

      const res = await fetch(`${API_BASE}/users/${u.id}/admin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: u.display_name,
          role: u.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to save user")
      }

      setMsg(`Saved ${data.display_name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSavingId(null)
    }
  }
  async function createUser() {
    try {
      setCreating(true)
      setError("")
      setMsg("")

      if (!newDisplayName.trim() || !newEmail.trim()) {
        throw new Error("Display name and email are required")
      }

      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: newDisplayName.trim(),
          email: newEmail.trim(),
          role: newRole,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to create user")
      }

      setUsers((prev) =>
        [...prev, data].sort((a, b) =>
          a.display_name.localeCompare(b.display_name)
        )
      )

      setNewDisplayName("")
      setNewEmail("")
      setNewRole("player")
      setMsg(`Created ${data.display_name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setCreating(false)
    }
  }
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Admin
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            User & Role Management
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage invited users, display names, and access roles.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Back to Dashboard
          </a>

          <Link
            href="/profile"
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            My Profile
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
          {error}
        </div>
      )}

      {msg && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
          {msg}
        </div>
      )}
      <section className="lp-card mb-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">Create User</h2>
          <p className="mt-1 text-sm text-slate-400">
            Add an invited user who can later sign in and be assigned to games.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            value={newDisplayName}
            onChange={(e) => setNewDisplayName(e.target.value)}
            placeholder="Display Name"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />

          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          />

          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as AppRole)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <button
            onClick={createUser}
            disabled={creating}
            className="lp-button"
          >
            {creating ? "Creating..." : "Create User"}
          </button>
        </div>
      </section>
      <section className="lp-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Users</h2>
            <p className="mt-1 text-sm text-slate-400">
              Edit display names and change access roles.
            </p>
          </div>

          <div className="text-sm text-slate-400">
            Signed in as{" "}
            <span className="font-semibold text-white">
              {appUser?.display_name || "—"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-400">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="lp-card-soft text-slate-300">No users found.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[900px] table-fixed">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-3 py-3 text-left">Display Name</th>
                  <th className="px-3 py-3 text-left">Email</th>
                  <th className="px-3 py-3 text-left">Role</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="px-3 py-3">
                      <input
                        value={u.display_name}
                        onChange={(e) =>
                          updateLocalUser(u.id, {
                            display_name: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                      />
                    </td>

                    <td className="px-3 py-3 text-slate-300">
                      {u.email}
                    </td>

                    <td className="px-3 py-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateLocalUser(u.id, {
                            role: e.target.value as AppRole,
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <Link
                      href={`/admin/players/${u.id}/metrics?name=${encodeURIComponent(u.display_name)}`}
                      className="lp-button-secondary inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold"
                    >
                      Metrics
                    </Link><Link
                      href={`/admin/players/${u.id}/metrics?name=${encodeURIComponent(u.display_name)}`}
                      className="lp-button-secondary inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold"
                    >
                      Metrics
                    </Link>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => saveUser(u)}
                        disabled={savingId === u.id}
                        className="lp-button"
                      >
                        {savingId === u.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}