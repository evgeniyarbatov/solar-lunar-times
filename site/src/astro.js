import SunCalc from 'suncalc'
import { formatDayLength, getDateKey } from './dataUtils'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const SOLAR_EVENT_DEFS = [
  { key: 'nightEnd', label: 'Astronomical Dawn' },
  { key: 'nauticalDawn', label: 'Nautical Dawn' },
  { key: 'dawn', label: 'Civil Dawn' },
  { key: 'sunrise', label: 'Sunrise', withAzimuth: true },
  { key: 'solarNoon', label: 'Solar Noon' },
  { key: 'sunset', label: 'Sunset', withAzimuth: true },
  { key: 'dusk', label: 'Civil Dusk' },
  { key: 'nauticalDusk', label: 'Nautical Dusk' },
  { key: 'night', label: 'Astronomical Dusk' },
]

const toCompassDegrees = (azimuthRadians) => (azimuthRadians * 180) / Math.PI + 180

export const getMoonPhaseName = (phase) => {
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

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime())

const earliestFuture = (candidates, now) => {
  let best = null
  for (const candidate of candidates) {
    if (!isValidDate(candidate) || candidate <= now) continue
    if (!best || candidate < best) best = candidate
  }
  return best
}

export const getUpcomingSolar = (latitude, longitude, now = new Date()) => {
  const byLabel = new Map()

  // SunCalc picks the solar day from the absolute instant + longitude.
  // Probe today and tomorrow so post-dusk "next dawn" still resolves.
  for (let offset = 0; offset < 2; offset += 1) {
    const ref = new Date(now.getTime() + offset * MS_PER_DAY)
    const times = SunCalc.getTimes(ref, latitude, longitude)

    for (const def of SOLAR_EVENT_DEFS) {
      const time = times[def.key]
      if (!isValidDate(time) || time <= now) continue

      const existing = byLabel.get(def.label)
      if (existing && existing.time <= time) continue

      let azimuth = null
      if (def.withAzimuth) {
        azimuth = toCompassDegrees(SunCalc.getPosition(time, latitude, longitude).azimuth)
      }

      byLabel.set(def.label, {
        id: `${def.key}-${getDateKey(time)}`,
        label: def.label,
        time,
        azimuth,
      })
    }
  }

  return [...byLabel.values()].sort((a, b) => a.time - b.time)
}

export const getTodayDayLength = (latitude, longitude, now = new Date()) => {
  const times = SunCalc.getTimes(now, latitude, longitude)
  return formatDayLength(times.sunrise, times.sunset)
}

export const getUpcomingLunar = (latitude, longitude, now = new Date()) => {
  const illumination = SunCalc.getMoonIllumination(now)
  const riseCandidates = []
  const setCandidates = []

  for (let offset = 0; offset < 3; offset += 1) {
    const ref = new Date(now.getTime() + offset * MS_PER_DAY)
    const times = SunCalc.getMoonTimes(ref, latitude, longitude)
    if (isValidDate(times.rise)) riseCandidates.push(times.rise)
    if (isValidDate(times.set)) setCandidates.push(times.set)
  }

  const nextRise = earliestFuture(riseCandidates, now)
  const nextSet = earliestFuture(setCandidates, now)

  const nextRiseAzimuth = nextRise
    ? toCompassDegrees(SunCalc.getMoonPosition(nextRise, latitude, longitude).azimuth)
    : null
  const nextSetAzimuth = nextSet
    ? toCompassDegrees(SunCalc.getMoonPosition(nextSet, latitude, longitude).azimuth)
    : null

  const altitude = SunCalc.getMoonPosition(now, latitude, longitude).altitude

  return {
    phaseName: getMoonPhaseName(illumination.phase),
    illumination: Math.round(illumination.fraction * 100),
    isUp: altitude > 0,
    nextRise: nextRise ? { time: nextRise, azimuth: nextRiseAzimuth } : null,
    nextSet: nextSet ? { time: nextSet, azimuth: nextSetAzimuth } : null,
  }
}

export const computeSnapshot = (latitude, longitude, now = new Date()) => ({
  now,
  solarEvents: getUpcomingSolar(latitude, longitude, now),
  dayLength: getTodayDayLength(latitude, longitude, now),
  lunar: getUpcomingLunar(latitude, longitude, now),
})
