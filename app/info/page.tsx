import Link from "next/link"

export default function InfoPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Information
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Liar&apos;s Poker Club
        </h1>

        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          A scorekeeping and game-management tool for social Liar&apos;s Poker play.
        </p>
      </div>

      <section className="lp-card mb-6 border border-amber-400/30 bg-amber-400/10">
        <h2 className="text-xl font-bold text-white">Important Notice</h2>

        <p className="mt-3 text-sm leading-6 text-slate-200">
          Liar&apos;s Poker Club is a digital scorekeeping, game-management, and
          statistics tool. The application does not facilitate gambling, accept
          wagers, hold funds, process payments, escrow money, or settle debts
          between players.
        </p>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          Any gameplay, rules, stakes, payments, or exchanges between participants
          occur outside of this application and are solely the responsibility of
          the users. Users are responsible for following all applicable local laws
          and regulations.
        </p>
      </section>

      <section className="lp-card mb-6">
        <h2 className="text-xl font-bold text-white">What This App Does</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="lp-card-soft">
            <h3 className="font-bold text-white">Scorekeeping</h3>
            <p className="mt-2 text-sm text-slate-400">
              Track each hand, card, bid owner, winner, loser, and amount for a
              game.
            </p>
          </div>

          <div className="lp-card-soft">
            <h3 className="font-bold text-white">Player Totals</h3>
            <p className="mt-2 text-sm text-slate-400">
              View running score totals, hand-by-hand results, and session
              summaries.
            </p>
          </div>

          <div className="lp-card-soft">
            <h3 className="font-bold text-white">Game Setup</h3>
            <p className="mt-2 text-sm text-slate-400">
              Manage players, hand type, card count, base amount, nut/skunk
              settings, and presets.
            </p>
          </div>

          <div className="lp-card-soft">
            <h3 className="font-bold text-white">Metrics</h3>
            <p className="mt-2 text-sm text-slate-400">
              Review player performance, bid-owner outcomes, non-bid-owner
              results, and historical game activity.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-card mb-6">
        <h2 className="text-xl font-bold text-white">Roles</h2>

        <div className="mt-4 space-y-4">
          <div className="lp-card-soft">
            <h3 className="font-bold text-white">Player</h3>
            <p className="mt-2 text-sm text-slate-400">
              Players can view scoreboards and their own metrics. Players do not
              score cards, edit games, add players, or finalize sessions.
            </p>
          </div>

          <div className="lp-card-soft">
            <h3 className="font-bold text-white">Scorekeeper</h3>
            <p className="mt-2 text-sm text-slate-400">
              The assigned scorekeeper for a game can score cards, change the next
              hand setup, add or remove players for future hands, edit card
              results, and finalize the session.
            </p>
          </div>

          <div className="lp-card-soft">
            <h3 className="font-bold text-white">Club Admin / Super Admin</h3>
            <p className="mt-2 text-sm text-slate-400">
              Admin users can manage users, roles, game history, player metrics,
              and administrative cleanup.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-card mb-6">
        <h2 className="text-xl font-bold text-white">Game Integrity</h2>

        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <li>
            <strong className="text-white">Finalized sessions are locked.</strong>{" "}
            Once a game is finalized, scoring should no longer be changed through
            normal scorer controls.
          </li>
          <li>
            <strong className="text-white">Only the assigned scorekeeper can score.</strong>{" "}
            A user&apos;s role may allow scoring access, but the active game still
            belongs to its assigned scorekeeper.
          </li>
          <li>
            <strong className="text-white">The scoreboard is the source of truth.</strong>{" "}
            After each card is scored, players should validate the result on the
            scoreboard.
          </li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className="lp-button">
          Back to Dashboard
        </Link>

        <Link href="/metrics" className="lp-button-secondary">
          My Metrics
        </Link>
      </div>
    </main>
  )
}