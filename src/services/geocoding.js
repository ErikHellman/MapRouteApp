import { requestMapbox } from './mapbox.js'

function toSuggestion(feature) {
  const { name, place_formatted, full_address } = feature.properties
  return {
    id: feature.id,
    name,
    place: place_formatted ?? '',
    fullName: full_address ?? name,
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
  const fallback = { name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, coordinates }
  try {
    const { ok, body } = await requestMapbox(
      '/search/geocode/v6/reverse',
      { longitude, latitude, language: 'sv', limit: '1' },
      { signal },
    )
    const feature = ok ? body.features?.[0] : undefined
    return feature ? { name: toSuggestion(feature).fullName, coordinates } : fallback
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    return fallback
  }
}
