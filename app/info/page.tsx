type InfoPageProps = {
  searchParams?: Promise<{
    gameId?: string
  }>
}

export default async function Page({ searchParams }: InfoPageProps) {
  const sp = await searchParams
  const gameId = sp?.gameId?.trim()

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Game Guide
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Liar&apos;s Poker Information
        </h1>

        <p className="mt-3 max-w-3xl text-base text-slate-300">
          Liar&apos;s Poker is a bluffing and strategy game played using the
          eight-digit serial numbers on U.S. dollar bills. Players bid on the
          total frequency of specific digits appearing across all bills in play.
        </p>
      </div>

      <div className="grid gap-6">
        <section className="lp-card">
          <h2 className="mb-4 text-2xl font-bold text-white">Core Setup</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Participants</div>
              <div className="mt-1 font-semibold text-slate-100">
                2 to 10+ players
              </div>
            </div>

            <div className="lp-card-soft">
              <div className="text-sm text-slate-400">Ranking Style</div>
              <div className="mt-1 font-semibold text-slate-100">
                2 low, 9 high, 0 as 10, 1 as Ace
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4 text-slate-300">
            <p>
              <strong className="text-white">Card:</strong> In this app, one
              dollar bill is called a <strong className="text-white">card</strong>.
              Each player uses one random dollar bill and keeps its serial
              number hidden from others. Only the eight numerical digits are
              used; letters and symbols are ignored.
            </p>

            <p>
              <strong className="text-white">Hand:</strong> In this app, a{" "}
              <strong className="text-white">hand</strong> is one full bidding
              round using all cards currently in play.
            </p>

            <p>
              <strong className="text-white">Session:</strong> A{" "}
              <strong className="text-white">session</strong> is one or more
              hands played together. A session can be settled hand-by-hand or
              settled cumulatively at the end.
            </p>
          </div>
        </section>

        <section className="lp-card">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Gameplay &amp; Bidding
          </h2>

          <div className="space-y-4 text-slate-300">
            <p>
              <strong className="text-white">Opening Bid:</strong> The first
              player predicts how many times a specific digit appears across all
              cards in the hand. For example, <em>“four fives”</em> means there
              are at least four 5s total.
            </p>

            <p>
              <strong className="text-white">Turn Progression:</strong> Play
              moves clockwise. Each subsequent player must either raise the bid
              or challenge the previous bidder.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="lp-card-soft">
              <h3 className="mb-2 text-lg font-bold text-white">Raise the Bid</h3>
              <p className="text-slate-300">
                Call a higher quantity of any digit, or the same quantity of a
                higher-ranked digit. Example: <em>“five 2s”</em> beats{" "}
                <em>“four fives”</em>, and <em>“four 6s”</em> beats{" "}
                <em>“four fives.”</em>
              </p>
            </div>

            <div className="lp-card-soft">
              <h3 className="mb-2 text-lg font-bold text-white">Challenge</h3>
              <p className="text-slate-300">
                Call out the previous bidder if you believe the bid is a bluff.
                This triggers the reveal and settlement of that hand.
              </p>
            </div>
          </div>

          <div className="mt-5 lp-card-soft">
            <h3 className="mb-2 text-lg font-bold text-white">The Showdown</h3>
            <div className="space-y-3 text-slate-300">
              <p>
                When a bid is challenged, all players reveal their cards and
                count the occurrences of the bid digit.
              </p>

              <ul className="list-disc space-y-2 pl-5">
                <li>
                  If the bid is correct and the total count equals or exceeds
                  the bid, the challenger loses and pays the bidder.
                </li>
                <li>
                  If the bid is incorrect and the count is lower than the bid,
                  the bidder loses and pays the challenger.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-card">
          <h2 className="mb-4 text-2xl font-bold text-white">
            How This App Uses the Terms
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table>
              <thead>
                <tr className="bg-white/5">
                  <th className="px-4 py-3 text-left">Game Term</th>
                  <th className="px-4 py-3 text-left">Meaning in This App</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-4 font-semibold text-white">Card</td>
                  <td className="px-4 py-4 text-slate-300">
                    One dollar bill / one serial number
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-semibold text-white">Hand</td>
                  <td className="px-4 py-4 text-slate-300">
                    One full bidding / reveal cycle using all cards in play
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-semibold text-white">Session</td>
                  <td className="px-4 py-4 text-slate-300">
                    One or more hands played together
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-semibold text-white">
                    Settlement Mode
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    Per Hand or Cumulative Session (“Cum Cum”)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="lp-card">
          <h2 className="mb-4 text-2xl font-bold text-white">
            Settlement Modes
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="lp-card-soft">
              <h3 className="mb-2 text-lg font-bold text-white">Per Hand</h3>
              <p className="text-slate-300">
                Each hand is effectively settled immediately after the outcome
                is entered.
              </p>
            </div>

            <div className="lp-card-soft">
              <h3 className="mb-2 text-lg font-bold text-white">
                Cumulative Session (“Cum Cum”)
              </h3>
              <p className="text-slate-300">
                All hands in the session are tracked, and the net winnings or
                losses are settled when the session is finalized.
              </p>
            </div>
          </div>
        </section>

        <section className="lp-card">
          <h2 className="mb-4 text-2xl font-bold text-white">App Notes</h2>

          <div className="lp-card-soft">
            <ul className="list-disc space-y-2 pl-5 text-slate-300">
              <li>
                This app tracks outcomes as bidder wins / bidder loses and
                converts them into money won or lost across players.
              </li>
              <li>
                Scoreboards show players down the left side, with hand-by-hand
                results across the top.
              </li>
              <li>
                Hand totals should balance to <strong className="text-white">$0.00</strong>{" "}
                for each hand.
              </li>
              <li>
                Session totals should also net to{" "}
                <strong className="text-white">$0.00</strong>.
              </li>
            </ul>
          </div>
        </section>

        <section className="lp-card">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Quick Links</h2>
            <p className="mt-1 text-sm text-slate-400">
              Jump back into the game flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/games/new"
              className="lp-button inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Create New Game
            </a>

            <a
              href="/players/new"
              className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
            >
              Create Player
            </a>

            {gameId && (
              <>
                <a
                  href={`/games/${gameId}/scoreboard`}
                  className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
                >
                  Scoreboard
                </a>

                <a
                  href={`/games/${gameId}`}
                  className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
                >
                  Back to Table
                </a>
                <a
                  href="/dashboard"
                  className="lp-button-secondary inline-flex items-center rounded-xl px-4 py-2.5 font-semibold"
                >
                  Dashboard
                </a>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}