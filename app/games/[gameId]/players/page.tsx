import AddPlayersClient from "./AddPlayersClient"

type User = {
  id: string
  email: string
  display_name: string
}

type Player = {
  id: string
  display_name: string
}

async function getUsers() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/users`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<User[]>
}

async function getGamePlayers(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}/players`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ game_id: string; players: Player[] }>
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

export default async function Page({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params

  if (!gameId || !isUuid(gameId)) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <h1>Add Players</h1>
        <p>Invalid game id.</p>
      </main>
    )
  }

  const [users, gamePlayers] = await Promise.all([
    getUsers(),
    getGamePlayers(gameId),
  ])

  return (
    <main style={{ padding: 24, maxWidth: 950, margin: "0 auto" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>
        Add Players
      </h1>

      <div style={{ opacity: 0.75, marginBottom: 18 }}>
        Game: <code>{gameId}</code>
      </div>
      
      <div style={{ marginBottom: 12, opacity: 0.7 }}>
        Users loaded: {users.length} | Current roster: {gamePlayers.players.length}
      </div>

      <AddPlayersClient
        gameId={gameId}
        users={users}
        currentPlayers={players}
        appUserId={game.scorekeeper_user_id}
      />
    </main>
  )
}