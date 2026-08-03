import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { computeSnapshot } from './astro'
import { formatDisplayDate, formatEventInstant } from './dataUtils'

const REFRESH_MS = 30_000

function App() {
  const [coords, setCoords] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const refreshSnapshot = useCallback((latitude, longitude) => {
    setSnapshot(computeSnapshot(latitude, longitude, new Date()))
    setStatus('ready')
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }

    setStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setCoords({ latitude, longitude })
        refreshSnapshot(latitude, longitude)
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
  }, [refreshSnapshot])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    if (!coords) return undefined

    const tick = () => refreshSnapshot(coords.latitude, coords.longitude)
    const intervalId = window.setInterval(tick, REFRESH_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [coords, refreshSnapshot])

  if (status !== 'ready' || !snapshot) {
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

    return (
      <div className="loading">
        <div className="status-card">
          <h3>{title}</h3>
          {message && <p>{message}</p>}
          {canRequest && (
            <button className="action-button" onClick={requestLocation}>
              Try again
            </button>
          )}
        </div>
      </div>
    )
  }

  const { now, solarEvents, dayLength, lunar } = snapshot

  return (
    <div className="app">
      <div className="day-card today">
        <div className="date">
          <h3>{formatDisplayDate(now)}</h3>
          <span className="today-badge">Upcoming</span>
        </div>

        <div className="times-grid">
          <div className="sun-times">
            <h4>☀️ Solar Times</h4>
            {solarEvents.length === 0 ? (
              <div className="time-row">
                <span>No upcoming solar events</span>
                <span>—</span>
              </div>
            ) : (
              solarEvents.map((event) => (
                <div className="time-row" key={event.id}>
                  <span>{event.label}</span>
                  <span>{formatEventInstant(event.time, now, event.azimuth)}</span>
                </div>
              ))
            )}
            <div className="time-row">
              <span>Day Length</span>
              <span>{dayLength}</span>
            </div>
          </div>

          <div className="moon-times">
            <h4>🌙 Lunar Times</h4>
            <div className="time-row">
              <span>Phase</span>
              <span>{lunar.phaseName}</span>
            </div>
            <div className="time-row">
              <span>Illumination</span>
              <span>{lunar.illumination}%</span>
            </div>
            {lunar.nextRise && (
              <div className="time-row">
                <span>Moonrise</span>
                <span>
                  {formatEventInstant(lunar.nextRise.time, now, lunar.nextRise.azimuth)}
                </span>
              </div>
            )}
            {lunar.nextSet && (
              <div className="time-row">
                <span>Moonset</span>
                <span>
                  {formatEventInstant(lunar.nextSet.time, now, lunar.nextSet.azimuth)}
                </span>
              </div>
            )}
            {!lunar.nextRise && !lunar.nextSet && (
              <div className="time-row">
                <span>No rise/set soon</span>
                <span>—</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
