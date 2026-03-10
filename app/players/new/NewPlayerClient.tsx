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

      router.back()
      router.refresh()
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {msg && (
        <div
          style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          {msg}
        </div>
      )}

      <div>
        <label style={label}>Display Name</label>
        <input
          style={input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>

      <div>
        <label style={label}>Email</label>
        <input
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={submit} disabled={saving} style={buttonStyle}>
          {saving ? "Creating..." : "Create Player"}
        </button>

        <a href="/games/new" style={linkBtn}>
          Back to New Game →
        </a>
      </div>
    </div>
  )
}

const label: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  marginBottom: 6,
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ddd",
  borderRadius: 8,
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
}

const linkBtn: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #ddd",
  borderRadius: 6,
  textDecoration: "none",
  color: "inherit",
}