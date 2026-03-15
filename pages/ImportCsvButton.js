import { useRef, useState } from "react"
import Papa from "papaparse"
import { supabase } from "../lib/supabaseClient"

function parseDateValue(dateValue) {
  if (!dateValue) return null

  const raw = String(dateValue).trim()

  if (!raw) return null

  // Format ISO ou déjà lisible par JS
  if (raw.includes("-")) {
    const isoDate = new Date(raw)
    if (!Number.isNaN(isoDate.getTime())) {
      return isoDate.toISOString()
    }
  }

  // Format français : DD/MM/YYYY ou DD/MM/YYYY HH:mm
  const frMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
  )

  if (frMatch) {
    const [, day, month, year, hour = "00", minute = "00"] = frMatch
    const isoString = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`
    const parsed = new Date(isoString)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  // Dernier essai
  const fallback = new Date(raw)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString()
  }

  return null
}

function parseMoney(value) {
  return parseFloat(
    String(value || "0")
      .replace(/[€$]/g, "")
      .replace(/\s/g, "")
      .replace(",", ".")
  )
}

export default function ImportCsvButton({ user, onImportDone }) {
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleButtonClick = () => {
    if (!user) {
      setMessage("Utilisateur non connecté.")
      return
    }

    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!user?.id) {
      setMessage("Utilisateur non connecté.")
      return
    }

    setLoading(true)
    setMessage("")

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data || []

          const mappedRows = rows
            .map((row) => {
              const buyin = parseMoney(
                row.buyin || row.BuyIn || row["Buy-in"] || 0
              )

              const profit = parseMoney(
                row.profit || row.Profit || row.Result || 0
              )

              const ev = parseMoney(
                row.ev || row.EV || row["Net Won"] || 0
              )

              const durationMinutes = parseInt(
                String(
                  row.duration_minutes ||
                  row.duration ||
                  row["Duration (min)"] ||
                  "0"
                ),
                10
              )

              const gameType =
                row.game_type ||
                row.gameType ||
                row.format ||
                row["Game Type"] ||
                "MTT"

              const room =
                row.room ||
                row.Room ||
                row.site ||
                row["Poker Room"] ||
                "Inconnue"

              const rawDate =
                row.date || row.Date || row["Tournament Date"] || null

              const parsedDate = parseDateValue(rawDate)

              if (!parsedDate) return null

              return {
                user_id: user.id,
                date: parsedDate,
                room: String(room).trim(),
                game_type: String(gameType).trim(),
                buyin: Number.isNaN(buyin) ? 0 : buyin,
                profit: Number.isNaN(profit) ? 0 : profit,
                ev: Number.isNaN(ev) ? 0 : ev,
                duration_minutes: Number.isNaN(durationMinutes)
                  ? 0
                  : durationMinutes,
                note: row.note || row.Note || "Import CSV"
              }
            })
            .filter(Boolean)

          if (!mappedRows.length) {
            setMessage("Aucune ligne valide trouvée dans le CSV.")
            setLoading(false)
            return
          }

          const { error } = await supabase.from("tournois").insert(mappedRows)

          if (error) {
            throw error
          }

          setMessage(`${mappedRows.length} tournois importés avec succès.`)

          if (onImportDone) {
            await onImportDone()
          }
        } catch (err) {
          console.error("Erreur import CSV :", err)
          setMessage(err.message || "Erreur pendant l’import CSV.")
        } finally {
          setLoading(false)
          e.target.value = ""
        }
      },
      error: (err) => {
        console.error("Erreur lecture CSV :", err)
        setMessage("Impossible de lire le fichier CSV.")
        setLoading(false)
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={loading}
        className="rounded-xl px-4 py-2 font-medium text-white bg-gradient-to-r from-violet-600 to-purple-500 hover:opacity-90 transition"
      >
        {loading ? "Import en cours..." : "Importer CSV"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  )
}