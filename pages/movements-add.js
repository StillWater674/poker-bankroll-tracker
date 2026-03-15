import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function AddMovement() {
  const router = useRouter()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState("depot")
  const [montant, setMontant] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error(error)
        setErrorMessage("Erreur lors de la vérification de session.")
        setSessionChecked(true)
        return
      }

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
    setErrorMessage("")

    if (!currentUser?.id) {
      setErrorMessage("Utilisateur non connecté.")
      return
    }

    const montantNumber = Number(montant)

    if (!date || !type || !Number.isFinite(montantNumber)) {
      setErrorMessage("Merci de remplir correctement la date, le type et le montant.")
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from("mouvements")
      .insert([
        {
          date,
          type,
          montant: montantNumber,
          description: description.trim(),
          user_id: currentUser.id
        }
      ])

    if (error) {
      console.error(error)
      setErrorMessage(error.message || "Impossible d'enregistrer le mouvement.")
      setSaving(false)
      return
    }

    alert("Mouvement enregistré")
    router.push("/")
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
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">PT</div>

            <div className="brand-text">
              <div className="brand-title">Ajouter un mouvement</div>
              <div className="brand-subtitle">
                {currentUser?.email}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/">
              <button className="btn btn-secondary">Dashboard</button>
            </Link>

            <button className="btn btn-secondary" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">Nouveau mouvement</h2>

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
              <label className="label">Type</label>
              <select
                className="select"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="depot">Dépôt</option>
                <option value="retrait">Retrait</option>
                <option value="cashout">Cashout</option>
                <option value="depense">Dépense</option>
                <option value="ajout">Ajout bankroll</option>
              </select>
            </div>

            <div>
              <label className="label">Montant</label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Description</label>
              <input
                className="input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer le mouvement"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}