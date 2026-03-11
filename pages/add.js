import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function AddTournament() {
  const router = useRouter()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [date, setDate] = useState("")
  const [room, setRoom] = useState("")
  const [buyin, setBuyin] = useState("")
  const [gains, setGains] = useState("")
  const [position, setPosition] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        router.push("/login")
        return
      }

      setCurrentUser(session.user)
      setSessionChecked(true)
    }

    checkSession()
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      alert("Utilisateur non connecté")
      setLoading(false)
      router.push("/login")
      return
    }

    const buyinNumber = Number(buyin) || 0
    const gainsNumber = Number(gains) || 0
    const profit = gainsNumber - buyinNumber

    const { error } = await supabase.from("tournois").insert([
      {
        date,
        room,
        buyin: buyinNumber,
        gains: gainsNumber,
        profit,
        position: position ? Number(position) : null,
        user_id: user.id
      }
    ])

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    alert("Tournoi ajouté")
    router.push("/history")
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (!sessionChecked) {
    return (
      <div className="page">
        <div className="container">
          <div className="card">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">PT</div>
            <div className="brand-text">
              <div className="brand-title">Ajouter un tournoi</div>
              <div className="brand-subtitle">
                {currentUser?.email ? `Connectée : ${currentUser.email}` : ""}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/">
              <button className="btn btn-secondary">Dashboard</button>
            </Link>
            <Link href="/history">
              <button className="btn btn-secondary">Historique</button>
            </Link>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>

        <div className="hero" style={{ marginBottom: 20 }}>
          <div className="hero-grid">
            <div>
              <h1 className="hero-title">Enregistrer un tournoi</h1>
              <p className="hero-subtitle">
                Chaque entrée sera automatiquement rattachée au compte connecté.
              </p>

              <div className="hero-badges">
                <div className="badge">Sécurisé</div>
                <div className="badge">Multi-utilisateur</div>
                <div className="badge">Profit auto-calculé</div>
              </div>
            </div>

            <div className="hero-side">
              <div className="hero-side-card">
                <div className="hero-side-label">Room</div>
                <div className="hero-side-value">{room || "-"}</div>
              </div>
              <div className="hero-side-card">
                <div className="hero-side-label">Buy-in</div>
                <div className="hero-side-value">{buyin || 0} €</div>
              </div>
              <div className="hero-side-card">
                <div className="hero-side-label">Gains</div>
                <div className="hero-side-value">{gains || 0} €</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Formulaire tournoi</h2>

          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Room</label>
              <input
                className="input"
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Ex : Winamax"
                required
              />
            </div>

            <div>
              <label className="label">Buy-in</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={buyin}
                onChange={(e) => setBuyin(e.target.value)}
                placeholder="Ex : 5"
                required
              />
            </div>

            <div>
              <label className="label">Gains</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={gains}
                onChange={(e) => setGains(e.target.value)}
                placeholder="Ex : 27"
                required
              />
            </div>

            <div>
              <label className="label">Position</label>
              <input
                className="input"
                type="number"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ex : 4"
              />
            </div>

            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer le tournoi"}
              </button>

              <Link href="/history">
                <button type="button" className="btn btn-secondary">
                  Voir l’historique
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}