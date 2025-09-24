import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [sunData, setSunData] = useState([])
  const [moonData, setMoonData] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayIndex, setTodayIndex] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sunResponse, moonResponse] = await Promise.all([
          fetch('/sun.csv'),
          fetch('/moon.csv')
        ])

        const sunText = await sunResponse.text()
        const moonText = await moonResponse.text()

        const parseSunCSV = (csv) => {
          const lines = csv.trim().split(/\r?\n/)
          const headers = lines[0].split(',').map(h => h.trim())
          return lines.slice(1).map(line => {
            const values = line.split(',')
            const obj = {}
            headers.forEach((header, index) => {
              obj[header] = values[index]?.trim()
            })
            return obj
          })
        }

        const parseMoonCSV = (csv) => {
          const lines = csv.trim().split(/\r?\n/)
          const headers = lines[0].split(',').map(h => h.trim())
          return lines.slice(1).map(line => {
            const values = line.split(',')
            const obj = {}
            headers.forEach((header, index) => {
              obj[header] = values[index]?.trim()
            })
            return obj
          })
        }

        const sunParsed = parseSunCSV(sunText)
        const moonParsed = parseMoonCSV(moonText)

        setSunData(sunParsed)
        setMoonData(moonParsed)

        // Find today's index
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '/')
        const index = sunParsed.findIndex(row => row.date === today)
        if (index !== -1) {
          setTodayIndex(index)
          setCurrentIndex(index)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    setCurrentIndex(todayIndex)
  }, [todayIndex])

  if (loading) {
    return <div className="loading">Loading solar and lunar data...</div>
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentIndex < sunData.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const goToToday = () => {
    setCurrentIndex(todayIndex)
  }

  if (sunData.length === 0) return null

  const sunRow = sunData[currentIndex]
  const moonRow = moonData[currentIndex]
  const isToday = currentIndex === todayIndex

  return (
    <div className="app">
      <div className={`day-card ${isToday ? 'today' : ''}`}>
        <div className="date">
          <h3>{sunRow.date}</h3>
          {isToday && <span className="today-badge">Today</span>}
        </div>

        <div className="times-grid">
          <div className="sun-times">
            <h4>☀️ Solar Times</h4>
            <div className="time-row">
              <span>Astronomical Dawn:</span>
              <span>{sunRow.astronomical_dawn}</span>
            </div>
            <div className="time-row">
              <span>Nautical Dawn:</span>
              <span>{sunRow.nautical_dawn}</span>
            </div>
            <div className="time-row">
              <span>Civil Dawn:</span>
              <span>{sunRow.civil_dawn}</span>
            </div>
            <div className="time-row">
              <span>Sunrise:</span>
              <span>{sunRow.sunrise_geometric}</span>
            </div>
            <div className="time-row">
              <span>Solar Noon:</span>
              <span>{sunRow.solar_noon}</span>
            </div>
            <div className="time-row">
              <span>Sunset:</span>
              <span>{sunRow.sunset_geometric}</span>
            </div>
            <div className="time-row">
              <span>Civil Dusk:</span>
              <span>{sunRow.civil_dusk}</span>
            </div>
            <div className="time-row">
              <span>Nautical Dusk:</span>
              <span>{sunRow.nautical_dusk}</span>
            </div>
            <div className="time-row">
              <span>Astronomical Dusk:</span>
              <span>{sunRow.astronomical_dusk}</span>
            </div>
            <div className="time-row">
              <span>Day Length:</span>
              <span>{sunRow.day_length}</span>
            </div>
          </div>

          <div className="moon-times">
            <h4>🌙 Lunar Times</h4>
            {moonRow && (
              <>
                <div className="time-row">
                  <span>Phase:</span>
                  <span>{moonRow.phase_name}</span>
                </div>
                <div className="time-row">
                  <span>Illumination:</span>
                  <span>{moonRow.illumination}%</span>
                </div>
                <div className="time-row">
                  <span>Moonrise:</span>
                  <span>{moonRow.moon_rise}</span>
                </div>
                <div className="time-row">
                  <span>Moonset:</span>
                  <span>{moonRow.moon_set}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="navigation">
        <button onClick={goToPrevious} disabled={currentIndex === 0}>
          ← Previous
        </button>
        <button onClick={goToToday} className={isToday ? 'active' : ''}>
          Today
        </button>
        <button onClick={goToNext} disabled={currentIndex === sunData.length - 1}>
          Next →
        </button>
      </div>
    </div>
  )
}

export default App
