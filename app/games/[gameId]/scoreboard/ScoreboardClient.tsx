"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GameSessionActions from "../GameSessionActions";
import { canScore } from "@/lib/roles";

type HandPlayerRow = {
  player_id: string;
  display_name: string;
  cards: Record<string, number>;
  hand_total: number;
};

type SettlementRow = {
  row_id: string;
  winner_user_id: string | null;
  loser_user_id: string | null;
  amount_won: number;
};

type CardView = {
  card_number: number;
  label: string;
  bid_owner_user_id: string | null;
  bid_owner_won: boolean | null;
  final_bid_raw: string | null;
  notes: string | null;
  amount_won: number;
  participant_ids: string[];
  settlement_rows: SettlementRow[];
};

type HandBoard = {
  hand_number: number;
  cards: CardView[];
  players: HandPlayerRow[];
  card_totals: Record<string, number>;
  hand_total_sum: number;
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
  hands?: HandBoard[];
  hand_summary?: HandSummaryRow[];
  session_summary?: SessionSummaryPlayer[];
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
  status?: string;
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
  if (v < 0) return "money-negative";
  return "text-slate-900";
}

function playerName(
  players: { id: string; display_name: string }[],
  id: string | null
) {
  if (!id) return "—";
  return players.find((p) => p.id === id)?.display_name || id;
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
  
  const router = useRouter();

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";

  const canEdit =
    canScore(appUserRole) && appUserId === game.scorekeeper_user_id;

  const safeHands = useMemo(() => (Array.isArray(data.hands) ? data.hands : []), [data.hands]);
  const safeHandSummary = useMemo(
    () => (Array.isArray(data.hand_summary) ? data.hand_summary : []),
    [data.hand_summary]
  );
  const safeSessionSummary = useMemo(
    () => (Array.isArray(data.session_summary) ? data.session_summary : []),
    [data.session_summary]
  );
  const safePlayers = useMemo(() => (Array.isArray(players) ? players : []), [players]);

  const [editingCard, setEditingCard] = useState<(CardView & { hand_number: number }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [editBidOwnerUserId, setEditBidOwnerUserId] = useState("");
  const [editBidOwnerWon, setEditBidOwnerWon] = useState(true);
  const [editAmount, setEditAmount] = useState("");
  const [editBid, setEditBid] = useState("");
  const [editNotes, setEditNotes] = useState("");
  
  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [router]);

  function openEditCard(handNumber: number, card: CardView) {
    setEditingCard({ ...card, hand_number: handNumber });
    setEditBidOwnerUserId(card.bid_owner_user_id ?? "");
    setEditBidOwnerWon(card.bid_owner_won ?? true);
    setEditAmount(String(card.amount_won ?? ""));
    setEditBid(card.final_bid_raw ?? "");
    setEditNotes(card.notes ?? "");
  }

  async function saveEdit() {
    if (!editingCard) return;

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
          hand_number: editingCard.hand_number,
          card_number: editingCard.card_number,
          bid_owner_user_id: editBidOwnerUserId,
          bid_owner_won: editBidOwnerWon,
          amount_won: editAmount === "" ? 0 : Number(editAmount),
          final_bid_raw: editBid,
          notes: editNotes,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update card");
      }

      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update card");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-slate-200">
          <strong className="text-white">Scorekeeping Only</strong> This scoreboard tracks game results only.
          Liar&apos;s Poker Club does not facilitate gambling, hold funds, or process wagers.
        </div>
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
        <div className="mt-2 text-xs font-semibold text-emerald-300">
          Live scoreboard: auto-refreshes every 5 seconds.
        </div>        
      </div>

      <div className="grid gap-6">
        {safeHands.map((hand) => {
          const handCards = Array.isArray(hand.cards) ? hand.cards : [];
          const handCardLabels = handCards.map((c) => c.label);
          const handPlayers = Array.isArray(hand.players) ? hand.players : [];

          return (
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
                  {handPlayers.length} Player{handPlayers.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-[560px] table-fixed">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="w-[120px] px-2 py-3 text-left">Player</th>
                      {handCardLabels.map((card) => (
                        <th key={card} className="w-[82px] px-2 py-3 text-right">
                          {card}
                        </th>
                      ))}
                      <th className="w-[90px] px-2 py-3 text-right">Hand Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {handPlayers.map((p) => (
                      <tr key={p.player_id}>
                        <td className="w-[120px] max-w-[120px] overflow-hidden px-2 py-3 align-top">
                          <div className="truncate font-semibold leading-tight text-white">
                            {p.display_name}
                          </div>
                          <div className="truncate text-[11px] leading-tight text-slate-500">
                            {p.player_id}
                          </div>
                        </td>

                        {handCardLabels.map((card) => {
                          const v = Number((p.cards || {})[card] ?? 0);
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

                      {handCardLabels.map((card) => {
                        const total = Number((hand.card_totals || {})[card] ?? 0);
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
                  {handCards.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-400">
                      No card detail rows found.
                    </div>
                  ) : (
                    handCards.map((card) => {
                      const opponents = (card.settlement_rows ?? []).map((row) =>
                        playerName(
                          safePlayers,
                          card.bid_owner_won ? row.loser_user_id : row.winner_user_id
                        )
                      );

                      return (
                        <details key={card.card_number} className="group">
                          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-white/5">
                            <div className="text-sm text-slate-300">
                              <div>
                                <span className="font-semibold text-white">
                                  {card.label}
                                </span>{" "}
                                • {money(card.amount_won)}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                Bid Owner: {playerName(safePlayers, card.bid_owner_user_id)}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                Opponents: {opponents.join(", ")}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                Outcome: {card.bid_owner_won === true
                                  ? "Bid Owner WON"
                                  : card.bid_owner_won === false
                                  ? "Bid Owner LOST"
                                  : "—"}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                Bid: {card.final_bid_raw || "—"}
                                {card.notes ? ` • ${card.notes}` : ""}
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
                              {(card.settlement_rows ?? []).map((row) => (
                                <div
                                  key={row.row_id}
                                  className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300"
                                >
                                  {playerName(safePlayers, row.winner_user_id)} beat{" "}
                                  {playerName(safePlayers, row.loser_user_id)} for{" "}
                                  {money(row.amount_won)}
                                </div>
                              ))}
                            </div>

                            <div className="mt-4">
                              {canEdit && (
                                <button onClick={() => openEditCard(hand.hand_number, card)}>
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
          );
        })}

        <section className="lp-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Session Summary
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Rollup of every hand into cumulative session totals.
              </p>
            </div>

            <span className="lp-badge">
              {safeHandSummary.length} Hand{safeHandSummary.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-[500px] table-fixed">
              <thead>
                <tr className="bg-white/5">
                  <th className="w-[120px] px-2 py-3 text-left">Player</th>
                  {safeHandSummary.map((h) => (
                    <th key={h.hand_number} className="w-[82px] px-2 py-3 text-right">
                      Hand {h.hand_number}
                    </th>
                  ))}
                  <th className="w-[96px] px-2 py-3 text-right">Session Total</th>
                </tr>
              </thead>

              <tbody>
                {safeSessionSummary.map((p) => {
                  const handAmounts = safeHandSummary.map((h) => ({
                    hand_number: h.hand_number,
                    value: Number((h.totals || {})[p.player_id] ?? 0),
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

                  {safeHandSummary.map((h) => {
                    const total = Object.values(h.totals || {}).reduce(
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
                      safeSessionSummary.reduce(
                        (sum, p) => sum + Number(p.session_total || 0),
                        0
                      )
                    )}`}
                  >
                    {money(
                      safeSessionSummary.reduce(
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
        gameStatus={game.status}
      />

      {editingCard && (
        <div className="lp-overlay fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="lp-modal w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 text-xl font-bold text-white">
              Edit {editingCard.label}
            </div>

            <label className="mb-2 block text-sm text-slate-300">Bid Owner</label>
            <select
              value={editBidOwnerUserId}
              onChange={(e) => setEditBidOwnerUserId(e.target.value)}
              className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
            >
              <option value="">Select bid owner</option>
              {safePlayers
                .filter((p) => editingCard?.participant_ids?.includes(p.id))
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
                onClick={() => setEditingCard(null)}
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