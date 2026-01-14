import { describe, it, expect } from 'vitest'
import {
  formatTime,
  formatDayLength,
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
})
