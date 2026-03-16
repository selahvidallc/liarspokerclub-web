"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

export default function DeleteGameButton({
  gameId,
  appUserId,
}: {
  gameId: string
  appUserId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  async function handleDelete() {
    const ok = window.confirm(
      "Are you sure you want to delete this game? This cannot be undone."
    )
    if (!ok) return

    setBusy(true)
    setMsg("")

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": appUserId,
        },
      })

      if (!res.ok) {
        const text = await res.text()
        setMsg(`Delete failed: ${text}`)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch (e: any) {
      setMsg(`Delete failed: ${e?.message || String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={busy}
        className="lp-button-secondary"
      >
        {busy ? "Deleting..." : "Delete Game"}
      </button>

      {msg && (
        <div className="mt-2 text-sm text-rose-300">
          {msg}
        </div>
      )}
    </div>
  )
}