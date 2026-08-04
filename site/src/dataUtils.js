const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const shortTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const weekdayShortFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
})

const monthDayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

export const formatTime = (date) =>
  date ? timeFormatter.format(date) : '—'

export const formatShortTime = (date) =>
  date ? shortTimeFormatter.format(date) : '—'

export const formatDayLength = (start, end) => {
  if (!start || !end) return '—'

  const diffMs = end - start
  if (diffMs <= 0 || Number.isNaN(diffMs)) return '—'

  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const formatDurationMs = (ms) => {
  if (ms == null || Number.isNaN(ms)) return '—'

  const sign = ms < 0 ? '−' : ''
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3600000)
  const minutes = Math.floor((abs % 3600000) / 60000)
  const seconds = Math.floor((abs % 60000) / 1000)

  if (hours > 0) {
    return `${sign}${hours}h ${String(minutes).padStart(2, '0')}m`
  }
  if (minutes > 0) {
    return `${sign}${minutes}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${sign}${seconds}s`
}

export const formatCountdown = (target, now = new Date()) => {
  if (!target) return '—'
  const ms = target - now
  if (ms <= 0) return 'now'
  return `in ${formatDurationMs(ms)}`
}

export const formatSignedDurationMs = (ms) => {
  if (ms == null || Number.isNaN(ms)) return '—'
  if (Math.abs(ms) < 1000) return 'same as yesterday'
  const prefix = ms > 0 ? '+' : ''
  return `${prefix}${formatDurationMs(ms)} vs yesterday`
}

export const getDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/** Local calendar date as YYYY-MM-DD for URL deep-links. */
export const toIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseIsoDate = (value) => {
  if (!value || typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

export const startOfLocalDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const COMPASS_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
]

export const formatAzimuth = (degrees) => {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) return '—'

  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 22.5) % 16

  return `${Math.round(normalized)}° ${COMPASS_DIRECTIONS[index]}`
}

export const formatAltitude = (degrees) => {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) return '—'
  const rounded = Math.round(degrees * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return `${sign}${rounded.toFixed(1)}°`
}

export const formatTimeWithAzimuth = (time, azimuth) =>
  azimuth && azimuth !== '—' ? `${time} · ${azimuth}` : time

export const formatDisplayDate = (date) => {
  if (typeof date === 'string') {
    if (date.includes('-') && !date.includes('/')) {
      const parsed = parseIsoDate(date)
      if (parsed) {
        return parsed.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      }
    }

    const [year, month, day] = date.split('/').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export const formatWeekdayShort = (date) => weekdayShortFormatter.format(date)

export const formatMonthDay = (date) => monthDayFormatter.format(date)

export const formatEventInstant = (eventTime, azimuth = null) => {
  if (!eventTime) return '—'

  return formatTimeWithAzimuth(
    formatTime(eventTime),
    azimuth != null ? formatAzimuth(azimuth) : null
  )
}

export const formatTimeRange = (start, end) => {
  if (!start || !end) return '—'
  return `${formatShortTime(start)}–${formatShortTime(end)}`
}
