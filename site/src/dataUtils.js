const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

export const formatTime = (date) =>
  date ? timeFormatter.format(date) : '—'

export const formatDayLength = (start, end) => {
  if (!start || !end) return '—'

  const diffMs = end - start
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const getDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

const COMPASS_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
]

export const formatAzimuth = (degrees) => {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) return '—'

  const normalized = ((degrees % 360) + 360) % 360
  const index = Math.round(normalized / 22.5) % 16

  return `${Math.round(normalized)}° ${COMPASS_DIRECTIONS[index]}`
}

export const formatTimeWithAzimuth = (time, azimuth) =>
  azimuth && azimuth !== '—' ? `${time} · ${azimuth}` : time

export const formatDisplayDate = (date) => {
  if (typeof date === 'string') {
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

export const formatEventInstant = (eventTime, azimuth = null) => {
  if (!eventTime) return '—'

  return formatTimeWithAzimuth(
    formatTime(eventTime),
    azimuth != null ? formatAzimuth(azimuth) : null
  )
}
