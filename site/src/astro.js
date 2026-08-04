import SunCalc from 'suncalc'
import {
  formatDayLength,
  getDateKey,
  startOfLocalDay,
  toIsoDate,
} from './dataUtils'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const SYNODIC_MONTH_DAYS = 29.530588853
const RAD_TO_DEG = 180 / Math.PI

const SOLAR_EVENT_DEFS = [
  { key: 'nightEnd', label: 'Astronomical Dawn' },
  { key: 'nauticalDawn', label: 'Nautical Dawn' },
  { key: 'dawn', label: 'Civil Dawn' },
  { key: 'sunrise', label: 'Sunrise', withAzimuth: true },
  { key: 'goldenHourEnd', label: 'Golden Hour Ends' },
  { key: 'solarNoon', label: 'Solar Noon' },
  { key: 'goldenHour', label: 'Golden Hour Starts' },
  { key: 'sunset', label: 'Sunset', withAzimuth: true },
  { key: 'dusk', label: 'Civil Dusk' },
  { key: 'nauticalDusk', label: 'Nautical Dusk' },
  { key: 'night', label: 'Astronomical Dusk' },
]

const COUNTDOWN_LABELS = new Set([
  'Civil Dawn',
  'Sunrise',
  'Sunset',
  'Civil Dusk',
  'Moonrise',
  'Moonset',
  'Moon Transit',
])

const PRINCIPAL_PHASES = [
  { phase: 0, name: 'New Moon' },
  { phase: 0.25, name: 'First Quarter' },
  { phase: 0.5, name: 'Full Moon' },
  { phase: 0.75, name: 'Last Quarter' },
]

const RUN_PRESETS = {
  civil: {
    id: 'civil',
    label: 'After civil dawn',
    description: 'Civil dawn → civil dusk',
    startKey: 'dawn',
    endKey: 'dusk',
  },
  daylight: {
    id: 'daylight',
    label: 'Full daylight',
    description: 'Sunrise → sunset',
    startKey: 'sunrise',
    endKey: 'sunset',
  },
  before_dusk: {
    id: 'before_dusk',
    label: 'Before civil dusk',
    description: 'Now through civil dusk (once light)',
    startKey: 'dawn',
    endKey: 'dusk',
  },
}

const toCompassDegrees = (azimuthRadians) => (azimuthRadians * RAD_TO_DEG) + 180
const toAltitudeDegrees = (altitudeRadians) => altitudeRadians * RAD_TO_DEG

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

const dayLengthMs = (sunrise, sunset) => {
  if (!isValidDate(sunrise) || !isValidDate(sunset)) return null
  const ms = sunset - sunrise
  return ms > 0 ? ms : null
}

export const getSunBand = (altitudeDeg) => {
  if (altitudeDeg >= 0) return { id: 'day', label: 'Day' }
  if (altitudeDeg >= -6) return { id: 'civil', label: 'Civil twilight' }
  if (altitudeDeg >= -12) return { id: 'nautical', label: 'Nautical twilight' }
  if (altitudeDeg >= -18) return { id: 'astronomical', label: 'Astronomical twilight' }
  return { id: 'night', label: 'Night' }
}

export const getSkyState = (latitude, longitude, now = new Date()) => {
  const sun = SunCalc.getPosition(now, latitude, longitude)
  const moon = SunCalc.getMoonPosition(now, latitude, longitude)
  const illumination = SunCalc.getMoonIllumination(now)
  const sunAlt = toAltitudeDegrees(sun.altitude)
  const moonAlt = toAltitudeDegrees(moon.altitude)

  return {
    sun: {
      altitude: sunAlt,
      azimuth: toCompassDegrees(sun.azimuth),
      band: getSunBand(sunAlt),
    },
    moon: {
      altitude: moonAlt,
      azimuth: toCompassDegrees(moon.azimuth),
      isUp: moonAlt > 0,
      illumination: Math.round(illumination.fraction * 100),
      phaseName: getMoonPhaseName(illumination.phase),
      phase: illumination.phase,
      ageDays: illumination.phase * SYNODIC_MONTH_DAYS,
    },
  }
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

export const getDayLengthTrend = (latitude, longitude, now = new Date()) => {
  const todayTimes = SunCalc.getTimes(now, latitude, longitude)
  const yesterday = new Date(now.getTime() - MS_PER_DAY)
  const yesterdayTimes = SunCalc.getTimes(yesterday, latitude, longitude)

  const todayMs = dayLengthMs(todayTimes.sunrise, todayTimes.sunset)
  const yesterdayMs = dayLengthMs(yesterdayTimes.sunrise, yesterdayTimes.sunset)

  let weekSum = 0
  let weekCount = 0
  for (let offset = 0; offset < 7; offset += 1) {
    const ref = new Date(now.getTime() - offset * MS_PER_DAY)
    const times = SunCalc.getTimes(ref, latitude, longitude)
    const ms = dayLengthMs(times.sunrise, times.sunset)
    if (ms != null) {
      weekSum += ms
      weekCount += 1
    }
  }

  return {
    today: formatDayLength(todayTimes.sunrise, todayTimes.sunset),
    todayMs,
    yesterdayMs,
    deltaMs: todayMs != null && yesterdayMs != null ? todayMs - yesterdayMs : null,
    weekAverageMs: weekCount ? weekSum / weekCount : null,
  }
}

export const getGoldenBlueHours = (latitude, longitude, day = new Date()) => {
  const times = SunCalc.getTimes(day, latitude, longitude)

  const morningGolden =
    isValidDate(times.sunrise) && isValidDate(times.goldenHourEnd)
      ? { start: times.sunrise, end: times.goldenHourEnd }
      : null
  const eveningGolden =
    isValidDate(times.goldenHour) && isValidDate(times.sunset)
      ? { start: times.goldenHour, end: times.sunset }
      : null
  // Blue hour ≈ civil twilight band at the horizon edge
  const morningBlue =
    isValidDate(times.dawn) && isValidDate(times.sunrise)
      ? { start: times.dawn, end: times.sunrise }
      : null
  const eveningBlue =
    isValidDate(times.sunset) && isValidDate(times.dusk)
      ? { start: times.sunset, end: times.dusk }
      : null

  return { morningGolden, eveningGolden, morningBlue, eveningBlue }
}

export const getSolarStrip = (latitude, longitude, now = new Date(), days = 7) => {
  const start = startOfLocalDay(now)
  const strip = []

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start.getTime() + offset * MS_PER_DAY)
    const times = SunCalc.getTimes(day, latitude, longitude)
    const sunrise = isValidDate(times.sunrise) ? times.sunrise : null
    const sunset = isValidDate(times.sunset) ? times.sunset : null
    const dawn = isValidDate(times.dawn) ? times.dawn : null
    const dusk = isValidDate(times.dusk) ? times.dusk : null
    const lengthMs = dayLengthMs(sunrise, sunset)

    strip.push({
      date: day,
      isoDate: toIsoDate(day),
      sunrise,
      sunset,
      dawn,
      dusk,
      dayLength: formatDayLength(sunrise, sunset),
      dayLengthMs: lengthMs,
    })
  }

  return strip
}

export const getRunWindow = (latitude, longitude, presetId, now = new Date()) => {
  const preset = RUN_PRESETS[presetId] || RUN_PRESETS.civil
  const candidates = []

  for (let offset = 0; offset < 3; offset += 1) {
    const ref = new Date(now.getTime() + offset * MS_PER_DAY)
    const times = SunCalc.getTimes(ref, latitude, longitude)
    const start = times[preset.startKey]
    const end = times[preset.endKey]
    if (!isValidDate(start) || !isValidDate(end) || end <= start) continue
    candidates.push({ start, end, preset })
  }

  for (const window of candidates) {
    if (now < window.start) {
      return { ...window, status: 'upcoming', until: window.start }
    }
    if (now >= window.start && now < window.end) {
      return { ...window, status: 'active', until: window.end }
    }
  }

  return null
}

export const RUN_WINDOW_PRESETS = Object.values(RUN_PRESETS)

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

  const altitude = toAltitudeDegrees(SunCalc.getMoonPosition(now, latitude, longitude).altitude)

  return {
    phaseName: getMoonPhaseName(illumination.phase),
    illumination: Math.round(illumination.fraction * 100),
    isUp: altitude > 0,
    nextRise: nextRise ? { time: nextRise, azimuth: nextRiseAzimuth } : null,
    nextSet: nextSet ? { time: nextSet, azimuth: nextSetAzimuth } : null,
  }
}

const phaseDistanceForward = (from, target) => {
  let delta = target - from
  if (delta <= 1e-6) delta += 1
  return delta
}

const refinePhaseTime = (approx, targetPhase) => {
  let lo = approx.getTime() - 2 * 24 * 60 * 60 * 1000
  let hi = approx.getTime() + 2 * 24 * 60 * 60 * 1000

  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2
    const phase = SunCalc.getMoonIllumination(new Date(mid)).phase
    const err = ((phase - targetPhase + 0.5) % 1 + 1) % 1 - 0.5
    if (err > 0) hi = mid
    else lo = mid
  }

  return new Date((lo + hi) / 2)
}

export const getNextPrincipalPhases = (now = new Date(), count = 4) => {
  const current = SunCalc.getMoonIllumination(now).phase
  const upcoming = PRINCIPAL_PHASES
    .map((def) => {
      const daysAhead = phaseDistanceForward(current, def.phase) * SYNODIC_MONTH_DAYS
      const approx = new Date(now.getTime() + daysAhead * MS_PER_DAY)
      const time = refinePhaseTime(approx, def.phase)
      return {
        id: `${def.name}-${toIsoDate(time)}`,
        name: def.name,
        phase: def.phase,
        time,
      }
    })
    .filter((item) => item.time > now)
    .sort((a, b) => a.time - b.time)

  // If near a principal phase just past, include the next cycle of the first missing one
  while (upcoming.length < count) {
    const last = upcoming[upcoming.length - 1]
    const nextDef = PRINCIPAL_PHASES.find((d) => d.phase === ((last.phase + 0.25) % 1))
      || PRINCIPAL_PHASES[0]
    const approx = new Date(last.time.getTime() + 0.25 * SYNODIC_MONTH_DAYS * MS_PER_DAY)
    const time = refinePhaseTime(approx, nextDef.phase)
    upcoming.push({
      id: `${nextDef.name}-${toIsoDate(time)}`,
      name: nextDef.name,
      phase: nextDef.phase,
      time,
    })
  }

  return upcoming.slice(0, count)
}

export const getMoonTransit = (latitude, longitude, now = new Date()) => {
  const stepMs = 10 * 60 * 1000
  const horizonHours = 36
  let best = null

  for (let i = 0; i <= (horizonHours * 60) / 10; i += 1) {
    const t = new Date(now.getTime() + i * stepMs)
    const pos = SunCalc.getMoonPosition(t, latitude, longitude)
    const altitude = toAltitudeDegrees(pos.altitude)
    if (altitude <= 0) continue
    if (!best || altitude > best.altitude) {
      best = {
        time: t,
        altitude,
        azimuth: toCompassDegrees(pos.azimuth),
      }
    }
  }

  if (!best) return null

  // Local refine around peak
  const refineStep = 60 * 1000
  let peak = best
  for (let delta = -15; delta <= 15; delta += 1) {
    const t = new Date(best.time.getTime() + delta * refineStep)
    if (t <= now) continue
    const pos = SunCalc.getMoonPosition(t, latitude, longitude)
    const altitude = toAltitudeDegrees(pos.altitude)
    if (altitude > peak.altitude) {
      peak = {
        time: t,
        altitude,
        azimuth: toCompassDegrees(pos.azimuth),
      }
    }
  }

  return peak.time > now ? peak : null
}

const collectMoonIntervals = (latitude, longitude, rangeStart, rangeEnd) => {
  const intervals = []
  const dayStart = startOfLocalDay(rangeStart)

  for (let offset = -1; offset <= 3; offset += 1) {
    const day = new Date(dayStart.getTime() + offset * MS_PER_DAY)
    const times = SunCalc.getMoonTimes(day, latitude, longitude)

    if (times.alwaysUp) {
      intervals.push({
        start: new Date(day.getTime()),
        end: new Date(day.getTime() + MS_PER_DAY),
      })
      continue
    }
    if (times.alwaysDown) continue

    const rise = isValidDate(times.rise) ? times.rise : null
    const set = isValidDate(times.set) ? times.set : null

    if (rise && set) {
      if (rise < set) {
        intervals.push({ start: rise, end: set })
      } else {
        // set before rise: up from day start to set, and rise to next day
        intervals.push({ start: day, end: set })
        intervals.push({ start: rise, end: new Date(day.getTime() + MS_PER_DAY) })
      }
    } else if (rise && !set) {
      intervals.push({ start: rise, end: new Date(day.getTime() + MS_PER_DAY) })
    } else if (set && !rise) {
      intervals.push({ start: day, end: set })
    }
  }

  return intervals
    .map((iv) => ({
      start: iv.start < rangeStart ? rangeStart : iv.start,
      end: iv.end > rangeEnd ? rangeEnd : iv.end,
    }))
    .filter((iv) => iv.end > iv.start)
}

const intersectIntervals = (aList, bList) => {
  const out = []
  for (const a of aList) {
    for (const b of bList) {
      const start = a.start > b.start ? a.start : b.start
      const end = a.end < b.end ? a.end : b.end
      if (end > start) out.push({ start, end })
    }
  }
  return out.sort((x, y) => x.start - y.start)
}

const subtractIntervals = (baseList, cutList) => {
  let result = baseList.map((iv) => ({ ...iv }))

  for (const cut of cutList) {
    const next = []
    for (const base of result) {
      if (cut.end <= base.start || cut.start >= base.end) {
        next.push(base)
        continue
      }
      if (cut.start > base.start) {
        next.push({ start: base.start, end: cut.start })
      }
      if (cut.end < base.end) {
        next.push({ start: cut.end, end: base.end })
      }
    }
    result = next
  }

  return result.filter((iv) => iv.end > iv.start)
}

export const getDarkAndMoonWindows = (latitude, longitude, now = new Date(), nights = 2) => {
  const nightIntervals = []
  const startDay = startOfLocalDay(now)

  for (let offset = 0; offset < nights + 1; offset += 1) {
    const day = new Date(startDay.getTime() + offset * MS_PER_DAY)
    const times = SunCalc.getTimes(day, latitude, longitude)
    const next = SunCalc.getTimes(new Date(day.getTime() + MS_PER_DAY), latitude, longitude)

    const dusk = isValidDate(times.night) ? times.night : null
    const dawn = isValidDate(next.nightEnd) ? next.nightEnd : null
    if (!dusk || !dawn || dawn <= dusk) continue
    if (dawn <= now) continue

    nightIntervals.push({
      start: dusk < now ? now : dusk,
      end: dawn,
    })
  }

  const clippedNights = nightIntervals
    .filter((iv) => iv.end > now)
    .slice(0, nights)

  if (clippedNights.length === 0) {
    return { moonWatch: [], darkSky: [], nights: [] }
  }

  const rangeStart = clippedNights[0].start
  const rangeEnd = clippedNights[clippedNights.length - 1].end
  const moonUp = collectMoonIntervals(latitude, longitude, rangeStart, rangeEnd)

  const moonWatch = intersectIntervals(clippedNights, moonUp)
  const darkSky = subtractIntervals(clippedNights, moonUp)

  return {
    nights: clippedNights,
    moonWatch,
    darkSky,
  }
}

export const getCountdowns = (latitude, longitude, now = new Date(), limit = 4) => {
  const solar = getUpcomingSolar(latitude, longitude, now)
  const lunar = getUpcomingLunar(latitude, longitude, now)
  const transit = getMoonTransit(latitude, longitude, now)

  const items = solar
    .filter((event) => COUNTDOWN_LABELS.has(event.label))
    .map((event) => ({
      id: event.id,
      label: event.label,
      time: event.time,
    }))

  if (lunar.nextRise) {
    items.push({
      id: `moonrise-${getDateKey(lunar.nextRise.time)}`,
      label: 'Moonrise',
      time: lunar.nextRise.time,
    })
  }
  if (lunar.nextSet) {
    items.push({
      id: `moonset-${getDateKey(lunar.nextSet.time)}`,
      label: 'Moonset',
      time: lunar.nextSet.time,
    })
  }
  if (transit) {
    items.push({
      id: `transit-${getDateKey(transit.time)}`,
      label: 'Moon Transit',
      time: transit.time,
    })
  }

  return items
    .filter((item) => item.time > now)
    .sort((a, b) => a.time - b.time)
    .slice(0, limit)
}

export const getCalendarDays = (latitude, longitude, now = new Date(), days = 14) => {
  const start = startOfLocalDay(now)
  const rows = []

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(start.getTime() + offset * MS_PER_DAY)
    const noon = new Date(day.getTime() + 12 * 60 * 60 * 1000)
    const sunTimes = SunCalc.getTimes(day, latitude, longitude)
    const moonTimes = SunCalc.getMoonTimes(day, latitude, longitude)
    const illum = SunCalc.getMoonIllumination(noon)

    rows.push({
      date: day,
      isoDate: toIsoDate(day),
      sunrise: isValidDate(sunTimes.sunrise) ? sunTimes.sunrise : null,
      sunset: isValidDate(sunTimes.sunset) ? sunTimes.sunset : null,
      moonrise: isValidDate(moonTimes.rise) ? moonTimes.rise : null,
      moonset: isValidDate(moonTimes.set) ? moonTimes.set : null,
      moonAlwaysUp: Boolean(moonTimes.alwaysUp),
      moonAlwaysDown: Boolean(moonTimes.alwaysDown),
      phaseName: getMoonPhaseName(illum.phase),
      illumination: Math.round(illum.fraction * 100),
      phase: illum.phase,
    })
  }

  return rows
}

export const getDayDetail = (latitude, longitude, day, now = new Date()) => {
  const dayStart = startOfLocalDay(day)
  const dayEnd = new Date(dayStart.getTime() + MS_PER_DAY)
  const times = SunCalc.getTimes(dayStart, latitude, longitude)
  const moonTimes = SunCalc.getMoonTimes(dayStart, latitude, longitude)
  const noon = new Date(dayStart.getTime() + 12 * 60 * 60 * 1000)
  const illum = SunCalc.getMoonIllumination(noon)
  const goldenBlue = getGoldenBlueHours(latitude, longitude, dayStart)

  const solarEvents = SOLAR_EVENT_DEFS.map((def) => {
    const time = times[def.key]
    if (!isValidDate(time)) return null

    let azimuth = null
    if (def.withAzimuth) {
      azimuth = toCompassDegrees(SunCalc.getPosition(time, latitude, longitude).azimuth)
    }

    return {
      id: `${def.key}-${getDateKey(time)}`,
      label: def.label,
      time,
      azimuth,
      past: time <= now,
    }
  }).filter(Boolean)

  const moonEvents = []
  if (isValidDate(moonTimes.rise)) {
    moonEvents.push({
      id: `moonrise-${getDateKey(moonTimes.rise)}`,
      label: 'Moonrise',
      time: moonTimes.rise,
      azimuth: toCompassDegrees(SunCalc.getMoonPosition(moonTimes.rise, latitude, longitude).azimuth),
      past: moonTimes.rise <= now,
    })
  }
  if (isValidDate(moonTimes.set)) {
    moonEvents.push({
      id: `moonset-${getDateKey(moonTimes.set)}`,
      label: 'Moonset',
      time: moonTimes.set,
      azimuth: toCompassDegrees(SunCalc.getMoonPosition(moonTimes.set, latitude, longitude).azimuth),
      past: moonTimes.set <= now,
    })
  }

  // Transit for this calendar day if it falls inside the day
  let transit = null
  const stepMs = 15 * 60 * 1000
  let best = null
  for (let t = dayStart.getTime(); t < dayEnd.getTime(); t += stepMs) {
    const pos = SunCalc.getMoonPosition(new Date(t), latitude, longitude)
    const altitude = toAltitudeDegrees(pos.altitude)
    if (altitude <= 0) continue
    if (!best || altitude > best.altitude) {
      best = {
        time: new Date(t),
        altitude,
        azimuth: toCompassDegrees(pos.azimuth),
      }
    }
  }
  if (best) {
    transit = best
    moonEvents.push({
      id: `transit-${getDateKey(best.time)}`,
      label: 'Moon Transit',
      time: best.time,
      azimuth: best.azimuth,
      past: best.time <= now,
      altitude: best.altitude,
    })
  }

  moonEvents.sort((a, b) => a.time - b.time)

  return {
    date: dayStart,
    isoDate: toIsoDate(dayStart),
    dayLength: formatDayLength(times.sunrise, times.sunset),
    solarEvents,
    moonEvents,
    goldenBlue,
    lunar: {
      phaseName: getMoonPhaseName(illum.phase),
      illumination: Math.round(illum.fraction * 100),
      moonAlwaysUp: Boolean(moonTimes.alwaysUp),
      moonAlwaysDown: Boolean(moonTimes.alwaysDown),
    },
    transit,
  }
}

export const computeSnapshot = (latitude, longitude, now = new Date(), options = {}) => {
  const selectedDate = options.date ? startOfLocalDay(options.date) : startOfLocalDay(now)
  const runPreset = options.runPreset || 'civil'

  return {
    now,
    sky: getSkyState(latitude, longitude, now),
    countdowns: getCountdowns(latitude, longitude, now),
    solarEvents: getUpcomingSolar(latitude, longitude, now),
    dayLength: getTodayDayLength(latitude, longitude, now),
    dayLengthTrend: getDayLengthTrend(latitude, longitude, now),
    goldenBlue: getGoldenBlueHours(latitude, longitude, now),
    solarStrip: getSolarStrip(latitude, longitude, now, 7),
    runWindow: getRunWindow(latitude, longitude, runPreset, now),
    lunar: getUpcomingLunar(latitude, longitude, now),
    principalPhases: getNextPrincipalPhases(now, 4),
    moonTransit: getMoonTransit(latitude, longitude, now),
    skyWindows: getDarkAndMoonWindows(latitude, longitude, now, 2),
    calendar: getCalendarDays(latitude, longitude, now, 14),
    dayDetail: getDayDetail(latitude, longitude, selectedDate, now),
    selectedDate,
  }
}
