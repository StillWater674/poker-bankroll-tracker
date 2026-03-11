import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function History() {
  const [tournois, setTournois] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    date: "",
    room: "",
    buyin: "",
    gains: "",
    position: ""
  })

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    room: ""
  })

  useEffect(() => {
    fetchTournois()
  }, [])

  async function fetchTournois(customFilters = filters) {
    let query = supabase
      .from("tournois")
      .select("*")
      .order("date", { ascending: false })

    if (customFilters.startDate) {
      query = query.gte("date", customFilters.startDate)
    }

    if (customFilters.endDate) {
      query = query.lte("date", customFilters.endDate)
    }

    if (customFilters.room) {
      query = query.ilike("room", `%${customFilters.room}%`)
    }

    const { data, error } = await query

    if (error) {
      alert("Erreur chargement historique : " + error.message)
      return
    }

    setTournois(data || [])
  }

  async function deleteTournoi(id) {
    const confirmDelete = window.confirm("Supprimer ce tournoi ?")
    if (!confirmDelete) return

    const { error } = await supabase.from("tournois").delete().eq("id", id)

    if (error) {
      alert("Erreur suppression : " + error.message)
      return
    }

    fetchTournois()
  }

  function startEdit(t) {
    setEditingId(t.id)
    setEditForm({
      date: t.date || "",
      room: t.room || "",
      buyin: t.buyin || "",
      gains: t.gains || "",
      position: t.position || ""
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
    const buyin = Number(editForm.buyin)
    const gains = Number(editForm.gains)
    const profit = gains - buyin

    const { error } = await supabase
      .from("tournois")
      .update({
        date: editForm.date,
        room: editForm.room,
        buyin,
        gains,
        profit,
        position: Number(editForm.position)
      })
      .eq("id", id)

    if (error) {
      alert("Erreur modification : " + error.message)
      return
    }

    cancelEdit()
    fetchTournois()
  }

  function exportCSV() {
    if (!tournois.length) {
      alert("Aucune donnée à exporter")
      return
    }

    const headers = ["Date", "Room", "Buy-in", "Gains", "Profit", "Position"]

    const rows = tournois.map((t) => [
      t.date,
      t.room,
      t.buyin,
      t.gains,
      t.profit,
      t.position
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "historique-tournois.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function applyFilters() {
    fetchTournois(filters)
  }

  function resetFilters() {
    const emptyFilters = {
      startDate: "",
      endDate: "",
      room: ""
    }

    setFilters(emptyFilters)
    fetchTournois(emptyFilters)
  }

  return (
    <div className="page">
      <div className="container">
        <div className="hero">
          <div>
            <h1 className="title">Historique des tournois</h1>
            <p className="subtitle">Filtre, modifie et exporte tes résultats.</p>
          </div>
        </div>

        <div className="actions" style={{ marginBottom: 18 }}>
          <Link href="/">
            <button className="btn btn-secondary">Retour accueil</button>
          </Link>
          <button className="btn" onClick={exportCSV}>
            Exporter en CSV
          </button>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Filtres</h3>
          <div className="filters">
            <input
              className="input"
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
            />
            <input
              className="input"
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />
            <input
              className="input"
              type="text"
              placeholder="Room"
              value={filters.room}
              onChange={(e) =>
                setFilters({ ...filters, room: e.target.value })
              }
            />
            <button className="btn" onClick={applyFilters}>
              Filtrer
            </button>
            <button className="btn btn-secondary" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="card table-wrap">
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
              {tournois.map((t) => (
                <tr key={t.id}>
                  <td>
                    {editingId === t.id ? (
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
                    {editingId === t.id ? (
                      <input
                        className="input"
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
                    {editingId === t.id ? (
                      <input
                        className="input"
                        type="number"
                        value={editForm.buyin}
                        onChange={(e) =>
                          setEditForm({ ...editForm, buyin: e.target.value })
                        }
                      />
                    ) : (
                      t.buyin
                    )}
                  </td>

                  <td>
                    {editingId === t.id ? (
                      <input
                        className="input"
                        type="number"
                        value={editForm.gains}
                        onChange={(e) =>
                          setEditForm({ ...editForm, gains: e.target.value })
                        }
                      />
                    ) : (
                      t.gains
                    )}
                  </td>

                  <td className={t.profit >= 0 ? "stat-positive" : "stat-negative"}>
                    {editingId === t.id
                      ? Number(editForm.gains || 0) - Number(editForm.buyin || 0)
                      : t.profit}
                  </td>

                  <td>
                    {editingId === t.id ? (
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
                    {editingId === t.id ? (
                      <div className="actions">
                        <button className="btn" onClick={() => saveEdit(t.id)}>
                          Sauvegarder
                        </button>
                        <button className="btn btn-secondary" onClick={cancelEdit}>
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="actions">
                        <button className="btn btn-secondary" onClick={() => startEdit(t)}>
                          Modifier
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => deleteTournoi(t.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}