import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

export default function Login() {
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [signup,setSignup] = useState(false)

  async function handleSubmit(e){
    e.preventDefault()

    if(signup){
      const {error} = await supabase.auth.signUp({
        email,
        password
      })

      if(error){
        alert(error.message)
      }else{
        alert("Compte créé. Vérifie ton email.")
      }

    }else{

      const {error} = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if(error){
        alert(error.message)
      }else{
        window.location.href="/"
      }

    }
  }

  return(
    <div className="page">
      <div className="container" style={{maxWidth:500}}>
        <div className="card">

          <h1 style={{marginBottom:20}}>
            {signup ? "Créer un compte" : "Connexion"}
          </h1>

          <form onSubmit={handleSubmit} className="form-grid">

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn" type="submit">
              {signup ? "Créer le compte" : "Se connecter"}
            </button>

          </form>

          <div style={{marginTop:15}}>

            <button
              className="btn btn-secondary"
              onClick={()=>setSignup(!signup)}
            >
              {signup
                ? "J'ai déjà un compte"
                : "Créer un compte"}
            </button>

          </div>

        </div>
      </div>
    </div>
  )
}