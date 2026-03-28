"use client";

import { useState } from "react";
import GameSessionActions from "../GameSessionActions";
import { canScore } from "@/lib/roles";

type HandPlayerRow = {
  player_id: string;
  display_name: string;
  cards: Record<string, number>;
  hand_total: number;
};

type CardDetail = {
  row_id: string;
  card_number: number;
  winner_user_id: string | null;
  loser_user_id: string | null;
  amount_won: number;
  final_bid_raw: string | null;
  notes: string | null;
};

type CardGroup = {
  card_number: number;
  rows: CardDetail[];
};

type HandBoard = {
  hand_number: number;
  cards: string[];
  players: HandPlayerRow[];
  card_totals: Record<string, number>;
  hand_total_sum: number;
  cards_detail: CardDetail[];
};

type HandSummaryRow = {
  hand_number: number;
  totals: Record<string, number>;
};

type SessionSummaryPlayer = {
  player_id: string;
  display_name: string;
  session_total: number;
};

type SessionScoreboardResponse = {
  game_id: string;
  hands: HandBoard[];
  hand_summary: HandSummaryRow[];
  session_summary: SessionSummaryPlayer[];
};

type HandProgress = {
  game_id: string;
  cards_per_hand: number;
  current_hand_number: number;
  cards_played_in_current_hand: number;
  cards_remaining_in_current_hand: number;
  hand_complete: boolean;
};

type Game = {
  id: string;
  scorekeeper_user_id: string;
};

type PlayerOption = {
  id: string;
  display_name: string;
};


type Props = {
  gameId: string;
  data: SessionScoreboardResponse;
  progress: HandProgress | null;
  game: Game;
  players: PlayerOption[];
  appUserId: string;
  appUserRole: "player" | "scorer" | "club_admin" | "super_admin";
};

function money(v: number | string | undefined) {
  if (v === undefined) return "";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function amountClass(v: number) {
  if (v > 0) return "money-positive";
  if (v < 0) return "money-negative";
  return "text-slate-300";
}

function playerName(
  players: { id: string; display_name: string }[],
  id: string | null
) {
  if (!id) return "—";
  return players.find((p) => p.id === id)?.display_name || id;
}

function groupCards(cards: CardDetail[]): CardGroup[] {
  const grouped = new Map<number, CardDetail[]>();

  for (const row of cards) {
    const list = grouped.get(row.card_number) || [];
    list.push(row);
    grouped.set(row.card_number, list);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([card_number, rows]) => ({
      card_number,
      rows,
    }));
}

export default function ScoreboardClient({
  gameId,
  data,
  progress,
  game,
  players,
  appUserId,
  appUserRole,
}: Props) {

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";
  const canEdit =
    canScore(appUserRole) && appUserId === game.scorekeeper_user_id;

  const [editingCardGroup, setEditingCardGroup] = useState<CardGroup | null>(null);
  const [saving, setSaving] = useState(false);
  const [editBidOwnerUserId, setEditBidOwnerUserId] = useState("");
  const [editBidOwnerWon, setEditBidOwnerWon] = useState(true);
  const [editAmount, setEditAmount] = useState("");
  const [editBid, setEditBid] = useState("");
  const [editNotes, setEditNotes] = useState("");

  function openEditGroup(group: CardGroup) {
    const first = group.rows[0]
    const uniqueWinners = Array.from(new Set(group.rows.map((r) => r.winner_user_id).filter(Boolean)))
    const uniqueLosers = Array.from(new Set(group.rows.map((r) => r.loser_user_id).filter(Boolean)))

    let bidOwnerUserId = ""
    let bidOwnerWon = true

    if (uniqueWinners.length === 1) {
      bidOwnerUserId = String(uniqueWinners[0] || "")
      bidOwnerWon = true
    } else if (uniqueLosers.length === 1) {
      bidOwnerUserId = String(uniqueLosers[0] || "")
      bidOwnerWon = false
    }

    setEditingCardGroup(group)
    setEditBidOwnerUserId(bidOwnerUserId)
    setEditBidOwnerWon(bidOwnerWon)
    setEditAmount(String(first.amount_won ?? ""))
    setEditBid(first.final_bid_raw ?? "")
    setEditNotes(first.notes ?? "")
  }

  async function saveEdit() {
    if (!editingCardGroup) return;

    if (!canEdit) {
      alert("Not authorized");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/games/${gameId}/hands/by-card`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hand_number: data.hands.find((h) =>
            groupCards(h.cards_detail).some(
              (g) =>
                g.card_number === editingCardGroup.card_number &&
                JSON.stringify(g.rows.map((r) => r.row_id).sort()) ===
                  JSON.stringify(editingCardGroup.rows.map((r) => r.row_id).sort())
            )
          )?.hand_number,
          card_number: editingCardGroup.card_number,
          bid_owner_user_id: editBidOwnerUserId,
          bid_owner_won: editBidOwnerWon,
          amount_won: editAmount === "" ? 0 : Number(editAmount),
          final_bid_raw: editBid,
          notes: editNotes,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update card group");
      }

      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update card group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Scoreboard
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Session Scoreboard
        </h1>

        <div className="mt-2 text-sm text-slate-400">
          Game:{" "}
          <code className="rounded-lg bg-white/5 px-2 py-1 text-slate-200">
            {data.game_id}
          </code>
        </div>
      </div>

      <div className="grid gap-6">
        {data.hands.map((hand) => (
          <section key={hand.hand_number} className="lp-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Hand {hand.hand_number}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Player-by-player totals for each card and the hand total.
                </p>
              </div>

              <span className="lp-badge">
                {hand.players.length} Player{hand.players.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="min-w-[560px] table-fixed">
                <thead>
                  <tr className="bg-white/5">
                    <th className="w-[120px] px-2 py-3 text-left">Player</th>
                    {hand.cards.map((card) => (
                      <th key={card} className="w-[82px] px-2 py-3 text-right">
                        {card}
                      </th>
                    ))}
                    <th className="w-[90px] px-2 py-3 text-right">Hand Total</th>
                  </tr>
                </thead>

                <tbody>
                  {hand.players.map((p) => (
                    <tr key={p.player_id}>
                      <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3 align-top">
                        <div className="truncate font-semibold leading-tight text-white">
                          {p.display_name}
                        </div>
                        <div className="truncate text-[11px] leading-tight text-slate-500">
                          {p.player_id}
                        </div>
                      </td>

                      {hand.cards.map((card) => {
                        const v = Number(p.cards[card] ?? 0);
                        return (
                          <td
                            key={card}
                            className={`w-[82px] px-2 py-3 text-right whitespace-nowrap ${amountClass(
                              v
                            )}`}
                          >
                            {v === 0 ? "-" : money(v)}
                          </td>
                        );
                      })}

                      <td
                        className={`w-[90px] px-2 py-3 text-right whitespace-nowrap font-bold ${amountClass(
                          Number(p.hand_total)
                        )}`}
                      >
                        {money(p.hand_total)}
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-white/5">
                    <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3 font-extrabold text-white">
                      Hand Total
                    </td>

                    {hand.cards.map((card) => {
                      const total = Number(hand.card_totals[card] ?? 0);
                      return (
                        <td
                          key={card}
                          className={`w-[82px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                            total
                          )}`}
                        >
                          {money(total)}
                        </td>
                      );
                    })}

                    <td
                      className={`w-[90px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                        Number(hand.hand_total_sum)
                      )}`}
                    >
                      {money(hand.hand_total_sum)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10">
              <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
                Card Details
              </div>

              <div className="divide-y divide-white/10">
                {groupCards(hand.cards_detail).length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">
                    No card detail rows found.
                  </div>
                ) : (
                  groupCards(hand.cards_detail).map((group) => {
                    const first = group.rows[0];
                    const losers = group.rows.map((row) =>
                      playerName(players, row.loser_user_id)
                    );

                    return (
                      <details key={group.card_number} className="group">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-white/5">
                          <div className="text-sm text-slate-300">
                            <div>
                              <span className="font-semibold text-white">
                                Card {group.card_number}
                              </span>{" "}
                              • {money(first.amount_won)}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Bid Owner: {playerName(players, first.winner_user_id)}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Opponents: {losers.join(", ")}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              Bid: {first.final_bid_raw || "—"}
                              {first.notes ? ` • ${first.notes}` : ""}
                            </div>
                          </div>

                          <span className="text-xs font-semibold text-slate-400 group-open:hidden">
                            Expand
                          </span>
                          <span className="hidden text-xs font-semibold text-slate-400 group-open:inline">
                            Collapse
                          </span>
                        </summary>

                        <div className="border-t border-white/10 px-4 py-3">
                          <div className="mb-3 text-xs uppercase tracking-wide text-slate-500">
                            Settlement rows in this card
                          </div>

                          <div className="space-y-2">
                            {group.rows.map((row) => (
                              <div
                                key={row.row_id}
                                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
                              >
                                {playerName(players, row.winner_user_id)} beat{" "}
                                {playerName(players, row.loser_user_id)} for{" "}
                                {money(row.amount_won)}
                              </div>
                            ))}
                          </div>

                          <div className="mt-4">
                            {canEdit && (
                              <button onClick={() => openEditGroup(group)}>
                                Edit Card
                              </button>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        ))}

        <section className="lp-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Session Summary (Cum Cum)
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Rollup of every hand into cumulative session totals.
              </p>
            </div>

            <span className="lp-badge">
              {data.hand_summary.length} Hand{data.hand_summary.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[500px] table-fixed">
              <thead>
                <tr className="bg-white/5">
                  <th className="w-[120px] px-2 py-3 text-left">Player</th>
                  {data.hand_summary.map((h) => (
                    <th key={h.hand_number} className="w-[82px] px-2 py-3 text-right">
                      Hand {h.hand_number}
                    </th>
                  ))}
                  <th className="w-[96px] px-2 py-3 text-right">Session Total</th>
                </tr>
              </thead>

              <tbody>
                {data.session_summary.map((p) => {
                  const handAmounts = data.hand_summary.map((h) => ({
                    hand_number: h.hand_number,
                    value: Number(h.totals[p.player_id] ?? 0),
                  }));

                  return (
                    <tr key={p.player_id}>
                      <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3">
                        <div className="truncate font-semibold leading-tight text-white">
                          {p.display_name}
                        </div>
                      </td>

                      {handAmounts.map((h) => (
                        <td
                          key={h.hand_number}
                          className={`w-[82px] px-2 py-3 text-right whitespace-nowrap ${amountClass(
                            h.value
                          )}`}
                        >
                          {h.value === 0 ? "-" : money(h.value)}
                        </td>
                      ))}

                      <td
                        className={`w-[96px] px-2 py-3 text-right whitespace-nowrap font-bold ${amountClass(
                          Number(p.session_total)
                        )}`}
                      >
                        {money(p.session_total)}
                      </td>
                    </tr>
                  );
                })}

                <tr className="bg-white/5">
                  <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3 font-extrabold text-white">
                    Session Total
                  </td>

                  {data.hand_summary.map((h) => {
                    const total = Object.values(h.totals).reduce(
                      (sum, v) => sum + Number(v || 0),
                      0
                    );

                    return (
                      <td
                        key={h.hand_number}
                        className={`w-[82px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                          total
                        )}`}
                      >
                        {money(total)}
                      </td>
                    );
                  })}

                  <td
                    className={`w-[96px] px-2 py-3 text-right whitespace-nowrap font-extrabold ${amountClass(
                      data.session_summary.reduce(
                        (sum, p) => sum + Number(p.session_total || 0),
                        0
                      )
                    )}`}
                  >
                    {money(
                      data.session_summary.reduce(
                        (sum, p) => sum + Number(p.session_total || 0),
                        0
                      )
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <GameSessionActions
        gameId={gameId}
        handComplete={Boolean(progress?.hand_complete)}
        appUserId={appUserId}
        appUserRole={appUserRole}
      />
      {editingCardGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-4 text-xl font-bold text-white">
              Edit Card {editingCardGroup.card_number}
            </div>
            <label className="mb-2 block text-sm text-slate-300">Bid Owner</label>
            <select
              value={editBidOwnerUserId}
              onChange={(e) => setEditBidOwnerUserId(e.target.value)}
              className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            >
              <option value="">Select bid owner</option>
              {players
                .filter((p) =>
                  editingCardGroup?.rows.some(
                    (row) => row.winner_user_id === p.id || row.loser_user_id === p.id
                  )
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
            </select>

            <label className="mb-2 block text-sm text-slate-300">Outcome</label>
            <div className="mb-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-slate-200">
                <input
                  type="radio"
                  name="editOutcome"
                  checked={editBidOwnerWon === true}
                  onChange={() => setEditBidOwnerWon(true)}
                  className="w-auto"
                />
                Bid Owner WON
              </label>

              <label className="flex items-center gap-2 text-slate-200">
                <input
                  type="radio"
                  name="editOutcome"
                  checked={editBidOwnerWon === false}
                  onChange={() => setEditBidOwnerWon(false)}
                  className="w-auto"
                />
                Bid Owner LOST
              </label>
            </div>
            <label className="mb-2 block text-sm text-slate-300">Amount</label>
            <input
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />

            <label className="mb-2 block text-sm text-slate-300">Final Bid</label>
            <input
              value={editBid}
              onChange={(e) => setEditBid(e.target.value)}
              className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />

            <label className="mb-2 block text-sm text-slate-300">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="mb-4 min-h-[100px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingCardGroup(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}