"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { canAccessAdmin, canCreateGame, canScore } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";


type AppUser = {
  id: string;
  email: string;
  display_name: string;
  role: AppRole;
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

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notAuthorized, setNotAuthorized] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";

  const activeGames = useMemo(
    () => games.filter((g) => g.status !== "FINALIZED"),
    [games]
  );

  const pastGames = useMemo(
    () => games.filter((g) => g.status === "FINALIZED"),
    [games]
  );

  const createdGamesCount = useMemo(() => {
    if (!appUser) return 0;
    return games.filter((g) => g.created_by_user_id === appUser.id).length;
  }, [games, appUser]);

  const scorekeepingCount = useMemo(() => {
    if (!appUser) return 0;
    return games.filter((g) => g.scorekeeper_user_id === appUser.id).length;
  }, [games, appUser]);

  useEffect(() => {
    if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) return;

    const run = async () => {
      try {
        setError(null);
        setNotAuthorized(false);

        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) {
          throw new Error("Signed-in user does not have a primary email");
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

        if (syncRes.status === 403) {
          setNotAuthorized(true);
          setAppUser(null);
          setGames([]);
          return;
        }

        if (!syncRes.ok) {
          throw new Error(syncData?.detail || "Failed to sync user");
        }

        setAppUser(syncData);

        const gamesRes = await fetch(
          `${API_BASE}/games/my?user_id=${syncData.id}`,
          { cache: "no-store" }
        );

        const gamesData = await gamesRes.json();

        if (!gamesRes.ok) {
          throw new Error(gamesData?.detail || "Failed to load games");
        }

        setGames(gamesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoadingGames(false);
      }
    };

    run();
  }, [API_BASE, isLoaded, user]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Dashboard
            </div>
            <h1 className="text-3xl font-semibold text-white">
              Welcome, {appUser?.display_name || "Player"}
            </h1>
            <p className="mt-2 text-slate-300">
              Open your games, review completed sessions, and track your club play.
            </p>
          </div>

          <UserButton />
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        {notAuthorized && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-100">
            <div className="text-lg font-semibold">Invite required</div>
            <div className="mt-2 text-sm text-amber-200/90">
              Your email authenticated successfully, but it has not been invited to
              Liar&apos;s Poker Club yet. Ask the scorekeeper or admin to add your
              email first.
            </div>
            <div className="mt-4">
              <SignOutButton>
                <button className="rounded-lg border border-amber-300/30 px-4 py-2 text-sm font-semibold hover:bg-white/10">
                  Sign out
                </button>
              </SignOutButton>
            </div>
          </div>
        )}

        {!notAuthorized && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {canCreateGame(appUser?.role) && (
                <Link href="/games/new" className="lp-card hover:opacity-90">
                  <div className="text-lg font-bold text-white">Create Game</div>
                  <div className="mt-2 text-sm text-slate-400">
                    Start a new table with your saved rules or a custom setup.
                  </div>
                </Link>
              )}

              <Link href="/metrics" className="lp-card hover:opacity-90">
                <div className="text-lg font-bold text-white">My Metrics</div>
                <div className="mt-2 text-sm text-slate-400">
                  Review win/loss trends, money performance, and long-term player
                  stats.
                </div>
              </Link>

              <Link href="/info" className="lp-card hover:opacity-90">
                <div className="text-lg font-bold text-white">Rules / Info</div>
                <div className="mt-2 text-sm text-slate-400">
                  Review gameplay rules, options, and scoring behavior.
                </div>
              </Link>
              <Link href="/profile" className="lp-card hover:opacity-90">
                <div className="text-lg font-bold text-white">My Profile</div>
                <div className="mt-2 text-sm text-slate-400">
                  Update your display name and review your account details.
                </div>
              </Link>

              {canAccessAdmin(appUser?.role) && (
                <Link href="/admin" className="lp-card hover:opacity-90">
                  <div className="text-lg font-bold text-white">Admin</div>
                  <div className="mt-2 text-sm text-slate-400">
                    Manage users, roles, and club access.
                  </div>
                </Link>
              )}              
            </section>

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Active Games</div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {loadingGames ? "—" : activeGames.length}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Past Games</div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {loadingGames ? "—" : pastGames.length}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Games Created</div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {loadingGames ? "—" : createdGamesCount}
                </div>
              </div>

              <div className="lp-card-soft">
                <div className="text-sm text-slate-400">Scorekeeping</div>
                <div className="mt-2 text-3xl font-extrabold text-white">
                  {loadingGames ? "—" : scorekeepingCount}
                </div>
              </div>
            </section>

            <section className="mt-8 lp-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Active Games</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Games you created, scorekeep, or were added to that are still
                    running.
                  </p>
                </div>

                <div className="lp-badge">
                  {loadingGames ? "Loading..." : `${activeGames.length} Active`}
                </div>
              </div>

              {loadingGames ? (
                <div className="text-slate-400">Loading games...</div>
              ) : activeGames.length === 0 ? (
                <div className="lp-card-soft">
                  <div className="text-lg font-semibold text-white">
                    No active games
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {canCreateGame(appUser?.role)
                      ? "Start a new table or wait until a scorekeeper adds you to one."
                      : "Wait until a scorekeeper adds you to a game."}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeGames.map((game) => (
                    <Link
                      key={game.id}
                      href={
                        canScore(appUser?.role)
                          ? `/games/${game.id}`
                          : `/games/${game.id}/scoreboard`
                      }
                      className="lp-card-soft hover:opacity-90"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-white">
                            {game.title}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {game.settlement_mode} • {game.cards_per_hand} cards • $
                            {Number(game.base_bet).toFixed(2)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-300">
                          {canScore(appUser?.role)
                            ? "Open Table →"
                            : "View Scoreboard →"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8 lp-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">Past Games</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Finalized sessions and completed scoreboards.
                  </p>
                </div>

                <div className="lp-badge-neutral inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                  {loadingGames ? "Loading..." : `${pastGames.length} Finalized`}
                </div>
              </div>

              {loadingGames ? (
                <div className="text-slate-400">Loading games...</div>
              ) : pastGames.length === 0 ? (
                <div className="lp-card-soft">
                  <div className="text-lg font-semibold text-white">
                    No past games yet
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    Finalized sessions will appear here for later review.
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pastGames.map((game) => (
                    <Link
                      key={game.id}
                      href={`/games/${game.id}/scoreboard`}
                      className="lp-card-soft hover:opacity-90"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-white">
                            {game.title}
                          </div>
                          <div className="mt-1 text-sm text-slate-400">
                            {game.settlement_mode} • {game.cards_per_hand} cards • $
                            {Number(game.base_bet).toFixed(2)}
                            {game.finalized_at
                              ? ` • Finalized ${game.finalized_at}`
                              : ""}
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-slate-300">
                          View Scoreboard →
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}