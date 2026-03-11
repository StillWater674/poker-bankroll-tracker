import Link from "next/link"
import { supabase } from "../lib/supabaseClient"

export default function MovementsAdd() {
  async function handleSubmit(e) {
    e.preventDefault()

    const data = new FormData(e.target)

    const payload = {
      date: data.get("date"),
      type: data.get("type"),
      montant: Number(data.get("montant")),
      plateforme: data.get("plateforme"),
      note: data.get("note")
    }

    const { error } = await supabase.from("mouvements").insert([payload])

    if (error) {
      alert("Erreur Supabase : " + error.message)
      return
    }

    alert("Mouvement ajouté")
    window.location.href = "/movements-history"
  }

  return (
    <div className="page">
      <div className="container">
        <div className="hero">
          <div>
            <h1 className="title">Ajouter un mouvement</h1>
            <p className="subtitle">Dépôt, retrait, cashout ou dépense.</p>
          </div>
        </div>

        <div className="card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" name="date" required />
            </div>

            <div>
              <label className="label">Type</label>
              <select className="select" name="type" required>
                <option value="">Choisir</option>
                <option value="depot">Dépôt</option>
                <option value="retrait">Retrait</option>
                <option value="cashout">Cashout</option>
                <option value="ajout">Ajout bankroll</option>
                <option value="depense">Dépense</option>
              </select>
            </div>

            <div>
              <label className="label">Montant</label>
              <input className="input" type="number" step="0.01" name="montant" required />
            </div>

            <div>
              <label className="label">Plateforme / Room</label>
              <input className="input" type="text" name="plateforme" placeholder="Winamax" />
            </div>

            <div>
              <label className="label">Note</label>
              <textarea className="textarea" name="note" placeholder="Commentaire libre" />
            </div>

            <div className="actions">
              <button className="btn" type="submit">
                Enregistrer
              </button>

              <Link href="/movements-history">
                <button className="btn btn-secondary" type="button">
                  Voir les mouvements
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}