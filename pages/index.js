import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from "../lib/supabaseClient"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

export default function Home() {
  const router = useRouter()

  const [sessionChecked, setSessionChecked] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const [stats, setStats] = useState({
    profit: 0,
    buyins: 0,
    count: 0,
    mouvementsImpact: 0,
    abi: 0,
    averageProfit: 0,
    bestRoom: null,
    worstRoom: null,
    bestBuyin: null,
    worstBuyin: null
  })

  const [chartData, setChartData] = useState([])
  const [monthlyData, setMonthlyData] = useState([])
  const [buyinStats, setBuyinStats] = useState([])
  const [roomStats, setRoomStats] = useState([])
  const [roomChartData, setRoomChartData] = useState([])
  const [roomOptions, setRoomOptions] = useState([])
  const [selectedRoom, setSelectedRoom] = useState("Toutes")
  const [weekdayStats, setWeekdayStats] = useState([])
  const [startingBankroll, setStartingBankroll] = useState(0)
  const [inputBankroll, setInputBankroll] = useState("")

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (!session) {
        router.push("/login")
        return
      }

      setCurrentUser(session.user)

      const savedBankroll = localStorage.getItem("startingBankroll")
      const initialBankroll = savedBankroll ? Number(savedBankroll) : 0
      const savedRoom = localStorage.getItem("selectedRoom")

      if (savedBankroll) {
        setStartingBankroll(initialBankroll)
        setInputBankroll(savedBankroll)
      }

      if (savedRoom) {
        setSelectedRoom(savedRoom)
      }

      await fetchStats(initialBankroll, savedRoom || "Toutes")
      setSessionChecked(true)
    }

    checkSession()
  }, [router])

  function formatMonthKey(dateString) {
    const d = new Date(dateString)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    return `${year}-${month}`
  }

  function formatMonthLabel(monthKey) {
    const [year, month] = monthKey.split("-")
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc"
    ]
    return `${monthNames[Number(month) - 1]} ${year}`
  }

  function getFrenchWeekday(dateString) {
    const d = new Date(dateString)
    const dayNames = [
      "Dimanche",
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi"
    ]
    return dayNames[d.getDay()]
  }

  async function fetchStats(baseBankroll = 0, roomChoice = selectedRoom) {
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
    const months = {}
    const weekdays = {
      Lundi: { day: "Lundi", count: 0, profit: 0, buyins: 0 },
      Mardi: { day: "Mardi", count: 0, profit: 0, buyins: 0 },
      Mercredi: { day: "Mercredi", count: 0, profit: 0, buyins: 0 },
      Jeudi: { day: "Jeudi", count: 0, profit: 0, buyins: 0 },
      Vendredi: { day: "Vendredi", count: 0, profit: 0, buyins: 0 },
      Samedi: { day: "Samedi", count: 0, profit: 0, buyins: 0 },
      Dimanche: { day: "Dimanche", count: 0, profit: 0, buyins: 0 }
    }

    tournois.forEach((t) => {
      const tournoiProfit = Number(t.profit) || 0
      const tournoiBuyin = Number(t.buyin) || 0
      const room = t.room || "Inconnu"
      const monthKey = formatMonthKey(t.date)
      const weekday = getFrenchWeekday(t.date)

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

      if (!months[monthKey]) {
        months[monthKey] = {
          monthKey,
          label: formatMonthLabel(monthKey),
          profit: 0,
          volume: 0,
          buyins: 0,
          abi: 0,
          averageProfit: 0
        }
      }

      months[monthKey].profit += tournoiProfit
      months[monthKey].volume += 1
      months[monthKey].buyins += tournoiBuyin

      weekdays[weekday].count += 1
      weekdays[weekday].profit += tournoiProfit
      weekdays[weekday].buyins += tournoiBuyin
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

    const globalEvents = [
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

    const globalChart = globalEvents.map((event, index) => {
      runningBankroll += event.variation

      return {
        id: index + 1,
        date: event.date,
        bankroll: runningBankroll,
        variation: event.variation,
        type: event.type
      }
    })

    const monthlyArray = Object.values(months)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((item) => ({
        ...item,
        roi:
          item.buyins > 0 ? ((item.profit / item.buyins) * 100).toFixed(1) : "0.0",
        abi:
          item.volume > 0 ? (item.buyins / item.volume).toFixed(2) : "0.00",
        averageProfit:
          item.volume > 0 ? (item.profit / item.volume).toFixed(2) : "0.00"
      }))

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

    const weekdayOrder = [
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche"
    ]

    const weekdayArray = weekdayOrder.map((day) => {
      const item = weekdays[day]
      const dayRoi =
        item.buyins > 0 ? ((item.profit / item.buyins) * 100).toFixed(1) : "0.0"

      return {
        ...item,
        roi: dayRoi
      }
    })

    const uniqueRooms = ["Toutes", ...Object.keys(rooms).sort()]

    let filteredRoomChart = []

    if (roomChoice && roomChoice !== "Toutes") {
      let runningRoomBankroll = Number(baseBankroll) || 0

      const roomTournois = tournois.filter(
        (t) => (t.room || "Inconnu") === roomChoice
      )

      const roomEvents = roomTournois
        .map((t) => ({
          date: t.date,
          type: "tournoi",
          variation: Number(t.profit) || 0
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      filteredRoomChart = roomEvents.map((event, index) => {
        runningRoomBankroll += event.variation

        return {
          id: index + 1,
          date: event.date,
          bankroll: runningRoomBankroll,
          variation: event.variation
        }
      })
    }

    const abi = tournois.length > 0 ? (buyins / tournois.length).toFixed(2) : "0.00"
    const averageProfit =
      tournois.length > 0 ? (profit / tournois.length).toFixed(2) : "0.00"

    const bestRoom = roomArray.length > 0 ? roomArray[0] : null
    const worstRoom = roomArray.length > 0 ? roomArray[roomArray.length - 1] : null

    const sortedBuyinsByProfit = [...buyinArray].sort(
      (a, b) => b.totalProfit - a.totalProfit
    )
    const bestBuyin = sortedBuyinsByProfit.length > 0 ? sortedBuyinsByProfit[0] : null
    const worstBuyin =
      sortedBuyinsByProfit.length > 0
        ? sortedBuyinsByProfit[sortedBuyinsByProfit.length - 1]
        : null

    setStats({
      profit,
      buyins,
      count: tournois.length,
      mouvementsImpact,
      abi,
      averageProfit,
      bestRoom,
      worstRoom,
      bestBuyin,
      worstBuyin
    })

    setChartData(globalChart)
    setMonthlyData(monthlyArray)
    setBuyinStats(buyinArray)
    setRoomStats(roomArray)
    setRoomOptions(uniqueRooms)
    setRoomChartData(filteredRoomChart)
    setWeekdayStats(weekdayArray)
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      alert(error.message)
      return
    }

    router.push("/login")
  }

  function saveStartingBankroll() {
    const value = Number(inputBankroll) || 0
    localStorage.setItem("startingBankroll", value.toString())
    setStartingBankroll(value)
    fetchStats(value, selectedRoom)
  }

  function handleRoomChange(e) {
    const room = e.target.value
    setSelectedRoom(room)
    localStorage.setItem("selectedRoom", room)
    fetchStats(startingBankroll, room)
  }

  const roi =
    stats.buyins > 0 ? ((stats.profit / stats.buyins) * 100).toFixed(1) : 0

  const currentBankroll =
    startingBankroll + stats.profit + stats.mouvementsImpact

  const selectedRoomStats = useMemo(() => {
    return roomStats.find((r) => r.room === selectedRoom) || null
  }, [roomStats, selectedRoom])

  function getHeatmapStyle(item) {
    if (item.profit > 0) {
      return {
        background:
          "linear-gradient(180deg, rgba(46,204,113,0.20) 0%, rgba(46,204,113,0.10) 100%)",
        border: "1px solid rgba(46,204,113,0.40)"
      }
    }

    if (item.profit < 0) {
      return {
        background:
          "linear-gradient(180deg, rgba(255,107,107,0.20) 0%, rgba(255,107,107,0.10) 100%)",
        border: "1px solid rgba(255,107,107,0.40)"
      }
    }

    return {
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid var(--border)"
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
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">PT</div>
            <div className="brand-text">
              <div className="brand-title">Poker Tracker</div>
              <div className="brand-subtitle">
                {currentUser?.user_metadata?.pseudo || currentUser?.email || "Dashboard premium de grind"}
              </div>
            </div>
          </div>

          <div className="actions">
            <Link href="/add">
              <button className="btn">Ajouter un tournoi</button>
            </Link>

            <Link href="/history">
              <button className="btn btn-secondary">Historique</button>
            </Link>

            <Link href="/movements-add">
              <button className="btn btn-secondary">Ajouter un mouvement</button>
            </Link>

            <button className="btn btn-secondary" onClick={handleLogout}>
              Déconnexion
            </button>
          </div>
        </div>

        <div className="hero">
          <div className="hero-grid">
            <div>
              <h1 className="hero-title">Ton cockpit bankroll, room, volume et ROI.</h1>
              <p className="hero-subtitle">
                Lis ta progression comme une joueuse sérieuse : courbes, ABI, profit par room,
                rythme mensuel et jours les plus rentables.
              </p>

              <div className="hero-badges">
                <div className="badge">Bankroll réelle</div>
                <div className="badge">ROI global</div>
                <div className="badge">Analyse par room</div>
                <div className="badge">Volume mensuel</div>
              </div>
            </div>

            <div className="hero-side">
              <div className="hero-side-card">
                <div className="hero-side-label">Bankroll actuelle</div>
                <div className="hero-side-value">{currentBankroll} €</div>
              </div>
              <div className="hero-side-card">
                <div className="hero-side-label">Profit total</div>
                <div className="hero-side-value">{stats.profit} €</div>
              </div>
              <div className="hero-side-card">
                <div className="hero-side-label">ROI global</div>
                <div className="hero-side-value">{roi} %</div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section card" style={{ marginBottom: 20 }}>
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

            <Link href="/movements-history">
              <button className="btn btn-secondary">Historique mouvements</button>
            </Link>
          </div>
        </div>

        <div className="grid grid-4 dashboard-section">
          <div className="kpi">
            <div className="kpi-label">Bankroll actuelle</div>
            <div className="kpi-value">{currentBankroll} €</div>
            <div className="kpi-meta">Inclut bankroll de départ + résultats + mouvements</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Impact des mouvements</div>
            <div className="kpi-value">{stats.mouvementsImpact} €</div>
            <div className="kpi-meta">Dépôts, retraits, cashout, dépenses</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">ABI</div>
            <div className="kpi-value">{stats.abi} €</div>
            <div className="kpi-meta">Average Buy-In global</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Profit moyen / tournoi</div>
            <div className="kpi-value">{stats.averageProfit} €</div>
            <div className="kpi-meta">Moyenne de gain ou perte par entrée</div>
          </div>
        </div>

        <div className="grid grid-4 dashboard-section">
          <div className="kpi">
            <div className="kpi-label">Tournois joués</div>
            <div className="kpi-value">{stats.count}</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Buy-ins totaux</div>
            <div className="kpi-value">{stats.buyins} €</div>
          </div>

          <div className="kpi">
            <div className="kpi-label">Meilleure room</div>
            <div className="kpi-value">{stats.bestRoom ? stats.bestRoom.room : "-"}</div>
            {stats.bestRoom && (
              <div className="kpi-meta">
                Profit {stats.bestRoom.totalProfit} € • ROI {stats.bestRoom.roi} %
              </div>
            )}
          </div>

          <div className="kpi">
            <div className="kpi-label">Pire room</div>
            <div className="kpi-value">{stats.worstRoom ? stats.worstRoom.room : "-"}</div>
            {stats.worstRoom && (
              <div className="kpi-meta">
                Profit {stats.worstRoom.totalProfit} € • ROI {stats.worstRoom.roi} %
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-2 dashboard-section">
          <div className="kpi">
            <div className="kpi-label">Meilleur buy-in</div>
            <div className="kpi-value">
              {stats.bestBuyin ? `${stats.bestBuyin.buyin} €` : "-"}
            </div>
            {stats.bestBuyin && (
              <div className="kpi-meta">
                Profit {stats.bestBuyin.totalProfit} € • ROI {stats.bestBuyin.roi} %
              </div>
            )}
          </div>

          <div className="kpi">
            <div className="kpi-label">Pire buy-in</div>
            <div className="kpi-value">
              {stats.worstBuyin ? `${stats.worstBuyin.buyin} €` : "-"}
            </div>
            {stats.worstBuyin && (
              <div className="kpi-meta">
                Profit {stats.worstBuyin.totalProfit} € • ROI {stats.worstBuyin.roi} %
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-2 dashboard-section">
          <div className="card chart-card">
            <h3 className="section-title">Courbe de bankroll globale</h3>
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

          <div className="card chart-card">
            <h3 className="section-title">Graphique mensuel</h3>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" />
                <XAxis dataKey="label" stroke="#aab2c5" />
                <YAxis stroke="#aab2c5" />
                <Tooltip formatter={(value) => [`${value} €`, "Profit mensuel"]} />
                <Bar dataKey="profit" fill="#4ea8de" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-2 dashboard-section">
          <div className="card chart-card">
            <h3 className="section-title">Volume mensuel</h3>
            <ResponsiveContainer width="100%" height="88%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" />
                <XAxis dataKey="label" stroke="#aab2c5" />
                <YAxis stroke="#aab2c5" />
                <Tooltip formatter={(value) => [value, "Tournois"]} />
                <Bar dataKey="volume" fill="#2ecc71" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3 className="section-title">ABI mensuel</h3>
            <ResponsiveContainer width="100%" height="88%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" />
                <XAxis dataKey="label" stroke="#aab2c5" />
                <YAxis stroke="#aab2c5" />
                <Tooltip formatter={(value) => [`${value} €`, "ABI mensuel"]} />
                <Line
                  type="monotone"
                  dataKey="abi"
                  stroke="#f5b041"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card dashboard-section">
          <h3 className="section-title">Heatmap des jours gagnants</h3>
          <p className="section-subtitle">
            Repère en un coup d’œil les jours où ton grind est le plus rentable.
          </p>

          <div className="heatmap-grid">
            {weekdayStats.map((item) => (
              <div
                key={item.day}
                className="heatmap-card"
                style={getHeatmapStyle(item)}
              >
                <div className="heatmap-day">{item.day}</div>
                <div className="heatmap-meta">Tournois : {item.count}</div>
                <div
                  className="heatmap-profit"
                  style={{ color: item.profit >= 0 ? "#62d394" : "#ff8b8b" }}
                >
                  {item.profit} €
                </div>
                <div className="heatmap-meta">ROI : {item.roi} %</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card chart-card dashboard-section">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 18,
              flexWrap: "wrap"
            }}
          >
            <h3 className="section-title" style={{ margin: 0 }}>
              Courbe par room
            </h3>

            <select
              className="select"
              style={{ maxWidth: 240 }}
              value={selectedRoom}
              onChange={handleRoomChange}
            >
              {roomOptions.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          {selectedRoom === "Toutes" ? (
            <p className="section-subtitle">
              Choisis une room pour afficher sa courbe dédiée.
            </p>
          ) : (
            <>
              {selectedRoomStats && (
                <div className="grid grid-4" style={{ marginBottom: 18 }}>
                  <div className="kpi">
                    <div className="kpi-label">Room</div>
                    <div className="kpi-value">{selectedRoomStats.room}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Tournois</div>
                    <div className="kpi-value">{selectedRoomStats.count}</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">Profit</div>
                    <div className="kpi-value">{selectedRoomStats.totalProfit} €</div>
                  </div>
                  <div className="kpi">
                    <div className="kpi-label">ROI</div>
                    <div className="kpi-value">{selectedRoomStats.roi} %</div>
                  </div>
                </div>
              )}

              <ResponsiveContainer width="100%" height="72%">
                <LineChart data={roomChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" />
                  <XAxis dataKey="date" stroke="#aab2c5" />
                  <YAxis stroke="#aab2c5" />
                  <Tooltip
                    formatter={(value) => [`${value} €`, "Bankroll room"]}
                    labelFormatter={(label) => `Date : ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="bankroll"
                    stroke="#2ecc71"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        <div className="card chart-card dashboard-section">
          <h3 className="section-title">Graphique profit par room</h3>
          <ResponsiveContainer width="100%" height="88%">
            <BarChart data={roomStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2b3244" />
              <XAxis dataKey="room" stroke="#aab2c5" />
              <YAxis stroke="#aab2c5" />
              <Tooltip
                formatter={(value) => [`${value} €`, "Profit"]}
                labelFormatter={(label) => `Room : ${label}`}
              />
              <Bar dataKey="totalProfit" fill="#f5b041" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-2 dashboard-section">
          <div className="card">
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
    </div>
  )
}