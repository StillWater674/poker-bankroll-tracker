import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function AddTournament() {
  const router = useRouter()

  const [loadingSession, setLoadingSession] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const [form, setForm] = useState({
    date: "",
    room: "",
    game_type: "MTT",
    buyin: "",
    profit: "",
    ev: "",
    duration_minutes: "",
    note: ""
  })

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error(error)
        setErrorMessage("Erreur lors de la vérification de session.")
        setLoadingSession(false)
        return
      }

      const session = data.session

      if (!session) {
        router.push("/login")
        return
      }

      setCurrentUser(session.user)
      setLoadingSession(false)
    }

    checkSession()
  }, [router])

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")

    if (!currentUser) {
      setErrorMessage("Utilisateur non connecté.")
      return
    }

    if (!form.date || !form.room || form.buyin === "" || form.profit === "") {
      setErrorMessage("Merci de remplir au minimum la date, la room, le buy-in et le profit.")
      return
    }

    setSaving(true)

    const payload = {
      user_id: currentUser.id,
      date: form.date,
      room: form.room.trim(),
      game_type: form.game_type,

      buyin: Number(form.buyin) || 0,
      profit: Number(form.profit) || 0,
      ev: form.ev === "" ? 0 : Number(form.ev),
      duration_minutes: form.duration_minutes === "" ? 0 : Number(form.duration_minutes),
      note: form.note.trim(),
      created_at: new Date().toISOString()
    }

    const { error } = await supabase.from("tournois").insert([payload])

    if (error) {
      console.error("Erreur insertion tournoi :", error)
      setErrorMessage(error.message || "Impossible d'enregistrer le tournoi.")
      setSaving(false)
      return
    }

    setSuccessMessage("Tournoi enregistré avec succès.")

    setForm({
      date: new Date().toISOString().slice(0, 10),
      room: "",
      buyin: "",
      profit: "",
      ev: "",
      duration_minutes: "",
      note: ""
    })

    setSaving(false)

    setTimeout(() => {
      router.push("/")
    }, 600)
  }

  if (loadingSession) {
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
        <div className="topbar" style={{ marginBottom: 24 }}>
          <div className="brand">
            <div className="brand-mark">PT</div>
            <div className="brand-text">
              <div className="brand-title">Ajouter un tournoi</div>
              <div className="brand-subtitle">
                {currentUser?.email || "Saisie d'une nouvelle entrée"}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/">
              <button className="btn btn-secondary">Retour dashboard</button>
            </Link>

            <Link href="/history">
              <button className="btn btn-secondary">Historique</button>
            </Link>
          </div>
        </div>

        <div className="card">
          <h1 className="section-title" style={{ marginBottom: 8 }}>
            Nouveau tournoi
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 24 }}>
            Entre tes données proprement. Le tracker fera le reste.
          </p>

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

          {successMessage ? (
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
              {successMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Date
                </label>
                <input
                  className="input"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <label className="kpi-label">Room</label>

              <input
                className="input"
                type="text"
                name="room"
                value={form.room}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="kpi-label">Type de partie</label>

              <select
                className="input"
                name="game_type"
                value={form.game_type}
                onChange={handleChange}
              >
                <option value="MTT">MTT</option>
                <option value="Sit & Go">Sit & Go</option>
                <option value="Cash Game">Cash Game</option>
                <option value="Spin">Spin</option>
                <option value="Satellite">Satellite</option>
              </select>
            </div>

            <div>
              <label className="kpi-label">Type de partie</label>

              <select
                className="input"
                name="game_type"
                value={form.game_type}
                onChange={handleChange}
              >
                <option value="MTT">MTT</option>
                <option value="Sit & Go">Sit & Go</option>
                <option value="Cash Game">Cash Game</option>
                <option value="Spin">Spin</option>
                <option value="Satellite">Satellite</option>
              </select>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Buy-in (€)
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  name="buyin"
                  value={form.buyin}
                  onChange={handleChange}
                  placeholder="5"
                  required
                />
              </div>

              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Profit (€)
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  name="profit"
                  value={form.profit}
                  onChange={handleChange}
                  placeholder="12.50 ou -5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginBottom: 18 }}>
              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  EV (€)
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  name="ev"
                  value={form.ev}
                  onChange={handleChange}
                  placeholder="Optionnel"
                />
              </div>

              <div>
                <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                  Durée (minutes)
                </label>
                <input
                  className="input"
                  type="number"
                  name="duration_minutes"
                  value={form.duration_minutes}
                  onChange={handleChange}
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label className="kpi-label" style={{ display: "block", marginBottom: 8 }}>
                Note
              </label>
              <textarea
                className="input"
                name="note"
                value={form.note}
                onChange={handleChange}
                placeholder="Read field, ICM compliqué, spew, deep run..."
                rows={5}
                style={{ resize: "vertical", minHeight: 120 }}
              />
            </div>

            <div className="actions">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer le tournoi"}
              </button>

              <Link href="/">
                <button type="button" className="btn btn-secondary">
                  Annuler
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}