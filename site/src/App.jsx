import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { computeSnapshot, RUN_WINDOW_PRESETS } from './astro'
import {
  formatAltitude,
  formatAzimuth,
  formatCountdown,
  formatDisplayDate,
  formatEventInstant,
  formatMonthDay,
  formatShortTime,
  formatSignedDurationMs,
  formatTimeRange,
  formatWeekdayShort,
  parseIsoDate,
  toIsoDate,
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

const readDateFromUrl = () => {
  if (typeof window === 'undefined') return null
  return parseIsoDate(new URLSearchParams(window.location.search).get('date'))
}

const writeDateToUrl = (date) => {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (date) url.searchParams.set('date', toIsoDate(date))
  else url.searchParams.delete('date')
  window.history.replaceState({}, '', url)
}

const IntervalList = ({ items, empty }) => {
  if (!items?.length) {
    return <div className="time-row muted-row"><span>{empty}</span><span>—</span></div>
  }

  return items.map((iv) => (
    <div className="time-row" key={`${iv.start.getTime()}-${iv.end.getTime()}`}>
      <span>{formatDisplayDate(iv.start).split(',')[0]}</span>
      <span>{formatTimeRange(iv.start, iv.end)}</span>
    </div>
  ))
}

function App() {
  const [coords, setCoords] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => readDateFromUrl())
  const [runPreset, setRunPreset] = useState('civil')

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
      setSnapshot(computeSnapshot(coords.latitude, coords.longitude, new Date(), {
        date: selectedDate || undefined,
        runPreset,
      }))
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
  }, [coords, selectedDate, runPreset])
  const selectDay = (isoDate) => {
    const parsed = parseIsoDate(isoDate)
    if (!parsed) return
    const todayIso = toIsoDate(new Date())
    if (isoDate === todayIso) {
      setSelectedDate(null)
      writeDateToUrl(null)
    } else {
      setSelectedDate(parsed)
      writeDateToUrl(parsed)
    }
  }

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
    dayLengthTrend,
    goldenBlue,
    solarStrip,
    runWindow,
    lunar,
    principalPhases,
    moonTransit,
    skyWindows,
    calendar,
    dayDetail,
  } = snapshot

  const activeIso = dayDetail.isoDate
  const todayIso = toIsoDate(snapshot.now)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Solar & Lunar Times</h1>
        <p className="app-sub">Live sky · run windows · moon nights · week look-ahead</p>
      </header>

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

      <section className="panel run-panel">
        <div className="panel-head">
          <h2>Run planning</h2>
        </div>

        <div className="preset-row" role="group" aria-label="Good run window">
          {RUN_WINDOW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`chip ${runPreset === preset.id ? 'chip-active' : ''}`}
              onClick={() => setRunPreset(preset.id)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {runWindow && (
          <div className="callout">
            <div className="callout-label">
              {runWindow.status === 'active' ? 'Good window open' : 'Next good window'}
            </div>
            <div className="callout-value">
              {runWindow.status === 'active'
                ? `Until ${formatShortTime(runWindow.end)} · ${formatCountdown(runWindow.until, snapshot.now)}`
                : `${formatShortTime(runWindow.start)}–${formatShortTime(runWindow.end)} · ${formatCountdown(runWindow.until, snapshot.now)}`}
            </div>
          </div>
        )}

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

        <div className="day-length-row">
          <div>
            <span className="muted-label">Day length</span>
            <strong>{dayLengthTrend.today}</strong>
          </div>
          <div>
            <span className="muted-label">Change</span>
            <strong>{formatSignedDurationMs(dayLengthTrend.deltaMs)}</strong>
          </div>
        </div>

        <div className="strip-wrap">
          <h3>Next 7 days</h3>
          <div className="solar-strip" role="list">
            {solarStrip.map((day) => (
              <button
                type="button"
                key={day.isoDate}
                className={`strip-day ${day.isoDate === activeIso ? 'is-selected' : ''} ${day.isoDate === todayIso ? 'is-today' : ''}`}
                onClick={() => selectDay(day.isoDate)}
                role="listitem"
              >
                <span className="strip-wd">{formatWeekdayShort(day.date)}</span>
                <span className="strip-md">{formatMonthDay(day.date)}</span>
                <span className="strip-pair">
                  <span>{formatShortTime(day.sunrise)}</span>
                  <span>{formatShortTime(day.sunset)}</span>
                </span>
                <span className="strip-civil">
                  {formatShortTime(day.dawn)} · {formatShortTime(day.dusk)}
                </span>
                <span className="strip-len">{day.dayLength.slice(0, 5)}</span>
              </button>
            ))}
          </div>
          <p className="hint">Sunrise / sunset · civil dawn / dusk · day length. Tap a day for full detail.</p>
        </div>
      </section>

      <section className="panel moon-panel">
        <div className="panel-head">
          <h2>Moon watching</h2>
        </div>

        <div className="times-grid compact">
          <div>
            <h3>Tonight&apos;s moon</h3>
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
                <span>Transit (highest)</span>
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
            <div className="time-row">
              <span>Age</span>
              <span>{sky.moon.ageDays.toFixed(1)} days</span>
            </div>
          </div>
        </div>

        <div className="windows-grid">
          <div>
            <h3>Moon up after dark</h3>
            <p className="hint tight">Watch the moon: above the horizon after astronomical dusk.</p>
            <IntervalList items={skyWindows.moonWatch} empty="No moon-up night windows soon" />
          </div>
          <div>
            <h3>Dark sky</h3>
            <p className="hint tight">Moon below during night — best for stars.</p>
            <IntervalList items={skyWindows.darkSky} empty="No fully dark windows soon" />
          </div>
        </div>
      </section>

      <section className="panel calendar-panel">
        <div className="panel-head">
          <h2>Look-ahead</h2>
          <span className="panel-meta">14 days</span>
        </div>

        <div className="calendar-grid">
          {calendar.map((day) => (
            <button
              type="button"
              key={day.isoDate}
              className={`cal-day ${day.isoDate === activeIso ? 'is-selected' : ''} ${day.isoDate === todayIso ? 'is-today' : ''}`}
              onClick={() => selectDay(day.isoDate)}
            >
              <span className="cal-wd">{formatWeekdayShort(day.date)}</span>
              <span className="cal-md">{formatMonthDay(day.date)}</span>
              <span className="cal-phase" title={day.phaseName}>
                {day.illumination}%
              </span>
              <span className="cal-line">↑ {formatShortTime(day.sunrise)}</span>
              <span className="cal-line">↓ {formatShortTime(day.sunset)}</span>
              <span className="cal-line moon">
                ☾ {day.moonAlwaysUp ? 'up' : day.moonAlwaysDown ? 'down' : formatShortTime(day.moonrise)}
              </span>
            </button>
          ))}
        </div>

        <div className="day-detail day-card">
          <div className="panel-head">
            <h3>{formatDisplayDate(dayDetail.date)}</h3>
            {dayDetail.isoDate !== todayIso && (
              <button type="button" className="text-button" onClick={() => selectDay(todayIso)}>
                Back to today
              </button>
            )}
          </div>

          <div className="times-grid">
            <div className="sun-times">
              <h4>☀️ Solar</h4>
              {dayDetail.solarEvents.map((event) => (
                <div className={`time-row ${event.past ? 'is-past' : ''}`} key={event.id}>
                  <span>{event.label}</span>
                  <span>{formatEventInstant(event.time, event.azimuth)}</span>
                </div>
              ))}
              <div className="time-row">
                <span>Day length</span>
                <span>{dayDetail.dayLength}</span>
              </div>
              <div className="time-row">
                <span>Golden (am / pm)</span>
                <span>
                  {formatTimeRange(dayDetail.goldenBlue.morningGolden?.start, dayDetail.goldenBlue.morningGolden?.end)}
                  {' / '}
                  {formatTimeRange(dayDetail.goldenBlue.eveningGolden?.start, dayDetail.goldenBlue.eveningGolden?.end)}
                </span>
              </div>
            </div>

            <div className="moon-times">
              <h4>🌙 Lunar</h4>
              <div className="time-row">
                <span>Phase</span>
                <span>{dayDetail.lunar.phaseName} · {dayDetail.lunar.illumination}%</span>
              </div>
              {dayDetail.moonEvents.length === 0 ? (
                <div className="time-row">
                  <span>
                    {dayDetail.lunar.moonAlwaysUp
                      ? 'Moon always up'
                      : dayDetail.lunar.moonAlwaysDown
                        ? 'Moon always down'
                        : 'No rise/set'}
                  </span>
                  <span>—</span>
                </div>
              ) : (
                dayDetail.moonEvents.map((event) => (
                  <div className={`time-row ${event.past ? 'is-past' : ''}`} key={event.id}>
                    <span>{event.label}</span>
                    <span>
                      {event.altitude != null
                        ? `${formatShortTime(event.time)} · ${formatAltitude(event.altitude)}`
                        : formatEventInstant(event.time, event.azimuth)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <p className="footer-note">
        Times are local for your device location. Horizon events ignore terrain and elevation (± minutes possible).
      </p>
    </div>
  )
}

export default App
