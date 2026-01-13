export const parseCSV = (csv) => {
  const lines = csv.trim().split(/\r?\n/)
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    const obj = {}
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim()
    })
    return obj
  })
}

export const getDateKey = (date) =>
  date.toISOString().split('T')[0].replace(/-/g, '/')

export const findDateIndex = (rows, dateKey) =>
  rows.findIndex(row => row.date === dateKey)

export const formatDisplayDate = (dateKey) =>
  new Date(dateKey.replace(/\//g, '-')).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
