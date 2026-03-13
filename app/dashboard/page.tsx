"use client";

import { useEffect, useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    if (!isLoaded || !user?.primaryEmailAddress?.emailAddress) return;

    const run = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/users/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.primaryEmailAddress.emailAddress,
            display_name:
              user.fullName ||
              user.username ||
              user.firstName ||
              "Player",
          }),
        }
      );

      const data = await res.json();
      setSyncResult(data);
    };

    run();
  }, [isLoaded, user]);

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Liar&apos;s Poker Dashboard</h1>
          <UserButton />
        </div>

        <p className="mt-6">Authentication is working.</p>

        {syncResult && (
          <pre className="mt-4 rounded bg-black/20 p-4 text-sm">
            {JSON.stringify(syncResult, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}