import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { computeSnapshot } from './astro'
import {
  formatAltitude,
  formatAzimuth,
  formatCountdown,
  formatEventInstant,
  formatMonthDay,
  formatShortTime,
  formatTimeRange,
  formatWeekdayShort,
} from './dataUtils'

const REFRESH_MS = 30_000

// Desktop browsers often grant permission but still fail a high-accuracy fix.
const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 15_000,
  maximumAge: 5 * 60_000,
}

const geoErrorMessage = (error) => {
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Location is on, but the browser could not get a position. Check system Location Services for this browser and try again.'
  }
  if (error.code === error.TIMEOUT) {
    return 'Timed out waiting for a location fix. Try again.'
  }
  return error.message || 'Unable to access your location.'
}

function App() {
  const [coords, setCoords] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

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
        setStatus('ready')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied')
          return
        }

        setStatus('error')
        setErrorMessage(geoErrorMessage(error))
      },
      GEO_OPTIONS
    )
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    if (!coords) return undefined

    const tick = () => {
      setSnapshot(computeSnapshot(coords.latitude, coords.longitude, new Date()))
    }
    tick()

    const intervalId = window.setInterval(tick, REFRESH_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [coords])

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

  const {
    sky,
    countdowns,
    goldenBlue,
    lunar,
    principalPhases,
    moonTransit,
    skyWindows,
  } = snapshot

  return (
    <div className="app">
      <section className="panel now-panel">
        <div className="panel-head">
          <h2>Now</h2>
          <span className={`band-pill band-${sky.sun.band.id}`}>{sky.sun.band.label}</span>
        </div>

        <div className="now-grid">
          <div className="sky-card">
            <h3>☀️ Sun</h3>
            <div className="metric-row">
              <span>Altitude</span>
              <span>{formatAltitude(sky.sun.altitude)}</span>
            </div>
            <div className="metric-row">
              <span>Azimuth</span>
              <span>{formatAzimuth(sky.sun.azimuth)}</span>
            </div>
          </div>

          <div className="sky-card">
            <h3>🌙 Moon</h3>
            <div className="metric-row">
              <span>Altitude</span>
              <span>{formatAltitude(sky.moon.altitude)}</span>
            </div>
            <div className="metric-row">
              <span>Azimuth</span>
              <span>{formatAzimuth(sky.moon.azimuth)}</span>
            </div>
            <div className="metric-row">
              <span>Status</span>
              <span>{sky.moon.isUp ? 'Up' : 'Down'}</span>
            </div>
            <div className="metric-row">
              <span>Phase</span>
              <span>{sky.moon.phaseName} · {sky.moon.illumination}%</span>
            </div>
          </div>
        </div>

        <div className="countdown-block">
          <h3>Next up</h3>
          {countdowns.length === 0 ? (
            <div className="time-row muted-row"><span>No upcoming events</span><span>—</span></div>
          ) : (
            countdowns.map((item) => (
              <div className="time-row countdown-row" key={item.id}>
                <span>{item.label}</span>
                <span>
                  <strong>{formatCountdown(item.time, snapshot.now)}</strong>
                  <span className="subtle"> · {formatShortTime(item.time)}</span>
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="panel hours-panel">
        <div className="times-grid compact">
          <div>
            <h3>Golden hour</h3>
            <div className="time-row">
              <span>Morning</span>
              <span>{formatTimeRange(goldenBlue.morningGolden?.start, goldenBlue.morningGolden?.end)}</span>
            </div>
            <div className="time-row">
              <span>Evening</span>
              <span>{formatTimeRange(goldenBlue.eveningGolden?.start, goldenBlue.eveningGolden?.end)}</span>
            </div>
          </div>
          <div>
            <h3>Blue hour</h3>
            <div className="time-row">
              <span>Morning</span>
              <span>{formatTimeRange(goldenBlue.morningBlue?.start, goldenBlue.morningBlue?.end)}</span>
            </div>
            <div className="time-row">
              <span>Evening</span>
              <span>{formatTimeRange(goldenBlue.eveningBlue?.start, goldenBlue.eveningBlue?.end)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="panel moon-panel">
        <div className="panel-head">
          <h2>Moon</h2>
        </div>

        <div className="times-grid compact">
          <div>
            <h3>Tonight</h3>
            {lunar.nextRise && (
              <div className="time-row">
                <span>Moonrise</span>
                <span>{formatEventInstant(lunar.nextRise.time, lunar.nextRise.azimuth)}</span>
              </div>
            )}
            {lunar.nextSet && (
              <div className="time-row">
                <span>Moonset</span>
                <span>{formatEventInstant(lunar.nextSet.time, lunar.nextSet.azimuth)}</span>
              </div>
            )}
            {moonTransit && (
              <div className="time-row">
                <span>Transit</span>
                <span>
                  {formatShortTime(moonTransit.time)} · {formatAltitude(moonTransit.altitude)}
                </span>
              </div>
            )}
          </div>

          <div>
            <h3>Next phases</h3>
            {principalPhases.map((phase) => (
              <div className="time-row" key={phase.id}>
                <span>{phase.name}</span>
                <span>
                  {formatMonthDay(phase.time)} · {formatShortTime(phase.time)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="windows-grid">
          <div>
            <h3>Moon after dark</h3>
            {skyWindows.moonWatch.length === 0 ? (
              <div className="time-row muted-row"><span>None soon</span><span>—</span></div>
            ) : (
              skyWindows.moonWatch.map((iv) => (
                <div className="time-row" key={`mw-${iv.start.getTime()}`}>
                  <span>{formatWeekdayShort(iv.start)}</span>
                  <span>{formatTimeRange(iv.start, iv.end)}</span>
                </div>
              ))
            )}
          </div>
          <div>
            <h3>Dark sky</h3>
            {skyWindows.darkSky.length === 0 ? (
              <div className="time-row muted-row"><span>None soon</span><span>—</span></div>
            ) : (
              skyWindows.darkSky.map((iv) => (
                <div className="time-row" key={`ds-${iv.start.getTime()}`}>
                  <span>{formatWeekdayShort(iv.start)}</span>
                  <span>{formatTimeRange(iv.start, iv.end)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
