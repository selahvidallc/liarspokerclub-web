"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

export default function NewPlayerClient() {
  const router = useRouter()

  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [msg, setMsg] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit() {
    setMsg("")

    if (!displayName.trim() || !email.trim()) {
      setMsg("Display name and email are required.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: email.trim(),
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`Error: ${text}`)
        return
      }

      const data = await res.json()
      setMsg(`Player created: ${data.display_name}`)
      router.push("/games/new")
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Players
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Create New Player
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Add a player so they can be selected when creating a new game.
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

      <section className="lp-card">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">Player Details</h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter the display name and email for the new player.
          </p>
        </div>

        <div className="grid gap-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button onClick={submit} disabled={saving} className="lp-button">
              {saving ? "Creating..." : "Create Player"}
            </button>

            <a
              href="/games/new"
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Back to New Game →
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}