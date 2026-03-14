import { useState } from "react"
import Link from "next/link"
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
    "unibet": "Unibet",
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
    sat: "Satellite",
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
  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
      },
    })
  }

  async function handleImport() {
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
            date,
            room,
            game_type,
            buyin,
            profit,
            ev,
            duration_minutes,
            note,
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
      setError(err.message || "Erreur pendant l'import.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Importer des tournois</h1>
          <p className="section-subtitle">
            Charge un CSV et importe automatiquement tes résultats dans le tracker.
          </p>
        </div>

        <Link href="/" className="ghost-btn">
          Retour dashboard
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="section-title">Upload CSV</h3>

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="input"
          style={{ marginBottom: 16 }}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="primary-btn"
            onClick={handleImport}
            disabled={loading || !rows.length}
          >
            {loading ? "Import en cours..." : "Importer les tournois"}
          </button>
        </div>

        {message ? (
          <p style={{ color: "#6ee7b7", marginTop: 16 }}>{message}</p>
        ) : null}

        {error ? (
          <p style={{ color: "#fca5a5", marginTop: 16 }}>{error}</p>
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
  )
}