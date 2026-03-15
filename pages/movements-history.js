import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function MovementsHistory() {
  const router = useRouter()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [movements, setMovements] = useState([])
  const [errorMessage, setErrorMessage] = useState("")

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
      await fetchMovements(session.user.id)
      setSessionChecked(true)
    }

    checkSession()
  }, [router])

  async function fetchMovements(userId) {
    const idToUse = userId || currentUser?.id
    if (!idToUse) return

    const { data, error } = await supabase
      .from("mouvements")
      .select("*")
      .eq("user_id", idToUse)
      .order("date", { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setMovements(data || [])
  }

  async function deleteMovement(id) {
    const confirmDelete = window.confirm("Supprimer ce mouvement ?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from("mouvements")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id)

    if (error) {
      alert(error.message)
      return
    }

    await fetchMovements()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  function exportCSV() {
    const headers = ["date", "type", "montant", "description"]

    const rows = movements.map((m) => ({
      date: m.date,
      type: m.type,
      montant: m.montant,
      description: m.description
    }))

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "mouvements.csv")

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">PT</div>

            <div className="brand-text">
              <div className="brand-title">Historique des mouvements</div>
              <div className="brand-subtitle">{currentUser?.email}</div>
            </div>
          </div>

          <div className="actions">
            <Link href="/">
              <button className="btn btn-secondary">
                Dashboard
              </button>
            </Link>

            <Link href="/movements-add">
              <button className="btn">
                Ajouter un mouvement
              </button>
            </Link>

            <button
              className="btn btn-secondary"
              onClick={exportCSV}
            >
              Export CSV
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleLogout}
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="section-title">
            Historique des mouvements
          </h2>

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

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{m.date}</td>
                    <td>{m.type}</td>

                    <td
                      className={
                        m.type === "depot" || m.type === "ajout"
                          ? "stat-positive"
                          : "stat-negative"
                      }
                    >
                      {m.montant} €
                    </td>

                    <td>{m.description}</td>

                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteMovement(m.id)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!movements.length ? (
              <p className="section-subtitle" style={{ marginTop: 16 }}>
                Aucun mouvement enregistré pour le moment.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}