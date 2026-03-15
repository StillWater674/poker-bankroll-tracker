import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import Papa from "papaparse"
import { supabase } from "../lib/supabaseClient"

function normalizeRoom(value) {
  const roomRaw = (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

  const roomMap = {
    "poker star": "PokerStars",
    "pokerstars": "PokerStars",
    "poker stars": "PokerStars",
    "winamax": "Winamax",
    "pmu poker": "PMU Poker",
    "pmu": "PMU Poker",
    "unibet": "Unibet"
  }

  return roomMap[roomRaw] || (value || "Inconnu").trim()
}

function normalizeGameType(value) {
  const raw = (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")

  const map = {
    mtt: "MTT",
    tournoi: "MTT",
    tournament: "MTT",
    "cash game": "Cash Game",
    cash: "Cash Game",
    "sit & go": "Sit & Go",
    sitngo: "Sit & Go",
    sng: "Sit & Go",
    spin: "Spin",
    spins: "Spin",
    satellite: "Satellite",
    sat: "Satellite"
  }

  return map[raw] || (value || "MTT").trim()
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0
  const normalized = String(value).replace(",", ".").replace(/[^\d.-]/g, "")
  const result = Number(normalized)
  return Number.isFinite(result) ? result : 0
}

function parseDate(value) {
  if (!value) return null

  const raw = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10)
  }

  const frMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (frMatch) {
    const [, dd, mm, yyyy] = frMatch
    return `${yyyy}-${mm}-${dd}`
  }

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return null
}

function getValue(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key]
    }
  }
  return ""
}

export default function ImportPage() {
  const router = useRouter()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
      setSessionChecked(true)
    }

    checkSession()
  }, [router])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setError("")
    setMessage("")

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRows = results.data || []
        setRows(parsedRows)
        setPreview(parsedRows.slice(0, 8))
      },
      error: () => {
        setError("Impossible de lire le fichier CSV.")
      }
    })
  }

  async function handleImport() {
    if (!currentUser?.id) {
      setError("Utilisateur non connecté.")
      return
    }

    if (!rows.length) {
      setError("Aucune ligne à importer.")
      return
    }

    setLoading(true)
    setError("")
    setMessage("")

    try {
      const payload = rows
        .map((row) => {
          const date = parseDate(
            getValue(row, ["date", "Date", "played_at", "Played At", "jour"])
          )

          const room = normalizeRoom(
            getValue(row, ["room", "Room", "site", "Site", "platform"])
          )

          const game_type = normalizeGameType(
            getValue(row, ["game_type", "Game Type", "type", "Type", "format"])
          )

          const buyin = parseNumber(
            getValue(row, ["buyin", "Buy-in", "buy_in", "inscription"])
          )

          const profit = parseNumber(
            getValue(row, ["profit", "Profit", "net", "Net", "result", "Résultat"])
          )

          const ev = parseNumber(
            getValue(row, ["ev", "EV", "allin_ev", "All-in EV"])
          )

          const duration_minutes = parseNumber(
            getValue(row, ["duration_minutes", "Duration", "duration", "Durée"])
          )

          const note = getValue(row, ["note", "Note", "notes", "Notes"]) || ""

          if (!date) return null

          return {
            user_id: currentUser.id,
            date,
            room,
            game_type,
            buyin,
            profit,
            ev,
            duration_minutes,
            note
          }
        })
        .filter(Boolean)

      if (!payload.length) {
        throw new Error("Aucune ligne valide après parsing.")
      }

      const { error: insertError } = await supabase.from("tournois").insert(payload)

      if (insertError) {
        throw insertError
      }

      setMessage(`${payload.length} tournois importés avec succès.`)
      setRows([])
      setPreview([])
    } catch (err) {
      console.error(err)
      setError(err.message || "Erreur pendant l'import.")
    } finally {
      setLoading(false)
    }
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
        <div className="topbar" style={{ marginBottom: 24 }}>
          <div className="brand">
            <div className="brand-mark">PT</div>
            <div className="brand-text">
              <div className="brand-title">Importer des tournois</div>
              <div className="brand-subtitle">
                {currentUser?.email || "Import CSV"}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/">
              <button className="btn btn-secondary">Retour dashboard</button>
            </Link>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="section-title">Upload CSV</h3>
          <p className="section-subtitle">
            Charge un CSV et importe automatiquement tes résultats dans le tracker.
          </p>

          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="input"
            style={{ marginBottom: 16 }}
          />

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              className="btn"
              onClick={handleImport}
              disabled={loading || !rows.length}
            >
              {loading ? "Import en cours..." : "Importer les tournois"}
            </button>
          </div>

          {message ? (
            <p style={{ color: "#62d394", marginTop: 16 }}>{message}</p>
          ) : null}

          {error ? (
            <p style={{ color: "#ff8b8b", marginTop: 16 }}>{error}</p>
          ) : null}
        </div>

        <div className="card">
          <h3 className="section-title">Aperçu</h3>

          {!preview.length ? (
            <p className="section-subtitle">Aucun fichier chargé pour le moment.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {Object.keys(preview[0]).map((key) => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index}>
                      {Object.keys(preview[0]).map((key) => (
                        <td key={key}>{String(row[key] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}