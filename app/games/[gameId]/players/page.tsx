import { currentUser } from "@clerk/nextjs/server"
import AddPlayersClient from "./AddPlayersClient"

type User = {
  id: string
  email: string
  display_name: string
}

type Player = {
  id: string
  display_name: string
  is_active?: boolean
}

type Game = {
  id: string
  scorekeeper_user_id: string
}

type SyncResult = {
  id: string
  email: string
  display_name: string
  created: boolean
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

async function getGame(gameId: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const res = await fetch(`${base}/games/${gameId}`, { cache: "no-store" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<Game>
}

async function syncSignedInAppUser(): Promise<SyncResult> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8610"
  const clerkUser = await currentUser()

  const email = clerkUser?.emailAddresses?.[0]?.emailAddress
  const displayName =
    clerkUser?.fullName ||
    clerkUser?.username ||
    clerkUser?.firstName ||
    "Player"

  if (!email) {
    throw new Error("No signed-in user email found.")
  }

  const res = await fetch(`${base}/users/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      email,
      display_name: displayName,
    }),
  })

  if (!res.ok) {
    throw new Error(await res.text())
  }

  return res.json() as Promise<SyncResult>
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

  const [users, gamePlayers, game, appUser] = await Promise.all([
    getUsers(),
    getGamePlayers(gameId),
    getGame(gameId),
    syncSignedInAppUser(),
  ])

  const isScorekeeper = appUser.id === game.scorekeeper_user_id

  return (
    <AddPlayersClient
      gameId={gameId}
      users={users}
      currentPlayers={gamePlayers.players}
      appUserId={appUser.id}
      isScorekeeper={isScorekeeper}
    />
  )
}