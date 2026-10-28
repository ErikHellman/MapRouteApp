import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRoute } from './directions.js'

vi.mock('../config.js', () => ({ MAPBOX_TOKEN: 'test-token' }))

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const from = { name: 'Stockholm', coordinates: [18.0686, 59.3293] }
const to = { name: 'Uppsala', coordinates: [17.6389, 59.8586] }
const geometry = { type: 'LineString', coordinates: [[18.0686, 59.3293], [17.6389, 59.8586]] }

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchRoute', () => {
  it('requests a full GeoJSON driving route between the points', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 'Ok', routes: [{ distance: 1, duration: 2, geometry }] }))

    await fetchRoute(from, to)

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin).toBe('https://api.mapbox.com')
    expect(url.pathname).toBe('/directions/v5/mapbox/driving/18.0686,59.3293;17.6389,59.8586')
    expect(url.searchParams.get('geometries')).toBe('geojson')
    expect(url.searchParams.get('overview')).toBe('full')
    expect(url.searchParams.get('access_token')).toBe('test-token')
  })

  it('returns distance, duration and geometry of the first route', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        code: 'Ok',
        routes: [
          { distance: 70123.4, duration: 3900.2, geometry, legs: [] },
          { distance: 1, duration: 1, geometry },
        ],
      }),
    )

    expect(await fetchRoute(from, to)).toEqual({ distance: 70123.4, duration: 3900.2, geometry })
  })

  it('passes the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 'Ok', routes: [{ distance: 1, duration: 2, geometry }] }))
    const controller = new AbortController()

    await fetchRoute(from, to, { signal: controller.signal })

    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal })
  })

  it('explains when no route exists', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 'NoRoute', routes: [] }))

    await expect(fetchRoute(from, to)).rejects.toThrow('Ingen bilväg hittades mellan punkterna.')
  })

  it('explains when a point is too far from a road', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ code: 'NoSegment', message: 'No road' }, 422))

    await expect(fetchRoute(from, to)).rejects.toThrow(/för långt från en väg/)
  })

  it('throws a token error on 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not Authorized - Invalid Token' }, 401))

    await expect(fetchRoute(from, to)).rejects.toThrow(/token/i)
  })

  it('throws a generic error with the status for other failures', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Too Many Requests' }, 429))

    await expect(fetchRoute(from, to)).rejects.toThrow(/Kunde inte hämta rutten \(429\)/)
  })
})
