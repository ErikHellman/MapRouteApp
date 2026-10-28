import { describe, expect, it } from 'vitest'
import { formatDistance, formatDuration } from './format.js'

// Intl uses non-breaking spaces for sv-SE; compare with plain spaces
const plain = (text) => text.replace(/\s/g, ' ')

describe('formatDistance', () => {
  it('shows meters below one kilometer', () => {
    expect(plain(formatDistance(850))).toBe('850 m')
    expect(plain(formatDistance(12.4))).toBe('12 m')
  })

  it('shows kilometers with one decimal and a Swedish comma', () => {
    expect(plain(formatDistance(1000))).toBe('1,0 km')
    expect(plain(formatDistance(12345))).toBe('12,3 km')
  })

  it('drops decimals from 100 km and groups thousands', () => {
    expect(plain(formatDistance(123456))).toBe('123 km')
    expect(plain(formatDistance(1234567))).toBe('1 235 km')
  })
})

describe('formatDuration', () => {
  it('shows minutes below one hour', () => {
    expect(formatDuration(45 * 60)).toBe('45 min')
    expect(formatDuration(89)).toBe('1 min')
  })

  it('shows hours and minutes', () => {
    expect(formatDuration(83 * 60)).toBe('1 tim 23 min')
    expect(formatDuration(26 * 3600 + 5 * 60)).toBe('26 tim 5 min')
  })

  it('omits zero minutes on whole hours', () => {
    expect(formatDuration(2 * 3600)).toBe('2 tim')
    expect(formatDuration(2 * 3600 + 20)).toBe('2 tim')
  })

  it('shows less than a minute for very short trips', () => {
    expect(formatDuration(20)).toBe('< 1 min')
    expect(formatDuration(0)).toBe('< 1 min')
  })
})
