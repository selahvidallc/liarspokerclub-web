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

      router.push(`/games/${gameId}/session-summary`)
      router.refresh()
    } catch (e: any) {
      setMsg(`Finalize failed: ${e?.message || String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  function handleStartOrContinueHand() {
    // On scorer page, explicit click refreshes into the next/current hand.
    if (pathname?.endsWith("/scorer")) {
      router.refresh()
      return
    }

    // On table/scoreboard, explicit click moves into scoring.
    router.push(`/games/${gameId}/scorer`)
  }

  return (
    <section className="sticky bottom-4 z-20 mt-6 rounded-2xl border border-white/10 bg-slate-950/95 p-4 backdrop-blur">
      <div className="mb-3">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Session Control
        </div>
        <div className="mt-1 text-sm text-slate-300">
          {handComplete
            ? "This hand is complete. Choose what happens next."
            : "This hand is still in progress. You can continue, finalize, or start a new game."}
        </div>
      </div>

      {msg && (
        <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
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

        <button
          onClick={finalizeSession}
          disabled={busy}
          className="lp-button"
        >
          {busy ? "Finalizing..." : "Finalize Session"}
        </button>

        <Link
          href="/games/new"
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Start New Game
        </Link>

        <Link
          href={`/games/${gameId}/scoreboard`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          View Scoreboard
        </Link>

        <Link
          href={`/games/${gameId}`}
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Back to Table
        </Link>
      </div>
    </section>
  )
}