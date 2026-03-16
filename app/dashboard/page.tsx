"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";

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
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeGames = games.filter((g) => g.status !== "FINALIZED");
  const pastGames = games.filter((g) => g.status === "FINALIZED");

  useEffect(() => {
    if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) return;

    const run = async () => {
      try {
        setError(null);

        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) {
          throw new Error("Signed-in user does not have a primary email");
        }

        const syncRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/sync`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              display_name:
                user.fullName ||
                user.username ||
                user.firstName ||
                "Player",
            }),
          }
        );

        const syncData = await syncRes.json();

        if (!syncRes.ok) {
          throw new Error(syncData?.detail || "Failed to sync user");
        }

        setAppUser(syncData);

        const gamesRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/games/my?user_id=${syncData.id}`,
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
  }, [isLoaded, user]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              Liar&apos;s Poker Dashboard
            </h1>
            <p className="mt-2 text-slate-300">
              Welcome {appUser?.display_name || "back"}
            </p>
          </div>
          <UserButton />
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Link href="/games/new" className="lp-card hover:opacity-90">
            <div className="text-lg font-bold text-white">Create Game</div>
            <div className="mt-2 text-sm text-slate-400">
              Start a new table with your saved rules or a custom setup.
            </div>
          </Link>

          <div className="lp-card">
            <div className="text-lg font-bold text-white">My Active Games</div>
            <div className="mt-2 text-sm text-slate-400">
              View games you created, scorekeep, or joined.
            </div>
          </div>

          <div className="lp-card">
            <div className="text-lg font-bold text-white">Past Games</div>
            <div className="mt-2 text-sm text-slate-400">
              Review finalized sessions and scoreboards.
            </div>
          </div>

          <Link href="/info" className="lp-card hover:opacity-90">
            <div className="text-lg font-bold text-white">Rules / Info</div>
            <div className="mt-2 text-sm text-slate-400">
              Review gameplay rules, options, and scoring behavior.
            </div>
          </Link>
        </div>

        <section className="mt-8 lp-card">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Active Games</h2>
            <p className="mt-1 text-sm text-slate-400">
              Games you created, scorekeep, or joined that are still in progress.
            </p>
          </div>

          {loadingGames ? (
            <div className="text-slate-400">Loading games...</div>
          ) : activeGames.length === 0 ? (
            <div className="text-slate-400">No active games.</div>
          ) : (
            <div className="grid gap-3">
              {activeGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="lp-card-soft hover:opacity-90"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {game.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {game.settlement_mode} • {game.cards_per_hand} cards • $
                        {game.base_bet}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-300">
                      Open Table →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 lp-card">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Past Games</h2>
            <p className="mt-1 text-sm text-slate-400">
              Finalized sessions and completed scoreboards.
            </p>
          </div>

          {loadingGames ? (
            <div className="text-slate-400">Loading games...</div>
          ) : pastGames.length === 0 ? (
            <div className="text-slate-400">No past games yet.</div>
          ) : (
            <div className="grid gap-3">
              {pastGames.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}/scoreboard`}
                  className="lp-card-soft hover:opacity-90"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-white">
                        {game.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {game.settlement_mode} • {game.cards_per_hand} cards • $
                        {game.base_bet}
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
      </div>
    </main>
  );
}