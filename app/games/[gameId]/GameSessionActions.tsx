"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { canScore } from "@/lib/roles"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

export default function GameSessionActions({
  gameId,
  handComplete,
  appUserId,
  appUserRole,
  gameStatus = "OPEN",
}: {
  gameId: string
  handComplete: boolean
  appUserId: string
  appUserRole: "player" | "scorer" | "club_admin" | "super_admin"
  gameStatus?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  const isScoreboardPage = pathname.includes(`/games/${gameId}/scoreboard`)
  const isScorerPage = pathname.includes(`/games/${gameId}/scorer`)
  const isSetupPage = pathname.includes(`/games/${gameId}/setup`)

  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const canControl = canScore(appUserRole)
  const isFinalized = gameStatus === "FINALIZED"
  const canControlOpenGame = canControl && !isFinalized
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

      router.push("/dashboard")
      router.refresh()
    } catch (e: any) {
      setMsg(`End session failed: ${e?.message || String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  function continueToSetup() {
    router.push(`/games/${gameId}/setup?same_hand=1`)
  }

  return (
    <section className="lp-card sticky bottom-4 z-20 mt-8 p-5 backdrop-blur">
      <div className="mb-4">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Session Actions
        </div>
        <div className="mt-1 text-sm text-slate-700">
          {isFinalized
            ? "This session is finalized. Scoring is locked."
            : handComplete
            ? "This hand is complete. Create the next hand using the previous setup, or change players and hand type first."
            : "Continue scoring the current hand, review the scoreboard, or end the session."}
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {msg}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {canControlOpenGame &&
          !isScorerPage &&
          (handComplete ? (
            !isSetupPage && (
              <button
                onClick={continueToSetup}
                disabled={busy}
                className="lp-button"
              >
                Create New Hand | Change Players | Hand Type
              </button>
            )
          ) : (
            <button
              onClick={() => router.push(`/games/${gameId}/scorer`)}
              disabled={busy}
              className="lp-button"
            >
              Scorer Sheet
            </button>
          ))}

        {!isScoreboardPage && (
          <Link
            href={`/games/${gameId}/scoreboard`}
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            View Scoreboard
          </Link>
        )}

        {!isSetupPage && (
          <Link
            href={`/games/${gameId}/setup?same_hand=1`}
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Change Players / Hand Type
          </Link>
        )}

        <Link
          href="/dashboard"
          className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
        >
          Dashboard
        </Link>

        {canControlOpenGame && (
          <button
            onClick={finalizeSession}
            disabled={busy}
            className="lp-button-secondary"
          >
            {busy ? "Ending Session..." : "End Session"}
          </button>
        )}
      </div>
    </section>
  )
}