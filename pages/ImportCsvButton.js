import { useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "../lib/supabaseClient";

export default function ImportCsvButton({ user, onImportDone }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data || [];

          const mappedRows = rows
            .map((row) => {
              const buyin = parseFloat(
                String(row.buyin || row.BuyIn || row["Buy-in"] || "0")
                  .replace("€", "")
                  .replace("$", "")
                  .replace(",", ".")
              );

              const profit = parseFloat(
                String(row.profit || row.Profit || row.Result || "0")
                  .replace("€", "")
                  .replace("$", "")
                  .replace(",", ".")
              );

              const ev = parseFloat(
                String(row.ev || row.EV || row["Net Won"] || "0")
                  .replace("€", "")
                  .replace("$", "")
                  .replace(",", ".")
              );

              const durationMinutes = parseInt(
                String(
                  row.duration_minutes ||
                    row.duration ||
                    row["Duration (min)"] ||
                    "0"
                ),
                10
              );

              const gameType =
                row.game_type ||
                row.gameType ||
                row.format ||
                row["Game Type"] ||
                "MTT";

              const room =
                row.room ||
                row.Room ||
                row.site ||
                row["Poker Room"] ||
                "Inconnue";

              const dateValue =
                row.date || row.Date || row["Tournament Date"] || null;

              if (!dateValue) return null;

              return {
                user_id: user.id,
                date: new Date(dateValue).toISOString(),
                room,
                game_type: gameType,
                buyin: Number.isNaN(buyin) ? 0 : buyin,
                profit: Number.isNaN(profit) ? 0 : profit,
                ev: Number.isNaN(ev) ? 0 : ev,
                duration_minutes: Number.isNaN(durationMinutes)
                  ? 0
                  : durationMinutes,
                note: row.note || row.Note || "Import CSV",
              };
            })
            .filter(Boolean);

          if (!mappedRows.length) {
            setMessage("Aucune ligne valide trouvée dans le CSV.");
            setLoading(false);
            return;
          }

          const { error } = await supabase.from("tournois").insert(mappedRows);

          if (error) throw error;

          setMessage(`${mappedRows.length} tournois importés avec succès.`);
          if (onImportDone) onImportDone();
        } catch (err) {
          console.error(err);
          setMessage("Erreur pendant l’import CSV.");
        } finally {
          setLoading(false);
          e.target.value = "";
        }
      },
      error: (err) => {
        console.error(err);
        setMessage("Impossible de lire le fichier CSV.");
        setLoading(false);
      },
    });
  };

  return (
    <div>
      <button
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
  );
}