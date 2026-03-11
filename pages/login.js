import { useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"

export default function LoginPage() {

  const router = useRouter()

  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [pseudo,setPseudo] = useState("")

  const [signup,setSignup] = useState(false)
  const [loading,setLoading] = useState(false)

  async function handleSubmit(e){

    e.preventDefault()

    setLoading(true)

    if(signup){

      const { error } = await supabase.auth.signUp({

        email,
        password,

        options:{
          data:{
            pseudo:pseudo
          }
        }

      })

      if(error){
        alert(error.message)
        setLoading(false)
        return
      }

      alert("Compte créé ! Vérifie ton email si nécessaire.")

      setSignup(false)

    }else{

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if(error){
        alert(error.message)
        setLoading(false)
        return
      }

      router.push("/")

    }

    setLoading(false)
  }


  return(

    <div className="page">

      <div className="container" style={{maxWidth:500}}>

        <div className="card">

          <h1 style={{marginBottom:20}}>
            {signup ? "Créer un compte" : "Connexion"}
          </h1>


          <form onSubmit={handleSubmit} className="form-grid">

            {signup && (

              <div>

                <label className="label">
                  Pseudo
                </label>

                <input
                  className="input"
                  type="text"
                  value={pseudo}
                  onChange={(e)=>setPseudo(e.target.value)}
                  placeholder="Ton pseudo poker"
                  required
                />

              </div>

            )}

            <div>

              <label className="label">
                Email
              </label>

              <input
                className="input"
                type="email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                required
              />

            </div>


            <div>

              <label className="label">
                Mot de passe
              </label>

              <input
                className="input"
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                required
              />

            </div>


            <button className="btn" type="submit">

              {loading
                ? "Chargement..."
                : signup
                ? "Créer le compte"
                : "Se connecter"}

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
