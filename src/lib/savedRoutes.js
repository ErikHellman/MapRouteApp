export const STORAGE_KEY = 'maproute.savedRoutes.v1'

// Five decimals is about one meter, plenty for a drawn route
const round = (value) => Math.round(value * 1e5) / 1e5
const roundPosition = ([lng, lat]) => [round(lng), round(lat)]

export function createSavedRoute({ name, from, to, route }, now = new Date()) {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || `${from.name} → ${to.name}`,
    createdAt: now.toISOString(),
    from: { name: from.name, coordinates: roundPosition(from.coordinates) },
    to: { name: to.name, coordinates: roundPosition(to.coordinates) },
    distance: route.distance,
    duration: route.duration,
    geometry: {
      type: 'LineString',
      coordinates: route.geometry.coordinates.map(roundPosition),
    },
  }
}

const isPosition = (value) =>
  Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)

const isPoint = (value) =>
  typeof value?.name === 'string' && isPosition(value.coordinates)

function isSavedRoute(value) {
  return (
    typeof value?.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.createdAt === 'string' &&
    isPoint(value.from) &&
    isPoint(value.to) &&
    Number.isFinite(value.distance) &&
    Number.isFinite(value.duration) &&
    value.geometry?.type === 'LineString' &&
    Array.isArray(value.geometry.coordinates) &&
    value.geometry.coordinates.every(isPosition)
  )
}

// Even reading the localStorage property can throw (e.g. blocked site data),
// so it is resolved inside the try blocks below
export function loadRoutes(storage) {
  try {
    const parsed = JSON.parse((storage ?? globalThis.localStorage).getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isSavedRoute) : []
  } catch {
    return []
  }
}

export function storeRoutes(routes, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(routes))
  } catch (error) {
    if (error?.name === 'QuotaExceededError') {
      throw new Error('Webbläsarens lagring är full. Ta bort några sparade rutter och försök igen.', { cause: error })
    }
    throw new Error('Kunde inte spara i webbläsarens lagring.', { cause: error })
  }
}
