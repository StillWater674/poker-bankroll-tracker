import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function Profile() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [pseudo, setPseudo] = useState("")
  const [stats, setStats] = useState(null)
  const [savingPseudo, setSavingPseudo] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    setUser(user)

    const initialPseudo =
      user.user_metadata?.pseudo || user.email?.split("@")[0] || "Player"

    setPseudo(initialPseudo)

    const { data: tournois, error: tournoisError } = await supabase
      .from("tournois")
      .select("*")
      .order("date", { ascending: true })

    if (tournoisError) {
      console.error("Erreur chargement tournois :", tournoisError)
      setStats({
        count: 0,
        profit: 0,
        buyins: 0,
        roi: 0,
        abi: 0,
        averageProfit: 0,
        duration: 0,
        eurHour: 0,
        bestRoom: "-",
        bestBuyin: "-"
      })
      return
    }

    calculateStats(tournois || [])
  }

  async function savePseudo() {
    if (!pseudo.trim()) {
      alert("Le pseudo ne peut pas être vide.")
      return
    }

    try {
      setSavingPseudo(true)

      const { error } = await supabase.auth.updateUser({
        data: {
          pseudo: pseudo.trim()
        }
      })

      if (error) {
        console.error("Erreur sauvegarde pseudo :", error)
        alert("Impossible d'enregistrer le pseudo.")
        return
      }

      setUser((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          user_metadata: {
            ...prev.user_metadata,
            pseudo: pseudo.trim()
          }
        }
      })

      alert("Pseudo sauvegardé.")
    } finally {
      setSavingPseudo(false)
    }
  }

  function calculateStats(tournois) {
    let profit = 0
    let buyins = 0
    let duration = 0

    const rooms = {}
    const buyinMap = {}

    tournois.forEach((t) => {
      const p = Number(t.profit) || 0
      const b = Number(t.buyin) || 0
      const d = Number(t.duration_minutes) || 0
      const room = t.room || "Inconnu"

      profit += p
      buyins += b
      duration += d

      if (!rooms[room]) {
        rooms[room] = { profit: 0 }
      }
      rooms[room].profit += p

      if (!buyinMap[b]) {
        buyinMap[b] = { profit: 0 }
      }
      buyinMap[b].profit += p
    })

    const count = tournois.length
    const abi = count > 0 ? buyins / count : 0
    const averageProfit = count > 0 ? profit / count : 0
    const roi = buyins > 0 ? (profit / buyins) * 100 : 0
    const eurHour = duration > 0 ? profit / (duration / 60) : 0

    const sortedRooms = Object.entries(rooms).sort(
      (a, b) => b[1].profit - a[1].profit
    )
    const bestRoom = sortedRooms[0]?.[0] || "-"

    const sortedBuyins = Object.entries(buyinMap).sort(
      (a, b) => b[1].profit - a[1].profit
    )
    const bestBuyin = sortedBuyins[0]?.[0] || "-"

    setStats({
      count,
      profit,
      buyins,
      roi,
      abi,
      averageProfit,
      duration,
      eurHour,
      bestRoom,
      bestBuyin
    })
  }

  function formatHours(minutes) {
    const totalMinutes = Number(minutes) || 0
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60

    if (hours <= 0) return `${mins} min`
    return `${hours}h ${mins}min`
  }

  function getLevelLabel(roi) {
    if (roi >= 100) return "Crusher"
    if (roi >= 40) return "Grinder solide"
    if (roi >= 10) return "En progression"
    if (roi >= 0) return "Régulier"
    return "En reconstruction"
  }

  if (!stats || !user) return null

  const displayPseudo =
    user.user_metadata?.pseudo || pseudo || user.email?.split("@")[0] || "Player"

  const bankrollStart = Number(user.user_metadata?.bankroll || 0)
  const currentBankroll = bankrollStart + stats.profit
  const levelLabel = getLevelLabel(stats.roi)

  return (
    <div className="page">
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">PT</div>
            <div className="brand-text">
              <div className="brand-title">Profil premium</div>
              <div className="brand-subtitle">Fiche joueur & performance</div>
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-secondary" onClick={() => router.push("/")}>
              Retour dashboard
            </button>
          </div>
        </div>

        <div
          className="card dashboard-section"
          style={{
            marginBottom: 20,
            padding: 28,
            background:
              "radial-gradient(circle at top right, rgba(139,124,246,0.25), transparent 30%), linear-gradient(135deg, rgba(12,18,35,1) 0%, rgba(10,16,32,1) 100%)"
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr",
              gap: 20,
              alignItems: "stretch"
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 18,
                alignItems: "center"
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#fff",
                  background: "linear-gradient(135deg, #8b7cf6, #4ea8de)",
                  boxShadow: "0 10px 30px rgba(139,124,246,0.25)"
                }}
              >
                {displayPseudo.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    marginBottom: 8
                  }}
                >
                  {displayPseudo}
                </div>

                <div style={{ opacity: 0.8, marginBottom: 10 }}>{user.email}</div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontWeight: 700,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)"
                  }}
                >
                  {levelLabel}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14
              }}
            >
              <div className="kpi">
                <div className="kpi-label">Bankroll actuelle</div>
                <div className="kpi-value">{currentBankroll.toFixed(2)} €</div>
              </div>

              <div className="kpi">
                <div className="kpi-label">ROI global</div>
                <div className="kpi-value">{stats.roi.toFixed(1)} %</div>
              </div>

              <div className="kpi">
                <div className="kpi-label">Profit total</div>
                <div className="kpi-value">{stats.profit.toFixed(2)} €</div>
              </div>

              <div className="kpi">
                <div className="kpi-label">€/heure</div>
                <div className="kpi-value">{stats.eurHour.toFixed(2)} €</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="dashboard-section"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 20
          }}
        >
          <div className="kpi">
            <div className="kpi-label">Tournois joués</div>
            <div className="kpi-value">{stats.count}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">ABI</div>
            <div className="kpi-value">{stats.abi.toFixed(2)} €</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Profit moyen</div>
            <div className="kpi-value">{stats.averageProfit.toFixed(2)} €</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Temps total joué</div>
            <div className="kpi-value">{formatHours(stats.duration)}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Meilleure room</div>
            <div className="kpi-value" style={{ fontSize: 24 }}>{stats.bestRoom}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Meilleur buy-in</div>
            <div className="kpi-value">{stats.bestBuyin} €</div>
          </div>
        </div>

        <div className="card dashboard-section">
          <div className="section-title">Personnalisation du profil</div>

          <div style={{ marginTop: 20, maxWidth: 460 }}>
            <div className="label" style={{ marginBottom: 8 }}>
              Pseudo joueur
            </div>

            <input
              className="input"
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="Entre ton pseudo poker"
            />

            <button
              className="btn"
              style={{ marginTop: 12 }}
              onClick={savePseudo}
              disabled={savingPseudo}
            >
              {savingPseudo ? "Enregistrement..." : "Sauvegarder le pseudo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}