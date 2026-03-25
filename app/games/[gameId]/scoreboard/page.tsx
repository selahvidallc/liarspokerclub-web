import ScoreboardClient from "./ScoreboardClient";

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

type SessionScoreboardResponse = {
  game_id: string;
  hands: any[];
  hand_summary: any[];
  session_summary: any[];
};

async function getHandProgress(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";
  const res = await fetch(`${base}/games/${gameId}/hand-progress`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return null as HandProgress | null;
  }

  return res.json() as Promise<HandProgress | null>;
}

async function getGame(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";
  const res = await fetch(`${base}/games/${gameId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Game fetch failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<Game>;
}

async function getGamePlayers(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";
  const res = await fetch(`${base}/games/${gameId}/players`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Game players fetch failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{
    game_id: string;
    players: { id: string; display_name: string }[];
  }>;
}

async function getScoreboardSession(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610";
  const res = await fetch(`${base}/games/${gameId}/scoreboard/session`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scoreboard session fetch failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<SessionScoreboardResponse>;
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  if (!gameId || !isUuid(gameId)) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Scoreboard
        </h1>
        <p className="mt-4 text-slate-300">Invalid game id.</p>
      </main>
    );
  }

  const [data, progress, game, playersResp] = await Promise.all([
    getScoreboardSession(gameId),
    getHandProgress(gameId),
    getGame(gameId),
    getGamePlayers(gameId),
  ]);

  return (
    <ScoreboardClient
      gameId={gameId}
      data={data}
      progress={progress}
      game={game}
      players={playersResp.players}
    />
  );
}