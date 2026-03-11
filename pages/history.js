import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function HistoryPage() {
  const router = useRouter()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [tournois, setTournois] = useState([])
  const [filteredTournois, setFilteredTournois] = useState([])

  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [roomFilter, setRoomFilter] = useState("")

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    date: "",
    room: "",
    buyin: "",
    gains: "",
    position: ""
  })

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        router.push("/login")
        return
      }

      setCurrentUser(session.user)
      await fetchTournois()
      setSessionChecked(true)
    }

    checkSession()
  }, [router])

  async function fetchTournois() {
    const { data, error } = await supabase
      .from("tournois")
      .select("*")
      .order("date", { ascending: false })

    if (error) {
      alert(error.message)
      return
    }

    setTournois(data || [])
    setFilteredTournois(data || [])
  }

  function applyFilters() {
    let result = [...tournois]

    if (dateFrom) {
      result = result.filter((t) => t.date >= dateFrom)
    }

    if (dateTo) {
      result = result.filter((t) => t.date <= dateTo)
    }

    if (roomFilter.trim()) {
      result = result.filter((t) =>
        (t.room || "").toLowerCase().includes(roomFilter.trim().toLowerCase())
      )
    }

    setFilteredTournois(result)
  }

  function resetFilters() {
    setDateFrom("")
    setDateTo("")
    setRoomFilter("")
    setFilteredTournois(tournois)
  }

  function startEdit(t) {
    setEditingId(t.id)
    setEditForm({
      date: t.date || "",
      room: t.room || "",
      buyin: t.buyin ?? "",
      gains: t.gains ?? "",
      position: t.position ?? ""
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({
      date: "",
      room: "",
      buyin: "",
      gains: "",
      position: ""
    })
  }

  async function saveEdit(id) {
    const buyinNumber = Number(editForm.buyin) || 0
    const gainsNumber = Number(editForm.gains) || 0
    const profit = gainsNumber - buyinNumber

    const { error } = await supabase
      .from("tournois")
      .update({
        date: editForm.date,
        room: editForm.room,
        buyin: buyinNumber,
        gains: gainsNumber,
        profit,
        position: editForm.position ? Number(editForm.position) : null
      })
      .eq("id", id)

    if (error) {
      alert(error.message)
      return
    }

    cancelEdit()
    await fetchTournois()
  }

  async function deleteTournoi(id) {
    const confirmed = window.confirm("Supprimer ce tournoi ?")
    if (!confirmed) return

    const { error } = await supabase.from("tournois").delete().eq("id", id)

    if (error) {
      alert(error.message)
      return
    }

    await fetchTournois()
  }

  async function exportCSV() {
    const rows = filteredTournois.map((t) => ({
      date: t.date,
      room: t.room,
      buyin: t.buyin,
      gains: t.gains,
      profit: t.profit,
      position: t.position
    }))

    const headers = ["date", "room", "buyin", "gains", "profit", "position"]
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => `"${row[header] ?? ""}"`).join(",")
      )
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "tournois.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const totalProfit = useMemo(() => {
    return filteredTournois.reduce((sum, t) => sum + (Number(t.profit) || 0), 0)
  }, [filteredTournois])

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
              <div className="brand-title">Historique des tournois</div>
              <div className="brand-subtitle">
                {currentUser?.email ? `Connectée : ${currentUser.email}` : ""}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/">
              <button className="btn btn-secondary">Dashboard</button>
            </Link>
            <Link href="/add">
              <button className="btn">Ajouter un tournoi</button>
            </Link>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>

        <div className="hero" style={{ marginBottom: 20 }}>
          <div className="hero-grid">
            <div>
              <h1 className="hero-title">Historique privé de tes tournois</h1>
              <p className="hero-subtitle">
                Cette page n’affiche que les tournois du compte connecté.
              </p>

              <div className="hero-badges">
                <div className="badge">Filtrage</div>
                <div className="badge">Édition</div>
                <div className="badge">Suppression</div>
                <div className="badge">Export CSV</div>
              </div>
            </div>

            <div className="hero-side">
              <div className="hero-side-card">
                <div className="hero-side-label">Tournois affichés</div>
                <div className="hero-side-value">{filteredTournois.length}</div>
              </div>
              <div className="hero-side-card">
                <div className="hero-side-label">Profit affiché</div>
                <div className="hero-side-value">{totalProfit} €</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Filtres</h3>

          <div className="actions" style={{ marginBottom: 14 }}>
            <input
              className="input"
              style={{ maxWidth: 180 }}
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <input
              className="input"
              style={{ maxWidth: 180 }}
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <input
              className="input"
              style={{ maxWidth: 220 }}
              type="text"
              placeholder="Filtrer par room"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
            />

            <button className="btn" onClick={applyFilters}>
              Filtrer
            </button>

            <button className="btn btn-secondary" onClick={resetFilters}>
              Réinitialiser
            </button>

            <button className="btn btn-secondary" onClick={exportCSV}>
              Exporter en CSV
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Liste des tournois</h3>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Room</th>
                  <th>Buy-in</th>
                  <th>Gains</th>
                  <th>Profit</th>
                  <th>Position</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTournois.map((t) => {
                  const isEditing = editingId === t.id

                  return (
                    <tr key={t.id}>
                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            type="date"
                            value={editForm.date}
                            onChange={(e) =>
                              setEditForm({ ...editForm, date: e.target.value })
                            }
                          />
                        ) : (
                          t.date
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            type="text"
                            value={editForm.room}
                            onChange={(e) =>
                              setEditForm({ ...editForm, room: e.target.value })
                            }
                          />
                        ) : (
                          t.room
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            value={editForm.buyin}
                            onChange={(e) =>
                              setEditForm({ ...editForm, buyin: e.target.value })
                            }
                          />
                        ) : (
                          `${t.buyin} €`
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            value={editForm.gains}
                            onChange={(e) =>
                              setEditForm({ ...editForm, gains: e.target.value })
                            }
                          />
                        ) : (
                          `${t.gains} €`
                        )}
                      </td>

                      <td className={(Number(t.profit) || 0) >= 0 ? "stat-positive" : "stat-negative"}>
                        {isEditing
                          ? `${(Number(editForm.gains || 0) - Number(editForm.buyin || 0)).toFixed(2)} €`
                          : `${t.profit} €`}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            value={editForm.position}
                            onChange={(e) =>
                              setEditForm({ ...editForm, position: e.target.value })
                            }
                          />
                        ) : (
                          t.position
                        )}
                      </td>

                      <td>
                        <div className="actions">
                          {isEditing ? (
                            <>
                              <button className="btn" onClick={() => saveEdit(t.id)}>
                                Sauvegarder
                              </button>
                              <button className="btn btn-secondary" onClick={cancelEdit}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-secondary" onClick={() => startEdit(t)}>
                                Modifier
                              </button>
                              <button
                                className="btn btn-danger"
                                onClick={() => deleteTournoi(t.id)}
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}