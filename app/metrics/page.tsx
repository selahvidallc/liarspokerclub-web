"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";

type AppUser = {
  id: string;
  email: string;
  display_name: string;
  created: boolean;
};

type Game = {
  id: string;
  title: string;
  settlement_mode: string;
  cards_per_hand: number;
  base_bet: string | number;
  status: string;
  finalized_at: string | null;
  created_by_user_id: string;
  scorekeeper_user_id?: string;
};

type HandPlayerRow = {
  player_id: string;
  display_name: string;
  cards: Record<string, number>;
  hand_total: number;
};

type HandBoard = {
  hand_number: number;
  cards: string[];
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

type CardRoleRow = {
  hand_number: number;
  card_number: number;
  bid_owner_user_id: string | null;
  bid_owner_won: boolean | null;
  amount_won: number;
  participant_ids: string[];
};

type SessionScoreboardResponse = {
  game_id: string;
  hands: HandBoard[];
  hand_summary: HandSummaryRow[];
  session_summary: SessionSummaryPlayer[];
  card_roles?: CardRoleRow[];
};

type SessionMetric = {
  game_id: string;
  title: string;
  finalized_at: string | null;
  settlement_mode: string;
  cards_per_hand: number;
  session_total: number;
  hands_played: number;
  hands_won: number;
  hands_lost: number;
  hands_push: number;
  cards_played: number;
  cards_won: number;
  cards_lost: number;

  bid_owner_cards: number;
  bid_owner_wins: number;
  bid_owner_losses: number;
  bid_owner_net: number;

  non_bid_owner_cards: number;
  non_bid_owner_wins: number;
  non_bid_owner_losses: number;
  non_bid_owner_net: number;

  club_bid_owner_cards: number;
  club_bid_owner_wins: number;
  club_bid_owner_losses: number;
  club_bid_owner_net: number;

  club_non_bid_owner_cards: number;
  club_non_bid_owner_wins: number;
  club_non_bid_owner_losses: number;
  club_non_bid_owner_net: number;
};

function money(v: number | string | undefined) {
  if (v === undefined) return "$0.00";
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return "$0.00";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function amountClass(v: number) {
  if (v > 0) return "money-positive";
  if (v < 0) return "money-negative";
  return "text-slate-300";
}

function getMonthKey(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getYearKey(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}`;
}

export default function MetricsPage() {
  const { user, isLoaded } = useUser();

  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) return;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) {
          throw new Error("Signed-in user does not have a primary email.");
        }

        const syncRes = await fetch(`${API_BASE}/users/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            display_name:
              user.fullName || user.username || user.firstName || "Player",
          }),
        });

        const syncData = await syncRes.json();

        if (!syncRes.ok) {
          throw new Error(syncData?.detail || "Failed to sync user.");
        }

        setAppUser(syncData);

        const gamesRes = await fetch(
          `${API_BASE}/games/my?user_id=${syncData.id}`,
          { cache: "no-store" }
        );

        const gamesData = await gamesRes.json();

        if (!gamesRes.ok) {
          throw new Error(gamesData?.detail || "Failed to load games.");
        }

        setGames(gamesData);

        const finalizedGames = (gamesData as Game[]).filter(
          (g) => g.status === "FINALIZED"
        );

        const metricResults: SessionMetric[] = [];

        for (const game of finalizedGames) {
          const sbRes = await fetch(
            `${API_BASE}/games/${game.id}/scoreboard/session`,
            { cache: "no-store" }
          );

          const sbData = await sbRes.json();

          if (!sbRes.ok) {
            continue;
          }

          const scoreboard = sbData as SessionScoreboardResponse;

          const mySession = scoreboard.session_summary.find(
            (p) => p.player_id === syncData.id
          );

          if (!mySession) continue;

          let handsWon = 0;
          let handsLost = 0;
          let handsPush = 0;

          for (const hand of scoreboard.hand_summary) {
            const total = Number(hand.totals[syncData.id] ?? 0);
            if (total > 0) handsWon += 1;
            else if (total < 0) handsLost += 1;
            else handsPush += 1;
          }

          let cardsPlayed = 0;
          let cardsWon = 0;
          let cardsLost = 0;

          for (const hand of scoreboard.hands) {
            const me = hand.players.find((p) => p.player_id === syncData.id);
            if (!me) continue;

            for (const cardKey of hand.cards) {
              const amount = Number(me.cards[cardKey] ?? 0);
              cardsPlayed += 1;
              if (amount > 0) cardsWon += 1;
              else if (amount < 0) cardsLost += 1;
            }
          }

          let bidOwnerCards = 0;
          let bidOwnerWins = 0;
          let bidOwnerLosses = 0;
          let bidOwnerNet = 0;

          let nonBidOwnerCards = 0;
          let nonBidOwnerWins = 0;
          let nonBidOwnerLosses = 0;
          let nonBidOwnerNet = 0;

          let clubBidOwnerCards = 0;
          let clubBidOwnerWins = 0;
          let clubBidOwnerLosses = 0;
          let clubBidOwnerNet = 0;

          let clubNonBidOwnerCards = 0;
          let clubNonBidOwnerWins = 0;
          let clubNonBidOwnerLosses = 0;
          let clubNonBidOwnerNet = 0;

          for (const roleRow of scoreboard.card_roles || []) {
            const bidOwnerId = roleRow.bid_owner_user_id;
            const bidOwnerWon = roleRow.bid_owner_won;
            const amount = Number(roleRow.amount_won ?? 0);
            const participantIds = roleRow.participant_ids || [];

            if (!bidOwnerId || bidOwnerWon === null) continue;
            if (!participantIds.includes(syncData.id)) continue;

            const nonOwnerIds = participantIds.filter((pid) => pid !== bidOwnerId);
            const opponentCount = nonOwnerIds.length;

            // club averages within finalized games you participated in
            clubBidOwnerCards += 1;
            if (bidOwnerWon) {
              clubBidOwnerWins += 1;
              clubBidOwnerNet += amount * opponentCount;
            } else {
              clubBidOwnerLosses += 1;
              clubBidOwnerNet -= amount * opponentCount;
            }

            clubNonBidOwnerCards += nonOwnerIds.length;
            if (bidOwnerWon) {
              clubNonBidOwnerLosses += nonOwnerIds.length;
              clubNonBidOwnerNet -= amount * nonOwnerIds.length;
            } else {
              clubNonBidOwnerWins += nonOwnerIds.length;
              clubNonBidOwnerNet += amount * nonOwnerIds.length;
            }

            // player role metrics
            if (bidOwnerId === syncData.id) {
              bidOwnerCards += 1;
              if (bidOwnerWon) {
                bidOwnerWins += 1;
                bidOwnerNet += amount * opponentCount;
              } else {
                bidOwnerLosses += 1;
                bidOwnerNet -= amount * opponentCount;
              }
            } else {
              nonBidOwnerCards += 1;
              if (bidOwnerWon) {
                nonBidOwnerLosses += 1;
                nonBidOwnerNet -= amount;
              } else {
                nonBidOwnerWins += 1;
                nonBidOwnerNet += amount;
              }
            }
          }

          metricResults.push({
            game_id: game.id,
            title: game.title,
            finalized_at: game.finalized_at,
            settlement_mode: game.settlement_mode,
            cards_per_hand: game.cards_per_hand,
            session_total: Number(mySession.session_total ?? 0),
            hands_played: scoreboard.hand_summary.length,
            hands_won: handsWon,
            hands_lost: handsLost,
            hands_push: handsPush,
            cards_played: cardsPlayed,
            cards_won: cardsWon,
            cards_lost: cardsLost,

            bid_owner_cards: bidOwnerCards,
            bid_owner_wins: bidOwnerWins,
            bid_owner_losses: bidOwnerLosses,
            bid_owner_net: bidOwnerNet,

            non_bid_owner_cards: nonBidOwnerCards,
            non_bid_owner_wins: nonBidOwnerWins,
            non_bid_owner_losses: nonBidOwnerLosses,
            non_bid_owner_net: nonBidOwnerNet,

            club_bid_owner_cards: clubBidOwnerCards,
            club_bid_owner_wins: clubBidOwnerWins,
            club_bid_owner_losses: clubBidOwnerLosses,
            club_bid_owner_net: clubBidOwnerNet,

            club_non_bid_owner_cards: clubNonBidOwnerCards,
            club_non_bid_owner_wins: clubNonBidOwnerWins,
            club_non_bid_owner_losses: clubNonBidOwnerLosses,
            club_non_bid_owner_net: clubNonBidOwnerNet,
          });
        }

        setSessionMetrics(metricResults);
      } catch (e: any) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isLoaded, user]);

  const finalizedGames = useMemo(
    () => games.filter((g) => g.status === "FINALIZED"),
    [games]
  );

  const activeGames = useMemo(
    () => games.filter((g) => g.status !== "FINALIZED"),
    [games]
  );

  const totals = useMemo(() => {
    const totalSessions = sessionMetrics.length;
    const winningSessions = sessionMetrics.filter((s) => s.session_total > 0).length;
    const losingSessions = sessionMetrics.filter((s) => s.session_total < 0).length;
    const pushSessions = sessionMetrics.filter((s) => s.session_total === 0).length;

    const totalMoney = sessionMetrics.reduce((sum, s) => sum + s.session_total, 0);
    const totalHands = sessionMetrics.reduce((sum, s) => sum + s.hands_played, 0);
    const handsWon = sessionMetrics.reduce((sum, s) => sum + s.hands_won, 0);
    const handsLost = sessionMetrics.reduce((sum, s) => sum + s.hands_lost, 0);
    const handsPush = sessionMetrics.reduce((sum, s) => sum + s.hands_push, 0);

    const totalCards = sessionMetrics.reduce((sum, s) => sum + s.cards_played, 0);
    const cardsWon = sessionMetrics.reduce((sum, s) => sum + s.cards_won, 0);
    const cardsLost = sessionMetrics.reduce((sum, s) => sum + s.cards_lost, 0);

    const bestSession =
      sessionMetrics.length > 0
        ? Math.max(...sessionMetrics.map((s) => s.session_total))
        : 0;

    const worstSession =
      sessionMetrics.length > 0
        ? Math.min(...sessionMetrics.map((s) => s.session_total))
        : 0;

    return {
      totalSessions,
      winningSessions,
      losingSessions,
      pushSessions,
      totalMoney,
      totalHands,
      handsWon,
      handsLost,
      handsPush,
      totalCards,
      cardsWon,
      cardsLost,
      bestSession,
      worstSession,
      avgSession: totalSessions ? totalMoney / totalSessions : 0,
      avgHand: totalHands ? totalMoney / totalHands : 0,
      avgCard: totalCards ? totalMoney / totalCards : 0,
    };
  }, [sessionMetrics]);

  const roleTotals = useMemo(() => {
    const bidOwnerCards = sessionMetrics.reduce((sum, s) => sum + s.bid_owner_cards, 0);
    const bidOwnerWins = sessionMetrics.reduce((sum, s) => sum + s.bid_owner_wins, 0);
    const bidOwnerLosses = sessionMetrics.reduce((sum, s) => sum + s.bid_owner_losses, 0);
    const bidOwnerNet = sessionMetrics.reduce((sum, s) => sum + s.bid_owner_net, 0);

    const nonBidOwnerCards = sessionMetrics.reduce(
      (sum, s) => sum + s.non_bid_owner_cards,
      0
    );
    const nonBidOwnerWins = sessionMetrics.reduce(
      (sum, s) => sum + s.non_bid_owner_wins,
      0
    );
    const nonBidOwnerLosses = sessionMetrics.reduce(
      (sum, s) => sum + s.non_bid_owner_losses,
      0
    );
    const nonBidOwnerNet = sessionMetrics.reduce(
      (sum, s) => sum + s.non_bid_owner_net,
      0
    );

    const clubBidOwnerCards = sessionMetrics.reduce(
      (sum, s) => sum + s.club_bid_owner_cards,
      0
    );
    const clubBidOwnerWins = sessionMetrics.reduce(
      (sum, s) => sum + s.club_bid_owner_wins,
      0
    );
    const clubBidOwnerNet = sessionMetrics.reduce(
      (sum, s) => sum + s.club_bid_owner_net,
      0
    );

    const clubNonBidOwnerCards = sessionMetrics.reduce(
      (sum, s) => sum + s.club_non_bid_owner_cards,
      0
    );
    const clubNonBidOwnerWins = sessionMetrics.reduce(
      (sum, s) => sum + s.club_non_bid_owner_wins,
      0
    );
    const clubNonBidOwnerNet = sessionMetrics.reduce(
      (sum, s) => sum + s.club_non_bid_owner_net,
      0
    );

    return {
      bidOwnerCards,
      bidOwnerWins,
      bidOwnerLosses,
      bidOwnerNet,
      bidOwnerWinPct: bidOwnerCards ? (bidOwnerWins / bidOwnerCards) * 100 : 0,
      bidOwnerAvg: bidOwnerCards ? bidOwnerNet / bidOwnerCards : 0,

      nonBidOwnerCards,
      nonBidOwnerWins,
      nonBidOwnerLosses,
      nonBidOwnerNet,
      nonBidOwnerWinPct: nonBidOwnerCards
        ? (nonBidOwnerWins / nonBidOwnerCards) * 100
        : 0,
      nonBidOwnerAvg: nonBidOwnerCards ? nonBidOwnerNet / nonBidOwnerCards : 0,

      clubBidOwnerCards,
      clubBidOwnerWins,
      clubBidOwnerNet,
      clubBidOwnerWinPct: clubBidOwnerCards
        ? (clubBidOwnerWins / clubBidOwnerCards) * 100
        : 0,
      clubBidOwnerAvg: clubBidOwnerCards
        ? clubBidOwnerNet / clubBidOwnerCards
        : 0,

      clubNonBidOwnerCards,
      clubNonBidOwnerWins,
      clubNonBidOwnerNet,
      clubNonBidOwnerWinPct: clubNonBidOwnerCards
        ? (clubNonBidOwnerWins / clubNonBidOwnerCards) * 100
        : 0,
      clubNonBidOwnerAvg: clubNonBidOwnerCards
        ? clubNonBidOwnerNet / clubNonBidOwnerCards
        : 0,

      aggressionRate:
        totals.totalCards > 0 ? (bidOwnerCards / totals.totalCards) * 100 : 0,
    };
  }, [sessionMetrics, totals.totalCards]);

  const monthlyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        month: string;
        sessions: number;
        money: number;
        hands: number;
        wonSessions: number;
      }
    >();

    for (const s of sessionMetrics) {
      const key = getMonthKey(s.finalized_at);
      if (!key) continue;

      const existing = map.get(key) || {
        month: key,
        sessions: 0,
        money: 0,
        hands: 0,
        wonSessions: 0,
      };

      existing.sessions += 1;
      existing.money += s.session_total;
      existing.hands += s.hands_played;
      if (s.session_total > 0) existing.wonSessions += 1;

      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
  }, [sessionMetrics]);

  const yearlyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        year: string;
        sessions: number;
        money: number;
        hands: number;
        wonSessions: number;
      }
    >();

    for (const s of sessionMetrics) {
      const key = getYearKey(s.finalized_at);
      if (!key) continue;

      const existing = map.get(key) || {
        year: key,
        sessions: 0,
        money: 0,
        hands: 0,
        wonSessions: 0,
      };

      existing.sessions += 1;
      existing.money += s.session_total;
      existing.hands += s.hands_played;
      if (s.session_total > 0) existing.wonSessions += 1;

      map.set(key, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.year.localeCompare(a.year));
  }, [sessionMetrics]);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Player Metrics
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            My Metrics
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Personal performance across completed sessions, hands, cards, and
            role-specific decision stats.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="lp-card">
          <div className="text-lg font-semibold text-white">Loading metrics...</div>
          <div className="mt-2 text-sm text-slate-400">
            Pulling your completed sessions and calculating stats.
          </div>
        </div>
      ) : (
        <>
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Completed Sessions</div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {totals.totalSessions}
              </div>
            </div>

            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Total Money</div>
              <div className={`mt-2 text-3xl font-extrabold ${amountClass(totals.totalMoney)}`}>
                {money(totals.totalMoney)}
              </div>
            </div>

            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Winning Sessions %</div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {pct(totals.winningSessions, totals.totalSessions)}
              </div>
            </div>

            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Average / Session</div>
              <div className={`mt-2 text-3xl font-extrabold ${amountClass(totals.avgSession)}`}>
                {money(totals.avgSession)}
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="lp-card">
              <div className="text-sm text-slate-400">Hands</div>
              <div className="mt-3 text-2xl font-bold text-white">{totals.totalHands}</div>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <div>Won: {totals.handsWon}</div>
                <div>Lost: {totals.handsLost}</div>
                <div>Push: {totals.handsPush}</div>
                <div>Win %: {pct(totals.handsWon, totals.totalHands)}</div>
              </div>
            </div>

            <div className="lp-card">
              <div className="text-sm text-slate-400">Cards</div>
              <div className="mt-3 text-2xl font-bold text-white">{totals.totalCards}</div>
              <div className="mt-3 space-y-1 text-sm text-slate-300">
                <div>Won: {totals.cardsWon}</div>
                <div>Lost: {totals.cardsLost}</div>
                <div>Win %: {pct(totals.cardsWon, totals.totalCards)}</div>
              </div>
            </div>

            <div className="lp-card">
              <div className="text-sm text-slate-400">Best Session</div>
              <div className={`mt-3 text-2xl font-bold ${amountClass(totals.bestSession)}`}>
                {money(totals.bestSession)}
              </div>
              <div className="mt-3 text-sm text-slate-300">
                Your biggest completed-session result.
              </div>
            </div>

            <div className="lp-card">
              <div className="text-sm text-slate-400">Worst Session</div>
              <div className={`mt-3 text-2xl font-bold ${amountClass(totals.worstSession)}`}>
                {money(totals.worstSession)}
              </div>
              <div className="mt-3 text-sm text-slate-300">
                Your roughest completed-session result.
              </div>
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-white">Role Performance</h2>
              <p className="mt-1 text-sm text-slate-400">
                How you perform as the bid owner versus when you are not the bid owner.
                Club averages are based on finalized sessions included in your history.
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <div className="lp-card">
                <div className="text-sm text-slate-400">As Bid Owner</div>
                <div className="mt-3 text-2xl font-bold text-white">
                  {roleTotals.bidOwnerCards} cards
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div>Wins: {roleTotals.bidOwnerWins}</div>
                  <div>Losses: {roleTotals.bidOwnerLosses}</div>
                  <div>Win %: {pct(roleTotals.bidOwnerWins, roleTotals.bidOwnerCards)}</div>
                  <div className={amountClass(roleTotals.bidOwnerNet)}>
                    Net: {money(roleTotals.bidOwnerNet)}
                  </div>
                  <div className={amountClass(roleTotals.bidOwnerAvg)}>
                    Avg / Bid Owner Card: {money(roleTotals.bidOwnerAvg)}
                  </div>
                  <div>
                    Club Avg Win %: {roleTotals.clubBidOwnerWinPct.toFixed(1)}%
                  </div>
                  <div
                    className={amountClass(
                      roleTotals.bidOwnerWinPct - roleTotals.clubBidOwnerWinPct
                    )}
                  >
                    Delta vs Club:{" "}
                    {(roleTotals.bidOwnerWinPct - roleTotals.clubBidOwnerWinPct).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="lp-card">
                <div className="text-sm text-slate-400">As Non-Bid-Owner</div>
                <div className="mt-3 text-2xl font-bold text-white">
                  {roleTotals.nonBidOwnerCards} cards
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div>Wins: {roleTotals.nonBidOwnerWins}</div>
                  <div>Losses: {roleTotals.nonBidOwnerLosses}</div>
                  <div>
                    Win %: {pct(roleTotals.nonBidOwnerWins, roleTotals.nonBidOwnerCards)}
                  </div>
                  <div className={amountClass(roleTotals.nonBidOwnerNet)}>
                    Net: {money(roleTotals.nonBidOwnerNet)}
                  </div>
                  <div className={amountClass(roleTotals.nonBidOwnerAvg)}>
                    Avg / Non-Bid-Owner Card: {money(roleTotals.nonBidOwnerAvg)}
                  </div>
                  <div>
                    Club Avg Win %: {roleTotals.clubNonBidOwnerWinPct.toFixed(1)}%
                  </div>
                  <div
                    className={amountClass(
                      roleTotals.nonBidOwnerWinPct - roleTotals.clubNonBidOwnerWinPct
                    )}
                  >
                    Delta vs Club:{" "}
                    {(roleTotals.nonBidOwnerWinPct - roleTotals.clubNonBidOwnerWinPct).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="lp-card">
                <div className="text-sm text-slate-400">Player Style</div>
                <div className="mt-3 text-2xl font-bold text-white">
                  {roleTotals.aggressionRate.toFixed(1)}%
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Aggression Rate (how often you are the bid owner)
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <div>
                    Profit from Bid Owner Role: {money(roleTotals.bidOwnerNet)}
                  </div>
                  <div>
                    Profit from Non-Bid-Owner Role: {money(roleTotals.nonBidOwnerNet)}
                  </div>
                  <div className="text-slate-400">
                    {roleTotals.bidOwnerNet > roleTotals.nonBidOwnerNet
                      ? "You currently make more money as the bid owner."
                      : roleTotals.nonBidOwnerNet > roleTotals.bidOwnerNet
                      ? "You currently make more money when beating bid owners."
                      : "Your profits are currently balanced across both roles."}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid gap-6 xl:grid-cols-2">
            <div className="lp-card">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Monthly Breakdown</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Session volume, money, and win rate by month.
                </p>
              </div>

              {monthlyBreakdown.length === 0 ? (
                <div className="lp-card-soft text-slate-300">
                  No completed-session history yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-4 py-3 text-left">Month</th>
                        <th className="px-4 py-3 text-right">Sessions</th>
                        <th className="px-4 py-3 text-right">Win %</th>
                        <th className="px-4 py-3 text-right">Money</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyBreakdown.map((row) => (
                        <tr key={row.month} className="border-t border-white/5">
                          <td className="px-4 py-3 text-white">{row.month}</td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            {row.sessions}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            {pct(row.wonSessions, row.sessions)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${amountClass(
                              row.money
                            )}`}
                          >
                            {money(row.money)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="lp-card">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">Yearly Breakdown</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Long-term performance summary by year.
                </p>
              </div>

              {yearlyBreakdown.length === 0 ? (
                <div className="lp-card-soft text-slate-300">
                  No yearly history yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-4 py-3 text-left">Year</th>
                        <th className="px-4 py-3 text-right">Sessions</th>
                        <th className="px-4 py-3 text-right">Win %</th>
                        <th className="px-4 py-3 text-right">Money</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyBreakdown.map((row) => (
                        <tr key={row.year} className="border-t border-white/5">
                          <td className="px-4 py-3 text-white">{row.year}</td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            {row.sessions}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-300">
                            {pct(row.wonSessions, row.sessions)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${amountClass(
                              row.money
                            )}`}
                          >
                            {money(row.money)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="lp-card">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Completed Session Log</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Your finalized sessions and how you performed in each one.
                </p>
              </div>

              <div className="lp-badge">
                {sessionMetrics.length} Session{sessionMetrics.length === 1 ? "" : "s"}
              </div>
            </div>

            {sessionMetrics.length === 0 ? (
              <div className="lp-card-soft">
                <div className="text-lg font-semibold text-white">
                  No completed sessions yet
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Once a session is finalized, it will appear here and count toward
                  your metrics.
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {sessionMetrics
                  .slice()
                  .sort((a, b) => {
                    const ad = a.finalized_at ? new Date(a.finalized_at).getTime() : 0;
                    const bd = b.finalized_at ? new Date(b.finalized_at).getTime() : 0;
                    return bd - ad;
                  })
                  .map((s) => (
                    <Link
                      key={s.game_id}
                      href={`/games/${s.game_id}/scoreboard`}
                      className="lp-card-soft hover:opacity-90"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-white">
                            {s.title}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {s.finalized_at || "Finalized"} • {s.settlement_mode} •{" "}
                            {s.cards_per_hand} cards per hand
                          </div>
                          <div className="mt-2 text-sm text-slate-300">
                            Hands: {s.hands_played} • Hand Win %:{" "}
                            {pct(s.hands_won, s.hands_played)} • Cards: {s.cards_played}
                          </div>
                          <div className="mt-1 text-sm text-slate-300">
                            Bid Owner Win %: {pct(s.bid_owner_wins, s.bid_owner_cards)} •
                            Non-Bid-Owner Win %:{" "}
                            {pct(s.non_bid_owner_wins, s.non_bid_owner_cards)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-xl font-bold ${amountClass(s.session_total)}`}
                          >
                            {money(s.session_total)}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-300">
                            View Scoreboard →
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Current Active Games</div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {activeGames.length}
              </div>
            </div>

            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Finalized Games Found</div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {finalizedGames.length}
              </div>
            </div>

            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Average / Hand</div>
              <div className={`mt-2 text-3xl font-extrabold ${amountClass(totals.avgHand)}`}>
                {money(totals.avgHand)}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}