import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Liar&apos;s Poker Dashboard</h1>
          <UserButton />
        </div>

        <p className="mt-6">Authentication is working.</p>
      </div>
    </main>
  );
}