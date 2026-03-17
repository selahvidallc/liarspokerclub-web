"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

export default function GameSessionActions({
  gameId,
  handComplete,
  appUserId,
}: {
  gameId: string
  handComplete: boolean
  appUserId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  async function finalizeSession() {
    const ok = window.confirm(
      "Are you sure you want to end this session? Scoring will be locked."
    )
    if (!ok) return

    setBusy(true)
    setMsg("")

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/finalize`, {
        method: "POST",
        headers: {
          "X-User-Id": appUserId,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`End session failed: ${text}`)
        return
      }

      router.push(`/games/${gameId}/scoreboard`)
      router.refresh()
    } catch (e: any) {
      setMsg(`End session failed: ${e?.message || String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  function handleSameHandSamePlayers() {
    router.push(`/games/${gameId}/scorer`)
    router.refresh()
  }

  function handleChangeHandTypePlayers() {
    router.push(`/games/${gameId}`)
  }

  return (
    <section className="sticky bottom-4 z-20 mt-8 rounded-2xl border border-white/10 bg-slate-950/95 p-5 backdrop-blur">
      <div className="mb-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Session Actions
        </div>
        <div className="mt-1 text-sm text-slate-300">
          {handComplete
            ? "This hand is complete. Choose how to continue the session."
            : "Continue scoring the current hand, review the scoreboard, or end the session."}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {handComplete ? (
          <>
            <button
              onClick={handleSameHandSamePlayers}
              disabled={busy}
              className="lp-button"
            >
              Play Same Hand Type / Same Players
            </button>

            <button
              onClick={handleChangeHandTypePlayers}
              disabled={busy}
              className="lp-button-secondary"
            >
              Change Hand Type / Edit Players
            </button>
          </>
        ) : (
          <button
            onClick={() => {
              if (pathname?.endsWith("/scorer")) {
                router.refresh()
                return
              }
              router.push(`/games/${gameId}/scorer`)
            }}
            disabled={busy}
            className="lp-button"
          >
            Continue Current Hand
          </button>
        )}

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

        <button
          onClick={finalizeSession}
          disabled={busy}
          className="lp-button-secondary"
        >
          {busy ? "Ending Session..." : "End Session"}
        </button>
      </div>
    </section>
  )
}