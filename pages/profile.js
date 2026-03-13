import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function ProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [profile, setProfile] = useState({
    pseudo: "",
    full_name: "",
    avatar_url: "",
    monthly_goal: 0,
    bankroll_start: 0,
    bio: ""
  })
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const [stats, setStats] = useState({
    count: 0,
    profit: 0,
    ev: 0,
    buyins: 0,
    abi: 0,
    roi: 0,
    averageProfit: 0,
    totalDurationMinutes: 0,
    averageDurationMinutes: 0,
    eurosPerHour: 0,
    bestRoom: null,
    bestBuyin: null
  })

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        router.push("/login")
        return
      }

      const user = data.session.user
      setCurrentUser(user)

      await Promise.all([
        fetchProfile(user),
        fetchStats(user)
      ])

      setLoading(false)
    }

    init()
  }, [router])

  async function fetchProfile(user) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      console.error(error)
      setErrorMessage("Impossible de charger le profil.")
      return
    }

    if (!data) {
      const initialProfile = {
        id: user.id,
        pseudo: user.user_metadata?.pseudo || "",
        full_name: "",
        avatar_url: "",
        monthly_goal: 0,
        bankroll_start: 0,
        bio: ""
      }

      const { error: insertError } = await supabase
        .from("profiles")
        .insert([initialProfile])

      if (insertError) {
        console.error(insertError)
        setErrorMessage("Impossible de créer le profil.")
        return
      }

      setProfile({
        pseudo: initialProfile.pseudo,
        full_name: "",
        avatar_url: "",
        monthly_goal: 0,
        bankroll_start: 0,
        bio: ""
      })

      return
    }

    setProfile({
      pseudo: data.pseudo || "",
      full_name: data.full_name || "",
      avatar_url: data.avatar_url || "",
      monthly_goal: data.monthly_goal || 0,
      bankroll_start: Number(data.bankroll_start) || 0,
      bio: data.bio || ""
    })
  }

  async function fetchStats(user) {
    const { data: tournoisData, error } = await supabase
      .from("tournois")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })

    if (error) {
      console.error(error)
      setErrorMessage("Impossible de charger les stats joueur.")
      return
    }

    const tournois = tournoisData || []

    let profit = 0
    let ev = 0
    let buyins = 0
    let totalDurationMinutes = 0

    const groupedRooms = {}
    const groupedBuyins = {}

    tournois.forEach((t) => {
      const tournoiProfit = Number(t.profit) || 0
      const tournoiEv = Number(t.ev) || 0
      const tournoiBuyin = Number(t.buyin) || 0
      const tournoiDuration = Number(t.duration_minutes) || 0
      const room = t.room || "Inconnu"

      profit += tournoiProfit
      ev += tournoiEv
      buyins += tournoiBuyin
      totalDurationMinutes += tournoiDuration

      if (!groupedRooms[room]) {
        groupedRooms[room] = {
          room,
          count: 0,
          totalProfit: 0,
          totalBuyins: 0
        }
      }

      groupedRooms[room].count += 1
      groupedRooms[room].totalProfit += tournoiProfit
      groupedRooms[room].totalBuyins += tournoiBuyin

      if (!groupedBuyins[tournoiBuyin]) {
        groupedBuyins[tournoiBuyin] = {
          buyin: tournoiBuyin,
          count: 0,
          totalProfit: 0,
          totalBuyins: 0
        }
      }

      groupedBuyins[tournoiBuyin].count += 1
      groupedBuyins[tournoiBuyin].totalProfit += tournoiProfit
      groupedBuyins[tournoiBuyin].totalBuyins += tournoiBuyin
    })

    const abi =
      tournois.length > 0 ? Number((buyins / tournois.length).toFixed(2)) : 0

    const roi =
      buyins > 0 ? Number(((profit / buyins) * 100).toFixed(1)) : 0

    const averageProfit =
      tournois.length > 0 ? Number((profit / tournois.length).toFixed(2)) : 0

    const averageDurationMinutes =
      tournois.length > 0
        ? Number((totalDurationMinutes / tournois.length).toFixed(1))
        : 0

    const hoursPlayed = totalDurationMinutes / 60
    const eurosPerHour =
      hoursPlayed > 0 ? Number((profit / hoursPlayed).toFixed(2)) : 0

    const roomArray = Object.values(groupedRooms)
      .map((item) => ({
        ...item,
        roi:
          item.totalBuyins > 0
            ? Number(((item.totalProfit / item.totalBuyins) * 100).toFixed(1))
            : 0
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)

    const buyinArray = Object.values(groupedBuyins)
      .map((item) => ({
        ...item,
        roi:
          item.totalBuyins > 0
            ? Number(((item.totalProfit / item.totalBuyins) * 100).toFixed(1))
            : 0
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)

    setStats({
      count: tournois.length,
      profit: Number(profit.toFixed(2)),
      ev: Number(ev.toFixed(2)),
      buyins: Number(buyins.toFixed(2)),
      abi,
      roi,
      averageProfit,
      totalDurationMinutes,
      averageDurationMinutes,
      eurosPerHour,
      bestRoom: roomArray[0] || null,
      bestBuyin: buyinArray[0] || null
    })
  }

  function handleChange(e) {
    const { name, value } = e.target
    setProfile((prev) => ({
      ...prev,
      [name]:
        name === "monthly_goal" || name === "bankroll_start"
          ? value
          : value
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage("")
    setErrorMessage("")

    if (!currentUser) {
      setErrorMessage("Utilisateur non connecté.")
      setSaving(false)
      return
    }

    const payload = {
      id: currentUser.id,
      pseudo: profile.pseudo.trim(),
      full_name: profile.full_name.trim(),
      avatar_url: profile.avatar_url.trim(),
      monthly_goal: Number(profile.monthly_goal) || 0,
      bankroll_start: Number(profile.bankroll_start) || 0,
      bio: profile.bio.trim(),
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from("profiles")
      .upsert(payload)

    if (error) {
      console.error(error)
      setErrorMessage("Impossible d'enregistrer le profil.")
      setSaving(false)
      return
    }

    setMessage("Profil enregistré avec succès.")
    setSaving(false)
  }

  const currentBankroll = useMemo(() => {
    return Number((Number(profile.bankroll_start || 0) + stats.profit).toFixed(2))
  }, [profile.bankroll_start, stats.profit])

  function formatMinutes(minutes) {
    const total = Number(minutes) || 0
    const hours = Math.floor(total / 60)
    const mins = Math.round(total % 60)

    if (hours <= 0) return `${mins} min`
    return `${hours}h ${mins}min`
  }

  if (loading) {
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
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">PT</div>
            <div className="brand-text">
              <div className="brand-title">Profil joueur</div>
              <div className="brand-subtitle">
                {profile.pseudo || currentUser?.email || "Fiche joueur"}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/">
              <button className="btn btn-secondary">Retour dashboard</button>
            </Link>
          </div>
        </div>

        <div className="grid grid-3 dashboard-section">
          <div className="kpi">
            <div className="kpi-label">Pseudo</div>
            <div className="kpi-value">{profile.pseudo || "-"}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Email</div>
            <div className="kpi-value" style={{ fontSize: "18px" }}>
              {currentUser?.email || "-"}
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Bankroll actuelle</div>
            <div className="kpi-value">{currentBankroll} €</div>
          </div>
        </div>

        <div className="grid grid-4 dashboard-section">
          <div className="kpi">
            <div className="kpi-label">Tournois joués</div>
            <div className="kpi-value">{stats.count}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Profit total</div>
            <div className="kpi-value">{stats.profit} €</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">ROI global</div>
            <div className="kpi-value">{stats.roi} %</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">ABI</div>
            <div className="kpi-value">{stats.abi} €</div>
          </div>
        </div>

        <div className="grid grid-4 dashboard-section">
          <div className="kpi">
            <div className="kpi-label">Profit moyen</div>
            <div className="kpi-value">{stats.averageProfit} €</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Temps total joué</div>
            <div className="kpi-value">{formatMinutes(stats.totalDurationMinutes)}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Durée moyenne</div>
            <div className="kpi-value">{formatMinutes(stats.averageDurationMinutes)}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">€/heure</div>
            <div className="kpi-value">{stats.eurosPerHour} €</div>
          </div>
        </div>

        <div className="grid grid-2 dashboard-section">
          <div className="kpi">
            <div className="kpi-label">Meilleure room</div>
            <div className="kpi-value">{stats.bestRoom?.room || "-"}</div>
            {stats.bestRoom && (
              <div className="kpi-meta">
                Profit {stats.bestRoom.totalProfit} € • ROI {stats.bestRoom.roi} %
              </div>
            )}
          </div>

          <div className="kpi">
            <div className="kpi-label">Meilleur buy-in</div>
            <div className="kpi-value">
              {stats.bestBuyin ? `${stats.bestBuyin.buyin} €` : "-"}
            </div>
            {stats.bestBuyin && (
              <div className="kpi-meta">
                Profit {stats.bestBuyin.totalProfit} € • ROI {stats.bestBuyin.roi} %
              </div>
            )}
          </div>
        </div>

        <div className="card dashboard-section">
          <h3 className="section-title">Informations joueur</h3>

          {message ? (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 12,
                background: "rgba(46,204,113,0.12)",
                border: "1px solid rgba(46,204,113,0.35)",
                color: "#62d394"
              }}
            >
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                borderRadius: 12,
                background: "rgba(255,107,107,0.12)",
                border: "1px solid rgba(255,107,107,0.35)",
                color: "#ff8b8b"
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSave}>
            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Pseudo
                </label>
                <input
                  className="input"
                  name="pseudo"
                  value={profile.pseudo}
                  onChange={handleChange}
                  placeholder="Ton pseudo poker"
                />
              </div>

              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Nom complet
                </label>
                <input
                  className="input"
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleChange}
                  placeholder="Nom ou prénom"
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  URL avatar
                </label>
                <input
                  className="input"
                  name="avatar_url"
                  value={profile.avatar_url}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Objectif mensuel
                </label>
                <input
                  className="input"
                  type="number"
                  name="monthly_goal"
                  value={profile.monthly_goal}
                  onChange={handleChange}
                  placeholder="Nombre de tournois"
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Bankroll de départ
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  name="bankroll_start"
                  value={profile.bankroll_start}
                  onChange={handleChange}
                  placeholder="500"
                />
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                Bio joueur
              </label>
              <textarea
                className="input"
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                rows={5}
                style={{ resize: "vertical", minHeight: 120 }}
                placeholder="Ton style de jeu, tes objectifs, tes limites..."
              />
            </div>

            <div className="actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer le profil"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}