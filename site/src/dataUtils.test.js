import { describe, it, expect } from 'vitest'
import {
  formatTime,
  formatDayLength,
  formatAzimuth,
  formatTimeWithAzimuth,
  getDateKey,
  formatDisplayDate
} from './dataUtils'

describe('dataUtils', () => {
  it('formats time values', () => {
    const date = new Date(2024, 0, 1, 9, 5, 2)

    expect(formatTime(date)).toBe('09:05:02')
    expect(formatTime(null)).toBe('—')
  })

  it('formats day length values', () => {
    const start = new Date(2024, 0, 1, 6, 0, 0)
    const end = new Date(2024, 0, 1, 18, 30, 15)

    expect(formatDayLength(start, end)).toBe('12:30:15')
    expect(formatDayLength(null, end)).toBe('—')
  })

  it('builds date keys and display labels', () => {
    const date = new Date(2024, 0, 5)
    const key = getDateKey(date)

    expect(key).toBe('2024/01/05')
    expect(formatDisplayDate(key)).toBe('January 5, 2024')
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

  it('combines time and azimuth for display', () => {
    expect(formatTimeWithAzimuth('05:41:55', '72° ENE')).toBe('05:41:55 · 72° ENE')
    expect(formatTimeWithAzimuth('Moon doesn\'t rise today', '')).toBe('Moon doesn\'t rise today')
    expect(formatTimeWithAzimuth('05:41:55', '—')).toBe('05:41:55')
  })
})
