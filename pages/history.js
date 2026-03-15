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
        router.push("/login")
        return
      }

      const session = data.session

      if (!session) {
        router.push("/login")
        return
      }

      setCurrentUser(session.user)
      await fetchTournois(session.user.id)
      setSessionChecked(true)
    }

    checkSession()
  }, [router])

  async function fetchTournois(userId) {
    const idToUse = userId || currentUser?.id

    if (!idToUse) return

    const { data, error } = await supabase
      .from("tournois")
      .select("*")
      .eq("user_id", idToUse)
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
      result = result.filter((t) => (t.date ? t.date.slice(0, 10) >= dateFrom : false))
    }

    if (dateTo) {
      result = result.filter((t) => (t.date ? t.date.slice(0, 10) <= dateTo : false))
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
      date: t.date ? t.date.slice(0, 10) : "",
      room: t.room || "",
      game_type: t.game_type || "MTT",
      buyin: t.buyin ?? "",
      profit: t.profit ?? "",
      ev: t.ev ?? "",
      duration_minutes: t.duration_minutes ?? "",
      note: t.note || ""
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({
      date: "",
      room: "",
      game_type: "MTT",
      buyin: "",
      profit: "",
      ev: "",
      duration_minutes: "",
      note: ""
    })
  }

  async function saveEdit(id) {
    const { error } = await supabase
      .from("tournois")
      .update({
        date: editForm.date,
        room: editForm.room.trim(),
        game_type: editForm.game_type,
        buyin: Number(editForm.buyin) || 0,
        profit: Number(editForm.profit) || 0,
        ev: editForm.ev === "" ? 0 : Number(editForm.ev),
        duration_minutes:
          editForm.duration_minutes === "" ? 0 : Number(editForm.duration_minutes),
        note: editForm.note.trim()
      })
      .eq("id", id)
      .eq("user_id", currentUser.id)

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

    const { error } = await supabase
      .from("tournois")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id)

    if (error) {
      alert(error.message)
      return
    }

    await fetchTournois()
  }

  function exportCSV() {
    const rows = filteredTournois.map((t) => ({
      date: t.date ? t.date.slice(0, 10) : "",
      room: t.room || "",
      game_type: t.game_type || "",
      buyin: t.buyin ?? "",
      profit: t.profit ?? "",
      ev: t.ev ?? "",
      duration_minutes: t.duration_minutes ?? "",
      note: t.note ?? ""
    }))

    const headers = [
      "date",
      "room",
      "game_type",
      "buyin",
      "profit",
      "ev",
      "duration_minutes",
      "note"
    ]

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
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
    URL.revokeObjectURL(url)
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
                  <th>Type</th>
                  <th>Buy-in</th>
                  <th>Profit</th>
                  <th>EV</th>
                  <th>Durée</th>
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
                          t.date ? t.date.slice(0, 10) : ""
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
                          <select
                            className="input"
                            value={editForm.game_type}
                            onChange={(e) =>
                              setEditForm({ ...editForm, game_type: e.target.value })
                            }
                          >
                            <option value="MTT">MTT</option>
                            <option value="Sit & Go">Sit & Go</option>
                            <option value="Cash Game">Cash Game</option>
                            <option value="Spin">Spin</option>
                            <option value="Satellite">Satellite</option>
                          </select>
                        ) : (
                          t.game_type || "MTT"
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

                      <td className={(Number(t.profit) || 0) >= 0 ? "stat-positive" : "stat-negative"}>
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            value={editForm.profit}
                            onChange={(e) =>
                              setEditForm({ ...editForm, profit: e.target.value })
                            }
                          />
                        ) : (
                          `${t.profit} €`
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            value={editForm.ev}
                            onChange={(e) =>
                              setEditForm({ ...editForm, ev: e.target.value })
                            }
                          />
                        ) : (
                          `${Number(t.ev || 0)} €`
                        )}
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="input"
                            type="number"
                            value={editForm.duration_minutes}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                duration_minutes: e.target.value
                              })
                            }
                          />
                        ) : (
                          `${Number(t.duration_minutes || 0)} min`
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