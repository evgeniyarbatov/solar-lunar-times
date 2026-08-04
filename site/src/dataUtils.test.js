import { describe, it, expect } from 'vitest'
import {
  formatTime,
  formatShortTime,
  formatDayLength,
  formatAzimuth,
  formatAltitude,
  formatTimeWithAzimuth,
  formatDurationMs,
  formatCountdown,
  formatSignedDurationMs,
  formatTimeRange,
  getDateKey,
  toIsoDate,
  parseIsoDate,
  startOfLocalDay,
  formatDisplayDate,
  formatEventInstant,
} from './dataUtils'

describe('dataUtils', () => {
  it('formats time values', () => {
    const date = new Date(2024, 0, 1, 9, 5, 2)

    expect(formatTime(date)).toBe('09:05:02')
    expect(formatTime(null)).toBe('—')
    expect(formatShortTime(date)).toBe('09:05')
  })

  it('formats day length values', () => {
    const start = new Date(2024, 0, 1, 6, 0, 0)
    const end = new Date(2024, 0, 1, 18, 30, 15)

    expect(formatDayLength(start, end)).toBe('12:30:15')
    expect(formatDayLength(null, end)).toBe('—')
  })

  it('formats durations and countdowns', () => {
    expect(formatDurationMs(2 * 3600000 + 14 * 60000)).toBe('2h 14m')
    expect(formatDurationMs(45 * 60000 + 3 * 1000)).toBe('45m 03s')
    expect(formatDurationMs(900)).toBe('0s')

    const now = new Date(2026, 5, 15, 12, 0, 0)
    const later = new Date(2026, 5, 15, 14, 14, 0)
    expect(formatCountdown(later, now)).toBe('in 2h 14m')
    expect(formatCountdown(now, now)).toBe('now')
    expect(formatSignedDurationMs(2 * 60 * 1000)).toBe('+2m 00s vs yesterday')
    expect(formatSignedDurationMs(-90 * 1000)).toBe('−1m 30s vs yesterday')
    expect(formatSignedDurationMs(0)).toBe('same as yesterday')
  })

  it('builds date keys, ISO dates, and display labels', () => {
    const date = new Date(2024, 0, 5)
    const key = getDateKey(date)

    expect(key).toBe('2024/01/05')
    expect(toIsoDate(date)).toBe('2024-01-05')
    expect(parseIsoDate('2024-01-05')).toEqual(startOfLocalDay(date))
    expect(parseIsoDate('not-a-date')).toBeNull()
    expect(parseIsoDate('2024-13-40')).toBeNull()
    expect(formatDisplayDate(key)).toBe('January 5, 2024')
    expect(formatDisplayDate('2024-01-05')).toMatch(/January 5, 2024/)
  })

  it('formats azimuth degrees with compass direction', () => {
    expect(formatAzimuth(0)).toBe('0° N')
    expect(formatAzimuth(72)).toBe('72° ENE')
    expect(formatAzimuth(288)).toBe('288° WNW')
    expect(formatAzimuth(370)).toBe('10° N')
    expect(formatAzimuth(-10)).toBe('350° N')
    expect(formatAzimuth(null)).toBe('—')
    expect(formatAzimuth(NaN)).toBe('—')
  })

  it('formats altitude with sign', () => {
    expect(formatAltitude(12.34)).toBe('+12.3°')
    expect(formatAltitude(-4.2)).toBe('-4.2°')
    expect(formatAltitude(null)).toBe('—')
  })

  it('combines time and azimuth for display', () => {
    expect(formatTimeWithAzimuth('05:41:55', '72° ENE')).toBe('05:41:55 · 72° ENE')
    expect(formatTimeWithAzimuth("Moon doesn't rise today", '')).toBe("Moon doesn't rise today")
    expect(formatTimeWithAzimuth('05:41:55', '—')).toBe('05:41:55')
  })

  it('formats event instants as time only, with optional azimuth', () => {
    const event = new Date(2026, 5, 16, 5, 41, 55)

    expect(formatEventInstant(event)).toBe(formatTime(event))
    expect(formatEventInstant(event, 72)).toBe(`${formatTime(event)} · 72° ENE`)
    expect(formatEventInstant(null)).toBe('—')
  })

  it('formats time ranges', () => {
    const start = new Date(2026, 5, 15, 5, 10, 0)
    const end = new Date(2026, 5, 15, 6, 5, 0)
    expect(formatTimeRange(start, end)).toBe('05:10–06:05')
    expect(formatTimeRange(null, end)).toBe('—')
  })
})
