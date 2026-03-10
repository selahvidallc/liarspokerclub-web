import NewPlayerClient from "./NewPlayerClient"

export default function Page() {
  return (
    <main style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>
        Create New Player
      </h1>

      <NewPlayerClient />
    </main>
  )
}