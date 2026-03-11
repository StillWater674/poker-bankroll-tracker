import Link from "next/link"
import { supabase } from "../lib/supabaseClient"

export default function Add() {
  async function handleSubmit(e) {
    e.preventDefault()

    const data = new FormData(e.target)

    const buyin = Number(data.get("buyin"))
    const gains = Number(data.get("gains"))
    const profit = gains - buyin

    const { error } = await supabase.from("tournois").insert([
      {
        date: data.get("date"),
        room: data.get("room"),
        buyin,
        gains,
        profit,
        position: Number(data.get("position"))
      }
    ])

    if (error) {
      alert("Erreur Supabase : " + error.message)
      return
    }

    alert("Tournoi ajouté")
    window.location.href = "/history"
  }

  return (
    <div className="page">
      <div className="container">
        <div className="hero">
          <div>
            <h1 className="title">Ajouter un tournoi</h1>
            <p className="subtitle">Enregistre une nouvelle session MTT.</p>
          </div>
        </div>

        <div className="card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" name="date" required />
            </div>

            <div>
              <label className="label">Room</label>
              <input className="input" name="room" placeholder="Winamax" />
            </div>

            <div>
              <label className="label">Buy-in</label>
              <input className="input" type="number" name="buyin" placeholder="20" required />
            </div>

            <div>
              <label className="label">Gains</label>
              <input className="input" type="number" name="gains" placeholder="200" required />
            </div>

            <div>
              <label className="label">Position</label>
              <input className="input" type="number" name="position" placeholder="3" required />
            </div>

            <div className="actions">
              <button className="btn" type="submit">
                Enregistrer
              </button>

              <Link href="/history">
                <button className="btn btn-secondary" type="button">
                  Voir l’historique
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}