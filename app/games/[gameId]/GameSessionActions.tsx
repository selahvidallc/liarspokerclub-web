"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

export default function GameSessionActions({
  gameId,
  handComplete,
}: {
  gameId: string
  handComplete: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  async function finalizeSession() {
    const ok = window.confirm(
      "Are you sure you want to finalize this session? Scoring will be locked."
    )
    if (!ok) return

    setBusy(true)
    setMsg("")

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/finalize`, {
        method: "POST",
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`Finalize failed: ${text}`)
        return
      }

      router.push(`/dashboard?finalized=1`)
      router.refresh()
    } catch (e: any) {
      setMsg(`Finalize failed: ${e?.message || String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  function handleStartOrContinueHand() {
    if (pathname?.endsWith("/scorer")) {
      router.refresh()
      return
    }

    router.push(`/games/${gameId}/scorer`)
  }

  return (
    <section className="sticky bottom-4 z-20 mt-8 rounded-2xl border border-white/10 bg-slate-950/95 p-5 backdrop-blur">
      <div className="mb-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Game Actions
        </div>
        <div className="mt-1 text-sm text-slate-300">
          Use these controls to manage the table and scoring.
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleStartOrContinueHand}
          disabled={busy}
          className="lp-button"
        >
          {handComplete ? "Start New Hand" : "Continue Current Hand"}
        </button>

        <Link
          href={`/games/${gameId}/scorer`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Go to Scorer
        </Link>

        <Link
          href={`/games/${gameId}/players`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Manage Players
        </Link>

        <Link
          href={`/games/${gameId}/scoreboard`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          View Scoreboard
        </Link>

        <Link
          href={`/info?gameId=${gameId}`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Rules / Info
        </Link>

        <button
          onClick={finalizeSession}
          disabled={busy}
          className="lp-button-secondary"
        >
          {busy ? "Finalizing..." : "Finalize Session"}
        </button>

        <Link
          href="/games/new"
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Start New Game
        </Link>
      </div>
    </section>
  )
}