import { useState, useEffect } from 'react'
import SunCalc from 'suncalc'
import './App.css'
import {
  formatDisplayDate,
  formatTime,
  formatDayLength,
  getDateKey
} from './dataUtils'

const DAYS_COUNT = 90
const REFERENCE_LATITUDE = Number(import.meta.env.LATITUDE)
const REFERENCE_LONGITUDE = Number(import.meta.env.LONGITUDE)
const LOCATION_RANGE = 0.5

const getMoonPhaseName = (phase) => {
  const epsilon = 0.03

  if (phase < epsilon || phase > 1 - epsilon) return 'New Moon'
  if (Math.abs(phase - 0.25) < epsilon) return 'First Quarter'
  if (Math.abs(phase - 0.5) < epsilon) return 'Full Moon'
  if (Math.abs(phase - 0.75) < epsilon) return 'Last Quarter'
  if (phase < 0.25) return 'Waxing Crescent'
  if (phase < 0.5) return 'Waxing Gibbous'
  if (phase < 0.75) return 'Waning Gibbous'
  return 'Waning Crescent'
}

const isWithinReferenceRange = (latitude, longitude) =>
  Math.abs(latitude - REFERENCE_LATITUDE) <= LOCATION_RANGE &&
  Math.abs(longitude - REFERENCE_LONGITUDE) <= LOCATION_RANGE

const parseCsvRows = (text) => {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines[0].split(',')

  return lines.slice(1).map((line) => {
    const values = line.split(',')
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || ''
      return row
    }, {})
  })
}

const sliceRowsFromToday = (rows) => {
  const todayKey = getDateKey(new Date())
  const startIndex = rows.findIndex((row) => row.date === todayKey)

  if (startIndex === -1) return rows.slice(0, DAYS_COUNT)

  return rows.slice(startIndex, startIndex + DAYS_COUNT)
}

const loadCsvRows = async () => {
  const [sunResponse, moonResponse] = await Promise.all([
    fetch('/sun.csv'),
    fetch('/moon.csv')
  ])
  const [sunText, moonText] = await Promise.all([
    sunResponse.text(),
    moonResponse.text()
  ])

  return {
    sunRows: sliceRowsFromToday(parseCsvRows(sunText)),
    moonRows: sliceRowsFromToday(parseCsvRows(moonText))
  }
}

const buildRowsFromSunCalc = (latitude, longitude) => {
  const today = new Date()
  const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const sunRows = []
  const moonRows = []

  for (let i = 0; i < DAYS_COUNT; i += 1) {
    const date = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() + i
    )
    const dateKey = getDateKey(date)
    const sunTimes = SunCalc.getTimes(date, latitude, longitude)
    const moonIllumination = SunCalc.getMoonIllumination(date)
    const moonTimes = SunCalc.getMoonTimes(date, latitude, longitude)

    sunRows.push({
      date: dateKey,
      astronomical_dawn: formatTime(sunTimes.nightEnd),
      nautical_dawn: formatTime(sunTimes.nauticalDawn),
      civil_dawn: formatTime(sunTimes.dawn),
      sunrise_geometric: formatTime(sunTimes.sunrise),
      solar_noon: formatTime(sunTimes.solarNoon),
      sunset_geometric: formatTime(sunTimes.sunset),
      civil_dusk: formatTime(sunTimes.dusk),
      nautical_dusk: formatTime(sunTimes.nauticalDusk),
      astronomical_dusk: formatTime(sunTimes.night),
      day_length: formatDayLength(sunTimes.sunrise, sunTimes.sunset)
    })

    moonRows.push({
      date: dateKey,
      phase_name: getMoonPhaseName(moonIllumination.phase),
      illumination: Math.round(moonIllumination.fraction * 100),
      moon_rise: formatTime(moonTimes.rise),
      moon_set: formatTime(moonTimes.set)
    })
  }

  return { sunRows, moonRows }
}

function App() {
  const [sunData, setSunData] = useState([])
  const [moonData, setMoonData] = useState([])
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const todayIndex = 0

  const loadRows = async (latitude, longitude) => {
    const { sunRows, moonRows } = isWithinReferenceRange(latitude, longitude)
      ? await loadCsvRows()
      : buildRowsFromSunCalc(latitude, longitude)

    setSunData(sunRows)
    setMoonData(moonRows)
    setCurrentIndex(0)
    setStatus('ready')
  }

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }

    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        loadRows(latitude, longitude).catch((error) => {
          setStatus('error')
          setErrorMessage(error.message || 'Unable to load solar and lunar data.')
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied')
        } else {
          setStatus('error')
          setErrorMessage(error.message || 'Unable to access your location.')
        }
      }
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  if (status !== 'ready') {
    const title =
      status === 'loading'
        ? 'Requesting location…'
        : status === 'denied'
          ? 'Location required'
          : status === 'unsupported'
            ? 'Location not supported'
            : 'Unable to load data'

    const message =
      status === 'denied'
        ? 'We need your location to calculate solar and lunar times.'
        : status === 'unsupported'
          ? 'This browser does not support location access.'
          : status === 'error'
            ? errorMessage || 'Unable to load solar and lunar data.'
            : ''

    const canRequest = status === 'denied' || status === 'error'
    const actionLabel = 'Try again'

    return (
      <div className="loading">
        <div className="status-card">
          <h3>{title}</h3>
          {message && <p>{message}</p>}
          {canRequest && (
            <button className="action-button" onClick={requestLocation}>
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    )
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
  const formattedDate = formatDisplayDate(sunRow.date)

  return (
    <div className="app">
      <div className={`day-card ${isToday ? 'today' : ''}`}>
        <div className="date">
          <h3>{formattedDate}</h3>
        </div>

        <div className="times-grid">
          <div className="sun-times">
            <h4>☀️ Solar Times</h4>
            <div className="time-row">
              <span>Astronomical Dawn</span>
              <span>{sunRow.astronomical_dawn}</span>
            </div>
            <div className="time-row">
              <span>Nautical Dawn</span>
              <span>{sunRow.nautical_dawn}</span>
            </div>
            <div className="time-row">
              <span>Civil Dawn</span>
              <span>{sunRow.civil_dawn}</span>
            </div>
            <div className="time-row">
              <span>Sunrise</span>
              <span>{sunRow.sunrise_geometric}</span>
            </div>
            <div className="time-row">
              <span>Solar Noon</span>
              <span>{sunRow.solar_noon}</span>
            </div>
            <div className="time-row">
              <span>Sunset</span>
              <span>{sunRow.sunset_geometric}</span>
            </div>
            <div className="time-row">
              <span>Civil Dusk</span>
              <span>{sunRow.civil_dusk}</span>
            </div>
            <div className="time-row">
              <span>Nautical Dusk</span>
              <span>{sunRow.nautical_dusk}</span>
            </div>
            <div className="time-row">
              <span>Astronomical Dusk</span>
              <span>{sunRow.astronomical_dusk}</span>
            </div>
            <div className="time-row">
              <span>Day Length</span>
              <span>{sunRow.day_length}</span>
            </div>
          </div>

          <div className="moon-times">
            <h4>🌙 Lunar Times</h4>
            {moonRow && (
              <>
                <div className="time-row">
                  <span>Phase</span>
                  <span>{moonRow.phase_name}</span>
                </div>
                <div className="time-row">
                  <span>Illumination</span>
                  <span>{moonRow.illumination}%</span>
                </div>
                <div className="time-row">
                  <span>Moonrise</span>
                  <span>{moonRow.moon_rise}</span>
                </div>
                <div className="time-row">
                  <span>Moonset</span>
                  <span>{moonRow.moon_set}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="navigation">
        <button onClick={goToPrevious} disabled={currentIndex === 0}>
          ←
        </button>
        <button onClick={goToToday} className={isToday ? 'active' : ''}>
          Today
        </button>
        <button onClick={goToNext} disabled={currentIndex === sunData.length - 1}>
          →
        </button>
      </div>
    </div>
  )
}

export default App
