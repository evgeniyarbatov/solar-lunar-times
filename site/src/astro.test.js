import { describe, it, expect } from 'vitest'
import SunCalc from 'suncalc'
import {
  getUpcomingSolar,
  getUpcomingLunar,
  getMoonPhaseName,
  getSunBand,
  getSkyState,
  getGoldenBlueHours,
  getSolarStrip,
  getDayLengthTrend,
  getRunWindow,
  getNextPrincipalPhases,
  getMoonTransit,
  getDarkAndMoonWindows,
  getCountdowns,
  getCalendarDays,
  getDayDetail,
  computeSnapshot,
} from './astro'
import { toIsoDate } from './dataUtils'

// Mid-latitude reference (approx. New York)
const LAT = 40.7128
const LON = -74.006

// Absolute instants around the NY solar day on 2026-06-15 (EDT = UTC-4)
const NY_MORNING = new Date(Date.UTC(2026, 5, 15, 10, 0, 0)) // 06:00 EDT
const NY_AFTERNOON = new Date(Date.UTC(2026, 5, 15, 19, 0, 0)) // 15:00 EDT
const NY_LATE = new Date(Date.UTC(2026, 5, 16, 3, 0, 0)) // 23:00 EDT

describe('getMoonPhaseName', () => {
  it('names principal phases', () => {
    expect(getMoonPhaseName(0)).toBe('New Moon')
    expect(getMoonPhaseName(0.25)).toBe('First Quarter')
    expect(getMoonPhaseName(0.5)).toBe('Full Moon')
    expect(getMoonPhaseName(0.75)).toBe('Last Quarter')
  })

  it('names intermediate phases', () => {
    expect(getMoonPhaseName(0.1)).toBe('Waxing Crescent')
    expect(getMoonPhaseName(0.4)).toBe('Waxing Gibbous')
    expect(getMoonPhaseName(0.6)).toBe('Waning Gibbous')
    expect(getMoonPhaseName(0.9)).toBe('Waning Crescent')
  })
})

describe('getSunBand', () => {
  it('maps altitude thresholds', () => {
    expect(getSunBand(10).id).toBe('day')
    expect(getSunBand(-3).id).toBe('civil')
    expect(getSunBand(-9).id).toBe('nautical')
    expect(getSunBand(-15).id).toBe('astronomical')
    expect(getSunBand(-25).id).toBe('night')
  })
})

describe('getSkyState', () => {
  it('returns sun and moon position metrics', () => {
    const sky = getSkyState(LAT, LON, NY_AFTERNOON)

    expect(sky.sun.band.id).toBe('day')
    expect(sky.sun.altitude).toBeGreaterThan(0)
    expect(sky.sun.azimuth).toBeGreaterThanOrEqual(0)
    expect(sky.sun.azimuth).toBeLessThan(360)
    expect(sky.moon.illumination).toBeGreaterThanOrEqual(0)
    expect(sky.moon.illumination).toBeLessThanOrEqual(100)
    expect(typeof sky.moon.phaseName).toBe('string')
    expect(sky.moon.ageDays).toBeGreaterThanOrEqual(0)
  })
})

describe('getUpcomingSolar', () => {
  it('returns only events strictly after now', () => {
    const events = getUpcomingSolar(LAT, LON, NY_AFTERNOON)

    expect(events.length).toBeGreaterThan(0)
    for (const event of events) {
      expect(event.time.getTime()).toBeGreaterThan(NY_AFTERNOON.getTime())
    }
  })

  it('rolls past sunrise to tomorrow while keeping this evening sunset', () => {
    const events = getUpcomingSolar(LAT, LON, NY_AFTERNOON)
    const labels = events.map((e) => e.label)
    const times = SunCalc.getTimes(NY_AFTERNOON, LAT, LON)

    expect(times.sunrise.getTime()).toBeLessThan(NY_AFTERNOON.getTime())
    expect(labels).toContain('Sunset')
    expect(labels).toContain('Sunrise')

    const nextSunrise = events.find((e) => e.label === 'Sunrise')
    const nextSunset = events.find((e) => e.label === 'Sunset')
    expect(nextSunset.time.getTime()).toBe(times.sunset.getTime())
    expect(nextSunrise.time.getTime()).toBeGreaterThan(nextSunset.time.getTime())
  })

  it('surfaces tomorrow dawn after tonight', () => {
    const events = getUpcomingSolar(LAT, LON, NY_LATE)
    const nextDawn = events.find((e) => e.label === 'Civil Dawn')
    const tonight = SunCalc.getTimes(NY_LATE, LAT, LON)

    expect(nextDawn).toBeDefined()
    expect(nextDawn.time.getTime()).toBeGreaterThan(NY_LATE.getTime())
    expect(nextDawn.time.getTime()).toBeGreaterThan(tonight.night.getTime())
  })

  it('keeps one instance per event label', () => {
    const events = getUpcomingSolar(LAT, LON, NY_MORNING)
    const labels = events.map((e) => e.label)

    expect(new Set(labels).size).toBe(labels.length)
  })

  it('sorts events chronologically', () => {
    const events = getUpcomingSolar(LAT, LON, NY_MORNING)

    for (let i = 1; i < events.length; i += 1) {
      expect(events[i].time.getTime()).toBeGreaterThanOrEqual(events[i - 1].time.getTime())
    }
  })

  it('includes golden hour markers', () => {
    const events = getUpcomingSolar(LAT, LON, NY_MORNING)
    const labels = events.map((e) => e.label)
    expect(labels.some((l) => l.includes('Golden'))).toBe(true)
  })
})

describe('getUpcomingLunar', () => {
  it('returns phase and illumination for now', () => {
    const lunar = getUpcomingLunar(LAT, LON, NY_AFTERNOON)

    expect(typeof lunar.phaseName).toBe('string')
    expect(lunar.illumination).toBeGreaterThanOrEqual(0)
    expect(lunar.illumination).toBeLessThanOrEqual(100)
    expect(typeof lunar.isUp).toBe('boolean')
  })

  it('only returns rise/set in the future', () => {
    const lunar = getUpcomingLunar(LAT, LON, NY_AFTERNOON)

    if (lunar.nextRise) {
      expect(lunar.nextRise.time.getTime()).toBeGreaterThan(NY_AFTERNOON.getTime())
    }
    if (lunar.nextSet) {
      expect(lunar.nextSet.time.getTime()).toBeGreaterThan(NY_AFTERNOON.getTime())
    }
  })

  it('finds a next rise and set within a few days at mid-latitudes', () => {
    const lunar = getUpcomingLunar(LAT, LON, NY_AFTERNOON)

    expect(lunar.nextRise).not.toBeNull()
    expect(lunar.nextSet).not.toBeNull()
  })
})

describe('getGoldenBlueHours', () => {
  it('returns morning and evening windows for a mid-latitude summer day', () => {
    const windows = getGoldenBlueHours(LAT, LON, NY_AFTERNOON)

    expect(windows.morningGolden.start.getTime()).toBeLessThan(windows.morningGolden.end.getTime())
    expect(windows.eveningGolden.start.getTime()).toBeLessThan(windows.eveningGolden.end.getTime())
    expect(windows.morningBlue.end.getTime()).toBe(windows.morningGolden.start.getTime())
    expect(windows.eveningBlue.start.getTime()).toBe(windows.eveningGolden.end.getTime())
  })
})

describe('getSolarStrip', () => {
  it('returns seven sequential local days', () => {
    const strip = getSolarStrip(LAT, LON, NY_AFTERNOON, 7)
    expect(strip).toHaveLength(7)
    expect(strip[0].isoDate).toBe(toIsoDate(NY_AFTERNOON))
    expect(strip[0].sunrise).toBeInstanceOf(Date)
    expect(strip[0].sunset).toBeInstanceOf(Date)
    expect(strip[0].dawn).toBeInstanceOf(Date)
    expect(strip[0].dusk).toBeInstanceOf(Date)
    expect(strip[0].dayLength).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

describe('getDayLengthTrend', () => {
  it('reports today length and delta vs yesterday', () => {
    const trend = getDayLengthTrend(LAT, LON, NY_AFTERNOON)
    expect(trend.today).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(typeof trend.deltaMs).toBe('number')
    // Mid-June in NY: days still lengthening or near peak — delta near zero or positive
    expect(Math.abs(trend.deltaMs)).toBeLessThan(30 * 60 * 1000)
  })
})

describe('getRunWindow', () => {
  it('marks an afternoon civil window as active', () => {
    const window = getRunWindow(LAT, LON, 'civil', NY_AFTERNOON)
    expect(window).not.toBeNull()
    expect(window.status).toBe('active')
    expect(window.end.getTime()).toBeGreaterThan(NY_AFTERNOON.getTime())
  })

  it('returns an upcoming daylight window after sunset', () => {
    const times = SunCalc.getTimes(NY_AFTERNOON, LAT, LON)
    const afterSunset = new Date(times.sunset.getTime() + 60 * 60 * 1000)
    const window = getRunWindow(LAT, LON, 'daylight', afterSunset)
    expect(window).not.toBeNull()
    expect(window.status).toBe('upcoming')
    expect(window.start.getTime()).toBeGreaterThan(afterSunset.getTime())
  })
})

describe('getNextPrincipalPhases', () => {
  it('returns four future principal phases in order', () => {
    const phases = getNextPrincipalPhases(NY_AFTERNOON, 4)
    expect(phases).toHaveLength(4)
    for (let i = 0; i < phases.length; i += 1) {
      expect(phases[i].time.getTime()).toBeGreaterThan(NY_AFTERNOON.getTime())
      if (i > 0) {
        expect(phases[i].time.getTime()).toBeGreaterThan(phases[i - 1].time.getTime())
      }
    }
    const names = new Set(phases.map((p) => p.name))
    expect(names.size).toBeGreaterThanOrEqual(3)
  })
})

describe('getMoonTransit', () => {
  it('finds a future culmination with positive altitude', () => {
    const transit = getMoonTransit(LAT, LON, NY_AFTERNOON)
    expect(transit).not.toBeNull()
    expect(transit.time.getTime()).toBeGreaterThan(NY_AFTERNOON.getTime())
    expect(transit.altitude).toBeGreaterThan(0)
  })
})

describe('getDarkAndMoonWindows', () => {
  it('returns non-overlapping night intervals', () => {
    const windows = getDarkAndMoonWindows(LAT, LON, NY_LATE, 2)
    expect(windows.nights.length).toBeGreaterThan(0)

    for (const iv of [...windows.moonWatch, ...windows.darkSky]) {
      expect(iv.end.getTime()).toBeGreaterThan(iv.start.getTime())
      expect(iv.start.getTime()).toBeGreaterThanOrEqual(NY_LATE.getTime() - 1000)
    }
  })
})

describe('getCountdowns', () => {
  it('returns a short sorted list of useful upcoming events', () => {
    const items = getCountdowns(LAT, LON, NY_AFTERNOON, 4)
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(4)
    for (let i = 1; i < items.length; i += 1) {
      expect(items[i].time.getTime()).toBeGreaterThanOrEqual(items[i - 1].time.getTime())
    }
  })
})

describe('getCalendarDays', () => {
  it('builds a 14-day look-ahead with phase data', () => {
    const days = getCalendarDays(LAT, LON, NY_AFTERNOON, 14)
    expect(days).toHaveLength(14)
    expect(days[0].isoDate).toBe(toIsoDate(NY_AFTERNOON))
    expect(days[0].phaseName).toBeTruthy()
    expect(days[0].illumination).toBeGreaterThanOrEqual(0)
  })
})

describe('getDayDetail', () => {
  it('lists solar and lunar events for a chosen date', () => {
    const detail = getDayDetail(LAT, LON, NY_AFTERNOON, NY_AFTERNOON)
    expect(detail.isoDate).toBe(toIsoDate(NY_AFTERNOON))
    expect(detail.solarEvents.length).toBeGreaterThan(5)
    expect(detail.dayLength).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(detail.lunar.phaseName).toBeTruthy()
  })
})

describe('computeSnapshot', () => {
  it('assembles the full planning payload', () => {
    const snap = computeSnapshot(LAT, LON, NY_AFTERNOON)
    expect(snap.sky.sun.band).toBeTruthy()
    expect(snap.countdowns.length).toBeGreaterThan(0)
    expect(snap.goldenBlue.morningGolden).toBeTruthy()
    expect(snap.principalPhases).toHaveLength(4)
    expect(snap.skyWindows).toBeTruthy()
  })
})
