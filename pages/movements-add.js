import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function AddMovement() {
  const router = useRouter()

  const [sessionChecked,setSessionChecked] = useState(false)
  const [currentUser,setCurrentUser] = useState(null)

  const [date,setDate] = useState("")
  const [type,setType] = useState("depot")
  const [montant,setMontant] = useState("")
  const [description,setDescription] = useState("")

  useEffect(()=>{

    async function checkSession(){

      const { data } = await supabase.auth.getSession()
      const session = data.session

      if(!session){
        router.push("/login")
        return
      }

      setCurrentUser(session.user)
      setSessionChecked(true)
    }

    checkSession()

  },[router])

  async function handleSubmit(e){

    e.preventDefault()

    const {
      data:{user}
    } = await supabase.auth.getUser()

    const montantNumber = Number(montant) || 0

    const { error } = await supabase
      .from("mouvements")
      .insert([
        {
          date,
          type,
          montant: montantNumber,
          description,
          user_id: user.id
        }
      ])

    if(error){
      alert(error.message)
      return
    }

    alert("Mouvement enregistré")
    router.push("/")
  }

  async function handleLogout(){
    await supabase.auth.signOut()
    router.push("/login")
  }

  if(!sessionChecked){
    return(
      <div className="page">
        <div className="container">
          <div className="card">Chargement...</div>
        </div>
      </div>
    )
  }

  return(
    <div className="page">
      <div className="container" style={{maxWidth:700}}>

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

          <form className="form-grid" onSubmit={handleSubmit}>

            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e)=>setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Type</label>
              <select
                className="select"
                value={type}
                onChange={(e)=>setType(e.target.value)}
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
                value={montant}
                onChange={(e)=>setMontant(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Description</label>
              <input
                className="input"
                type="text"
                value={description}
                onChange={(e)=>setDescription(e.target.value)}
              />
            </div>

            <button className="btn" type="submit">
              Enregistrer le mouvement
            </button>

          </form>

        </div>

      </div>
    </div>
  )
}