import { describe, it, expect } from 'vitest'
import { parseCSV, getDateKey, findDateIndex } from './dataUtils'

describe('dataUtils', () => {
  it('parses CSV into trimmed objects', () => {
    const csv = 'date, sunrise\n2025/01/01, 07:12\n2025/01/02, 07:11'
    const result = parseCSV(csv)

    expect(result).toEqual([
      { date: '2025/01/01', sunrise: '07:12' },
      { date: '2025/01/02', sunrise: '07:11' }
    ])
  })

  it('builds the expected date key', () => {
    const date = new Date('2025-01-13T09:30:00.000Z')
    expect(getDateKey(date)).toBe('2025/01/13')
  })

  it('finds the row index for a date key', () => {
    const rows = [
      { date: '2025/01/12' },
      { date: '2025/01/13' },
      { date: '2025/01/14' }
    ]

    expect(findDateIndex(rows, '2025/01/13')).toBe(1)
  })
})
