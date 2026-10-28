import { requestMapbox } from './mapbox.js'

const ERROR_MESSAGES = {
  NoRoute: 'Ingen bilväg hittades mellan punkterna.',
  NoSegment: 'En av punkterna ligger för långt från en väg. Välj en punkt närmare en väg.',
}

export async function fetchRoute(from, to, { signal } = {}) {
  const waypoints = `${from.coordinates.join(',')};${to.coordinates.join(',')}`
  const { status, body } = await requestMapbox(
    `/directions/v5/mapbox/driving/${waypoints}`,
    { geometries: 'geojson', overview: 'full' },
    { signal },
  )

  const knownError = ERROR_MESSAGES[body.code]
  if (knownError) {
    throw new Error(knownError)
  }
  const route = body.routes?.[0]
  if (status !== 200 || body.code !== 'Ok' || !route) {
    throw new Error(`Kunde inte hämta rutten (${status}).`)
  }
  return { distance: route.distance, duration: route.duration, geometry: route.geometry }
}
