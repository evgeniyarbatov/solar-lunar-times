#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const SunCalc = require(path.join(
  __dirname,
  '..',
  'site',
  'node_modules',
  'suncalc'
))

const DAYS_COUNT = 90
const latitude = Number(process.env.LATITUDE)
const longitude = Number(process.env.LONGITUDE)

const outputDir = path.join(__dirname, '..', 'data')
fs.mkdirSync(outputDir, { recursive: true })

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})

const formatTime = (date) => (date ? timeFormatter.format(date) : '')

const formatDayLength = (start, end) => {
  if (!start || !end) return ''

  const diffMs = end - start
  const hours = Math.floor(diffMs / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const getDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

const getMoonPhaseName = (phase) => {
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

const writeCsv = (filePath, headers, rows) => {
  const lines = [headers.join(',')]

  rows.forEach((row) => {
    const line = headers
      .map((header) => {
        const value = row[header]
        return value === undefined || value === null ? '' : String(value)
      })
      .join(',')
    lines.push(line)
  })

  fs.writeFileSync(filePath, `${lines.join('\n')}\n`)
}

const today = new Date()
const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

const sunRows = []
const moonRows = []

for (let i = 0; i < DAYS_COUNT; i += 1) {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + i
  )
  const dateKey = getDateKey(date)
  const sunTimes = SunCalc.getTimes(date, latitude, longitude)
  const moonIllumination = SunCalc.getMoonIllumination(date)
  const moonTimes = SunCalc.getMoonTimes(date, latitude, longitude)

  sunRows.push({
    date: dateKey,
    astronomical_dawn: formatTime(sunTimes.nightEnd),
    nautical_dawn: formatTime(sunTimes.nauticalDawn),
    civil_dawn: formatTime(sunTimes.dawn),
    sunrise_geometric: formatTime(sunTimes.sunrise),
    solar_noon: formatTime(sunTimes.solarNoon),
    sunset_geometric: formatTime(sunTimes.sunset),
    civil_dusk: formatTime(sunTimes.dusk),
    nautical_dusk: formatTime(sunTimes.nauticalDusk),
    astronomical_dusk: formatTime(sunTimes.night),
    day_length: formatDayLength(sunTimes.sunrise, sunTimes.sunset)
  })

  moonRows.push({
    date: dateKey,
    phase_name: getMoonPhaseName(moonIllumination.phase),
    illumination: Math.round(moonIllumination.fraction * 100),
    moon_rise: formatTime(moonTimes.rise),
    moon_set: formatTime(moonTimes.set)
  })
}

writeCsv(
  path.join(outputDir, 'sun.csv'),
  [
    'date',
    'astronomical_dawn',
    'nautical_dawn',
    'civil_dawn',
    'sunrise_geometric',
    'solar_noon',
    'sunset_geometric',
    'civil_dusk',
    'nautical_dusk',
    'astronomical_dusk',
    'day_length'
  ],
  sunRows
)

writeCsv(
  path.join(outputDir, 'moon.csv'),
  ['date', 'phase_name', 'illumination', 'moon_rise', 'moon_set'],
  moonRows
)
