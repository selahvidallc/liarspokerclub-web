"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import GameSessionActions from "../GameSessionActions"

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"

type Player = {
  id: string
  display_name: string
}

type GameSettings = {
  id: string
  title: string
  cards_per_hand: number
  base_bet: string
  bet_ladder: number[] | null
  settlement_mode: string
  nut_enabled: boolean
  skunk_enabled: boolean
  track_bid_trail: boolean
  digit_order_mode: string
}

function faceToInternal(face: string) {
  if (face === "10") return "0"
  if (face === "A") return "1"
  return face
}

function money(v: number | string | undefined) {
  if (v === undefined) return ""
  const n = typeof v === "string" ? Number(v) : v
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" })
}

export default function ScorerClient({
  gameId,
  players,
  settings,
}: {
  gameId: string
  players: Player[]
  settings: GameSettings
}) {
  const router = useRouter()

  const [bidOwner, setBidOwner] = useState("")
  const [bidOwnerWon, setBidOwnerWon] = useState(false)

  const [handNumber, setHandNumber] = useState(1)
  const [count, setCount] = useState(3)
  const [face, setFace] = useState("7")

  const [nut, setNut] = useState(false)
  const [skunk, setSkunk] = useState(false)

  const [betAmount, setBetAmount] = useState("")
  const [notes, setNotes] = useState("")

  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [handSaved, setHandSaved] = useState(false)

  const resolvedBet = useMemo(() => {
    if (betAmount.trim()) return Number(betAmount)

    if (settings.bet_ladder && settings.bet_ladder.length > 0) {
      let idx = handNumber - 1
      if (idx < 0) idx = 0
      if (idx >= settings.bet_ladder.length) idx = settings.bet_ladder.length - 1
      return Number(settings.bet_ladder[idx])
    }

    return Number(settings.base_bet)
  }, [betAmount, handNumber, settings.bet_ladder, settings.base_bet])

  async function submit() {
    setMsg("")
    setHandSaved(false)

    if (!bidOwner) {
      setMsg("Pick the bid owner.")
      return
    }

    const finalBidRaw = `${count}x${faceToInternal(face)}`

    const payload = {
      hand_number: handNumber,
      bid_owner_user_id: bidOwner,
      bid_owner_won: bidOwnerWon,
      final_bid_raw: finalBidRaw,
      bet_amount: betAmount.trim() ? betAmount.trim() : null,
      is_nut: nut,
      is_skunk: skunk,
      notes: notes.trim() ? notes.trim() : null,
    }

    setSaving(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)

    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/hands/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!res.ok) {
        const t = await res.text()
        setMsg(`Error: ${t}`)
        return
      }

      const data = await res.json()
      setMsg(`Saved! Hand #${data.hand_number} — rows created: ${data.rows_created}`)
      setHandSaved(true)
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setMsg("Error: API request timed out.")
      } else {
        setMsg(`Error: ${e?.message || String(e)}`)
      }
    } finally {
      clearTimeout(timeout)
      setSaving(false)
    }
  }

  function playAnotherHand() {
    setHandNumber((n) => n + 1)
    setBidOwner("")
    setBidOwnerWon(false)
    setCount(3)
    setFace("7")
    setNut(false)
    setSkunk(false)
    setBetAmount("")
    setNotes("")
    setMsg("")
    setHandSaved(false)
  }

  function finalizeCumCum() {
    router.push(`/games/${gameId}/session-summary`)
  }

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
        Scorer
      </h1>

      <div style={{ opacity: 0.75, marginBottom: 8 }}>
        Game: <code>{gameId}</code>
      </div>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#fafafa",
          border: "1px solid #ddd",
          borderRadius: 8,
        }}
      >
        <div><strong>{settings.title}</strong></div>
        <div>Settlement Mode: <strong>{settings.settlement_mode}</strong></div>
        <div>Cards Per Hand: <strong>{settings.cards_per_hand}</strong></div>
        <div>Current Hand #: <strong>{handNumber}</strong></div>
        <div>Current Hand Bet: <strong>{money(resolvedBet)}</strong></div>
        <div>
          Ladder:{" "}
          <strong>
            {settings.bet_ladder && settings.bet_ladder.length > 0
              ? settings.bet_ladder.map((v) => money(v)).join(", ")
              : `Flat ${money(settings.base_bet)}`}
          </strong>
        </div>
      </div>

      <div style={{ marginBottom: 12, fontWeight: 600 }}>
        Bid: {count} × {face}
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            background: handSaved ? "#eefcf1" : "#fff7e6",
            border: `1px solid ${handSaved ? "#b7ebc0" : "#ffe2a8"}`,
            borderRadius: 8,
          }}
        >
          <div style={{ whiteSpace: "pre-wrap" }}>{msg}</div>
        </div>
      )}

      {handSaved && (
        <div
          style={{
            marginBottom: 18,
            padding: 14,
            border: "1px solid #d9d9d9",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Hand saved. What do you want to do next?
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href={`/games/${gameId}/scoreboard`} style={linkBtn}>
              Go to Scoreboard →
            </a>

            <a href="/info" style={linkBtn}>
              Liar&apos;s Poker Info →
            </a>
          </div>
        </div>
      )}

      {!handSaved && (
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={label}>Bid Owner</label>
            <select
              style={input}
              value={bidOwner}
              onChange={(e) => setBidOwner(e.target.value)}
            >
              <option value="">Select</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Outcome</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="outcome"
                  checked={bidOwnerWon === true}
                  onChange={() => setBidOwnerWon(true)}
                />
                Bid Owner WON
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="outcome"
                  checked={bidOwnerWon === false}
                  onChange={() => setBidOwnerWon(false)}
                />
                Bid Owner LOST
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>Hand #</label>
              <input
                style={input}
                type="number"
                min={1}
                value={handNumber}
                onChange={(e) => setHandNumber(parseInt(e.target.value || "1", 10))}
              />
            </div>

            <div>
              <label style={label}>Bid Count</label>
              <input
                style={input}
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value || "1", 10))}
              />
            </div>
          </div>

          <div>
            <label style={label}>Face</label>
            <select style={input} value={face} onChange={(e) => setFace(e.target.value)}>
              {["2","3","4","5","6","7","8","9","10","A"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Mapping: 10 → 0, A → 1
            </div>
          </div>

          <div>
            <label style={label}>Bet Amount Override (optional)</label>
            <input
              style={input}
              placeholder="leave blank to use ladder/default"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
            />
          </div>

          <div>
            <label style={label}>Flags</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={nut}
                  onChange={() => {
                    const next = !nut
                    setNut(next)
                    if (next) setSkunk(false)
                  }}
                />
                Nut (double)
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: nut ? 0.5 : 1 }}>
                <input
                  type="checkbox"
                  checked={skunk}
                  disabled={nut}
                  onChange={() => setSkunk(!skunk)}
                />
                Skunk (double)
              </label>
            </div>
          </div>

          <div>
            <label style={label}>Notes (optional)</label>
            <textarea
              style={{ ...input, height: 80 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>

            <a href={`/games/${gameId}/scoreboard`} style={{ opacity: 0.85 }}>
              Go to Scoreboard →
            </a>

            <a href="/info" style={{ opacity: 0.85 }}>
              Liar&apos;s Poker Info →
            </a>
          </div>
        </div>
      )}
      <GameSessionActions
        gameId={gameId}
        handComplete={true}
      />
    </main>
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

const actionBtn: React.CSSProperties = {
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