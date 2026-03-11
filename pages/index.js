import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Home() {
  const [stats, setStats] = useState({
    profit: 0,
    buyins: 0,
    count: 0,
    mouvementsImpact: 0
  })

  const [chartData, setChartData] = useState([])
  const [buyinStats, setBuyinStats] = useState([])
  const [roomStats, setRoomStats] = useState([])
  const [startingBankroll, setStartingBankroll] = useState(0)
  const [inputBankroll, setInputBankroll] = useState("")

  useEffect(() => {
    const savedBankroll = localStorage.getItem("startingBankroll")
    const initialBankroll = savedBankroll ? Number(savedBankroll) : 0

    if (savedBankroll) {
      setStartingBankroll(initialBankroll)
      setInputBankroll(savedBankroll)
    }

    fetchStats(initialBankroll)
  }, [])

  async function fetchStats(baseBankroll = 0) {
    const { data: tournoisData, error: tournoisError } = await supabase
      .from("tournois")
      .select("*")
      .order("date", { ascending: true })

    if (tournoisError) {
      console.error(tournoisError)
      return
    }

    const { data: mouvementsData, error: mouvementsError } = await supabase
      .from("mouvements")
      .select("*")
      .order("date", { ascending: true })

    if (mouvementsError) {
      console.error(mouvementsError)
      return
    }

    const tournois = tournoisData || []
    const mouvements = mouvementsData || []

    let profit = 0
    let buyins = 0
    const grouped = {}
    const rooms = {}

    tournois.forEach((t) => {
      const tournoiProfit = Number(t.profit) || 0
      const tournoiBuyin = Number(t.buyin) || 0
      const room = t.room || "Inconnu"

      profit += tournoiProfit
      buyins += tournoiBuyin

      const buyinKey = tournoiBuyin.toString()

      if (!grouped[buyinKey]) {
        grouped[buyinKey] = {
          buyin: tournoiBuyin,
          count: 0,
          totalProfit: 0,
          totalBuyins: 0
        }
      }

      grouped[buyinKey].count += 1
      grouped[buyinKey].totalProfit += tournoiProfit
      grouped[buyinKey].totalBuyins += tournoiBuyin

      if (!rooms[room]) {
        rooms[room] = {
          room,
          count: 0,
          totalProfit: 0,
          totalBuyins: 0
        }
      }

      rooms[room].count += 1
      rooms[room].totalProfit += tournoiProfit
      rooms[room].totalBuyins += tournoiBuyin
    })

    let mouvementsImpact = 0

    mouvements.forEach((m) => {
      const montant = Number(m.montant) || 0

      if (["depot", "ajout"].includes(m.type)) {
        mouvementsImpact += montant
      }

      if (["retrait", "cashout", "depense"].includes(m.type)) {
        mouvementsImpact -= montant
      }
    })

    let runningBankroll = Number(baseBankroll) || 0

    const events = [
      ...tournois.map((t) => ({
        date: t.date,
        type: "tournoi",
        variation: Number(t.profit) || 0
      })),
      ...mouvements.map((m) => ({
        date: m.date,
        type: "mouvement",
        variation: ["depot", "ajout"].includes(m.type)
          ? Number(m.montant) || 0
          : -1 * (Number(m.montant) || 0)
      }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date))

    const chart = events.map((event, index) => {
      runningBankroll += event.variation

      return {
        id: index + 1,
        date: event.date,
        bankroll: runningBankroll,
        variation: event.variation,
        type: event.type
      }
    })

    const buyinArray = Object.values(grouped)
      .map((item) => ({
        ...item,
        roi:
          item.totalBuyins > 0
            ? ((item.totalProfit / item.totalBuyins) * 100).toFixed(1)
            : "0.0"
      }))
      .sort((a, b) => a.buyin - b.buyin)

    const roomArray = Object.values(rooms)
      .map((item) => ({
        ...item,
        roi:
          item.totalBuyins > 0
            ? ((item.totalProfit / item.totalBuyins) * 100).toFixed(1)
            : "0.0"
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit)

    setStats({
      profit,
      buyins,
      count: tournois.length,
      mouvementsImpact
    })

    setChartData(chart)
    setBuyinStats(buyinArray)
    setRoomStats(roomArray)
  }

  function saveStartingBankroll() {
    const value = Number(inputBankroll) || 0
    localStorage.setItem("startingBankroll", value.toString())
    setStartingBankroll(value)
    fetchStats(value)
  }

  const roi =
    stats.buyins > 0 ? ((stats.profit / stats.buyins) * 100).toFixed(1) : 0

  const currentBankroll =
    startingBankroll + stats.profit + stats.mouvementsImpact

  return (
    <div className="page">
      <div className="container">
        <div className="hero">
          <div>
            <h1 className="title">Poker Tracker</h1>
            <p className="subtitle">
              Ton cockpit bankroll, résultats et performance.
            </p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Bankroll de départ</h3>
          <div className="actions">
            <input
              className="input"
              style={{ maxWidth: 260 }}
              type="number"
              value={inputBankroll}
              onChange={(e) => setInputBankroll(e.target.value)}
              placeholder="Entrez votre bankroll de départ"
            />
            <button className="btn" onClick={saveStartingBankroll}>
              Enregistrer
            </button>
          </div>
        </div>

        <div className="grid grid-4" style={{ marginBottom: 22 }}>
          <div className="kpi">
            <div className="kpi-label">Bankroll actuelle</div>
            <div className="kpi-value">{currentBankroll} €</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Profit total</div>
            <div className="kpi-value">{stats.profit} €</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Impact des mouvements</div>
            <div className="kpi-value">{stats.mouvementsImpact} €</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">ROI global</div>
            <div className="kpi-value">{roi} %</div>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card chart-card">
            <h3 className="section-title">Courbe de bankroll</h3>
            <ResponsiveContainer width="100%" height="88%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" />
                <XAxis dataKey="date" stroke="#aab2c5" />
                <YAxis stroke="#aab2c5" />
                <Tooltip
                  formatter={(value) => [`${value} €`, "Bankroll"]}
                  labelFormatter={(label) => `Date : ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="bankroll"
                  stroke="#8b7cf6"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="section-title">Vue rapide</h3>
            <div className="grid" style={{ gap: 14 }}>
              <div className="kpi">
                <div className="kpi-label">Buy-ins totaux</div>
                <div className="kpi-value">{stats.buyins} €</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Tournois joués</div>
                <div className="kpi-value">{stats.count}</div>
              </div>
            </div>

            <div className="spacer" />

            <div className="actions">
              <Link href="/add">
                <button className="btn">Ajouter un tournoi</button>
              </Link>

              <Link href="/history">
                <button className="btn btn-secondary">Historique tournois</button>
              </Link>

              <Link href="/movements-add">
                <button className="btn btn-secondary">Ajouter un mouvement</button>
              </Link>

              <Link href="/movements-history">
                <button className="btn btn-secondary">Historique mouvements</button>
              </Link>
            </div>
          </div>
        </div>

        <div className="spacer" />

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 className="section-title">Stats par buy-in</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Buy-in</th>
                  <th>Tournois</th>
                  <th>Profit total</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {buyinStats.map((item) => (
                  <tr key={item.buyin}>
                    <td>{item.buyin} €</td>
                    <td>{item.count}</td>
                    <td className={item.totalProfit >= 0 ? "stat-positive" : "stat-negative"}>
                      {item.totalProfit} €
                    </td>
                    <td>{item.roi} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Profit par room</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Tournois</th>
                  <th>Profit total</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {roomStats.map((item) => (
                  <tr key={item.room}>
                    <td>{item.room}</td>
                    <td>{item.count}</td>
                    <td className={item.totalProfit >= 0 ? "stat-positive" : "stat-negative"}>
                      {item.totalProfit} €
                    </td>
                    <td>{item.roi} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}