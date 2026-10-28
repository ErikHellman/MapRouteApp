import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, createSavedRoute, loadRoutes, storeRoutes } from './savedRoutes.js'

function fakeStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value)
    },
  }
}

const from = { name: 'Stockholm', coordinates: [18.0686123456, 59.3293234567] }
const to = { name: 'Uppsala', coordinates: [17.6389, 59.8586] }
const route = {
  distance: 70123.4,
  duration: 3900.2,
  geometry: {
    type: 'LineString',
    coordinates: [
      [18.0686123456, 59.3293234567],
      [17.6389, 59.8586],
    ],
  },
}

describe('createSavedRoute', () => {
  it('builds a record with id, name, timestamp and route data', () => {
    const now = new Date('2026-10-28T12:00:00Z')
    const saved = createSavedRoute({ name: 'Till jobbet', from, to, route }, now)

    expect(saved.id).toEqual(expect.any(String))
    expect(saved.name).toBe('Till jobbet')
    expect(saved.createdAt).toBe('2026-10-28T12:00:00.000Z')
    expect(saved.distance).toBe(70123.4)
    expect(saved.duration).toBe(3900.2)
    expect(saved.from.name).toBe('Stockholm')
    expect(saved.to.name).toBe('Uppsala')
  })

  it('rounds coordinates to five decimals', () => {
    const saved = createSavedRoute({ name: 'x', from, to, route })

    expect(saved.from.coordinates).toEqual([18.06861, 59.32932])
    expect(saved.geometry.coordinates[0]).toEqual([18.06861, 59.32932])
    expect(saved.geometry.type).toBe('LineString')
  })

  it('falls back to "From → To" when the name is blank', () => {
    const saved = createSavedRoute({ name: '   ', from, to, route })
    expect(saved.name).toBe('Stockholm → Uppsala')
  })
})

describe('loadRoutes / storeRoutes', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadRoutes(fakeStorage())).toEqual([])
  })

  it('round-trips stored routes', () => {
    const storage = fakeStorage()
    const saved = createSavedRoute({ name: 'a', from, to, route })

    storeRoutes([saved], storage)

    expect(JSON.parse(storage.data[STORAGE_KEY])).toHaveLength(1)
    expect(loadRoutes(storage)).toEqual([saved])
  })

  it('returns an empty list for corrupt JSON', () => {
    expect(loadRoutes(fakeStorage({ [STORAGE_KEY]: '{not json' }))).toEqual([])
  })

  it('drops entries that do not look like saved routes', () => {
    const saved = createSavedRoute({ name: 'a', from, to, route })
    const storage = fakeStorage({
      [STORAGE_KEY]: JSON.stringify([saved, { id: 'broken' }, null, 'text']),
    })

    expect(loadRoutes(storage)).toEqual([saved])
  })

  it('returns an empty list when storage cannot be read', () => {
    const storage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
    }
    expect(loadRoutes(storage)).toEqual([])
  })

  it('throws a Swedish message when storage is full', () => {
    const storage = {
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    expect(() => storeRoutes([], storage)).toThrow(/lagring är full/)
  })
})
