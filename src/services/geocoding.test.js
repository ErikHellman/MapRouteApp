import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reverseGeocode, searchPlaces } from './geocoding.js'

vi.mock('../config.js', () => ({ MAPBOX_TOKEN: 'test-token' }))

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const feature = (overrides = {}) => ({
  id: 'abc',
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [18.0686, 59.3293] },
  properties: {
    mapbox_id: 'abc',
    name: 'Stockholm',
    place_formatted: 'Sverige',
    full_address: 'Stockholm, Sverige',
    coordinates: { longitude: 18.0686, latitude: 59.3293 },
    context: { place: { name: 'Stockholm' }, country: { name: 'Sverige' } },
    ...overrides,
  },
})

let fetchMock

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('searchPlaces', () => {
  it('calls forward geocoding with Swedish autocomplete and proximity', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ features: [] }))

    await searchPlaces('Stock', { proximity: [18.1, 59.3] })

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.mapbox.com/search/geocode/v6/forward')
    expect(url.searchParams.get('q')).toBe('Stock')
    expect(url.searchParams.get('autocomplete')).toBe('true')
    expect(url.searchParams.get('language')).toBe('sv')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.get('proximity')).toBe('18.1,59.3')
    expect(url.searchParams.get('access_token')).toBe('test-token')
  })

  it('leaves out proximity when none is given', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ features: [] }))

    await searchPlaces('Stock')

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.searchParams.has('proximity')).toBe(false)
  })

  it('passes the abort signal to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ features: [] }))
    const controller = new AbortController()

    await searchPlaces('Stock', { signal: controller.signal })

    expect(fetchMock.mock.calls[0][1]).toEqual({ signal: controller.signal })
  })

  it('maps features to suggestions', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ features: [feature()] }))

    const results = await searchPlaces('Stock')

    expect(results).toEqual([
      {
        id: 'abc',
        name: 'Stockholm',
        place: 'Sverige',
        label: 'Stockholm',
        coordinates: [18.0686, 59.3293],
      },
    ])
  })

  it('labels addresses and streets with their city', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        features: [
          feature({
            name: 'Kungsgatan 12',
            place_formatted: '111 35 Stockholm, Sverige',
            context: { place: { name: 'Stockholm' }, street: { name: 'Kungsgatan' } },
          }),
        ],
      }),
    )

    const [result] = await searchPlaces('Kungsgatan')

    expect(result.label).toBe('Kungsgatan 12, Stockholm')
  })

  it('uses the bare name when there is no city context', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ features: [feature({ name: 'Sverige', place_formatted: undefined, context: {} })] }),
    )

    const [result] = await searchPlaces('Sver')

    expect(result.label).toBe('Sverige')
    expect(result.place).toBe('')
  })

  it('throws a token error on 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Not Authorized' }, 401))

    await expect(searchPlaces('Stock')).rejects.toThrow(/token/i)
  })

  it('throws a search error on other failures', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'boom' }, 500))

    await expect(searchPlaces('Stock')).rejects.toThrow(/Sökningen misslyckades/)
  })
})

describe('reverseGeocode', () => {
  it('names the clicked position and keeps its coordinates', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ features: [feature({ name: 'Kungsgatan 1', context: { place: { name: 'Stockholm' } } })] }),
    )

    const point = await reverseGeocode([18.07, 59.33])

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/search/geocode/v6/reverse')
    expect(url.searchParams.get('longitude')).toBe('18.07')
    expect(url.searchParams.get('latitude')).toBe('59.33')
    expect(url.searchParams.get('language')).toBe('sv')
    expect(url.searchParams.get('limit')).toBe('1')
    // Postcodes make poor names for a clicked point, so they are left out
    expect(url.searchParams.get('types').split(',')).not.toContain('postcode')
    expect(point).toEqual({ name: 'Kungsgatan 1, Stockholm', coordinates: [18.07, 59.33] })
  })

  it('falls back to coordinates when nothing is found', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ features: [] }))

    const point = await reverseGeocode([18.0686123, 59.3293456])

    expect(point).toEqual({ name: '59.32935, 18.06861', coordinates: [18.0686123, 59.3293456] })
  })

  it('falls back to coordinates when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const point = await reverseGeocode([18, 59])

    expect(point.name).toBe('59.00000, 18.00000')
  })

  it('rethrows aborts', async () => {
    fetchMock.mockRejectedValue(new DOMException('aborted', 'AbortError'))

    await expect(reverseGeocode([18, 59])).rejects.toThrow('aborted')
  })
})
