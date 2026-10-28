const NBSP = ' '

const kmWithDecimal = new Intl.NumberFormat('sv-SE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const wholeNumber = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 })

export function formatDistance(meters) {
  if (meters < 1000) {
    return `${wholeNumber.format(meters)}${NBSP}m`
  }
  const km = meters / 1000
  const formatter = km < 100 ? kmWithDecimal : wholeNumber
  return `${formatter.format(km)}${NBSP}km`
}

export function formatDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 1) {
    return '< 1 min'
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) {
    return `${minutes} min`
  }
  return minutes === 0 ? `${hours} tim` : `${hours} tim ${minutes} min`
}
