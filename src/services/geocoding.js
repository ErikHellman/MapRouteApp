import { formatCoordinates } from '../lib/format.js'
import { requestMapbox } from './mapbox.js'

// Postcodes make poor names for a clicked point
const REVERSE_TYPES = 'address,street,neighborhood,locality,place,region,country'

// Short enough for an input field: "Kungsgatan 12, Stockholm" or "Göteborg"
function labelFor({ name, context }) {
  const city = context?.place?.name
  return city && city !== name ? `${name}, ${city}` : name
}

function toSuggestion(feature) {
  const { name, place_formatted } = feature.properties
  return {
    id: feature.id,
    name,
    place: place_formatted ?? '',
    label: labelFor(feature.properties),
    coordinates: feature.geometry.coordinates,
  }
}

export async function searchPlaces(query, { proximity, signal } = {}) {
  const { ok, body } = await requestMapbox(
    '/search/geocode/v6/forward',
    {
      q: query,
      autocomplete: 'true',
      language: 'sv',
      limit: '5',
      proximity: proximity?.join(','),
    },
    { signal },
  )
  if (!ok) {
    throw new Error('Sökningen misslyckades. Försök igen.')
  }
  return (body.features ?? []).map(toSuggestion)
}

// Keeps the given coordinates so a marker stays exactly where the user put it
export async function reverseGeocode(coordinates, { signal } = {}) {
  const [longitude, latitude] = coordinates
  const fallback = { name: formatCoordinates(coordinates), coordinates }
  try {
    const { ok, body } = await requestMapbox(
      '/search/geocode/v6/reverse',
      { longitude, latitude, language: 'sv', limit: '1', types: REVERSE_TYPES },
      { signal },
    )
    const feature = ok ? body.features?.[0] : undefined
    return feature ? { name: labelFor(feature.properties), coordinates } : fallback
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    return fallback
  }
}
