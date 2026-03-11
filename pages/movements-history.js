import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function MovementsHistory() {
  const [mouvements, setMouvements] = useState([])

  useEffect(() => {
    fetchMouvements()
  }, [])

  async function fetchMouvements() {
    const { data, error } = await supabase
      .from("mouvements")
      .select("*")
      .order("date", { ascending: false })

    if (error) {
      alert("Erreur chargement mouvements : " + error.message)
      return
    }

    setMouvements(data || [])
  }

  async function deleteMouvement(id) {
    const confirmDelete = window.confirm("Supprimer ce mouvement ?")
    if (!confirmDelete) return

    const { error } = await supabase.from("mouvements").delete().eq("id", id)

    if (error) {
      alert("Erreur suppression : " + error.message)
      return
    }

    fetchMouvements()
  }

  return (
    <div className="page">
      <div className="container">
        <div className="hero">
          <div>
            <h1 className="title">Historique des mouvements</h1>
            <p className="subtitle">Dépôts, retraits, cashout et dépenses.</p>
          </div>
        </div>

        <div className="actions" style={{ marginBottom: 18 }}>
          <Link href="/">
            <button className="btn btn-secondary">Retour accueil</button>
          </Link>

          <Link href="/movements-add">
            <button className="btn">Ajouter un mouvement</button>
          </Link>
        </div>

        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Montant</th>
                <th>Plateforme</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => (
                <tr key={m.id}>
                  <td>{m.date}</td>
                  <td>{m.type}</td>
                  <td>{m.montant} €</td>
                  <td>{m.plateforme}</td>
                  <td>{m.note}</td>
                  <td>
                    <button className="btn btn-danger" onClick={() => deleteMouvement(m.id)}>
                      Supprimer
                    </button>
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