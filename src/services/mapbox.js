import { MAPBOX_TOKEN } from '../config.js'

const API_ORIGIN = 'https://api.mapbox.com'

// Returns the parsed body and HTTP status. Network errors and aborts propagate,
// as do rejected tokens since no request can succeed without one.
export async function requestMapbox(path, params, { signal } = {}) {
  const url = new URL(path, API_ORIGIN)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  }
  url.searchParams.set('access_token', MAPBOX_TOKEN)

  const response = await fetch(url.toString(), { signal })
  if (response.status === 401 || response.status === 403) {
    throw new Error('Mapbox nekade åtkomst. Kontrollera att din token är giltig och tillåter den här adressen.')
  }
  const body = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, body }
}
