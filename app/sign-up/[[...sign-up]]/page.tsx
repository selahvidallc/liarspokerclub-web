export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="lp-card text-center max-w-md">
        <h1 className="text-2xl font-bold text-white">
          Account Invitation Required
        </h1>

        <p className="mt-3 text-slate-400">
          Accounts for Liar's Poker Club are created by the game organizer.
        </p>

        <p className="mt-2 text-slate-400">
          Ask the person running the game to add you.
        </p>
      </div>
    </main>
  );
}