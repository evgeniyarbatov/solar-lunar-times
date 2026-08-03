import { describe, it, expect } from 'vitest'
import SunCalc from 'suncalc'
import { getUpcomingSolar, getUpcomingLunar, getMoonPhaseName } from './astro'

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
