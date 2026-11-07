import { describe, expect, it } from 'vitest'
import { nearestLoadable, platesPerSide, warmupRamp } from './plates'

const P = [45, 35, 25, 10, 5, 2.5]
describe('plates', () => {
  it('loads 225 as two 45s per side', () => {
    expect(platesPerSide(225, 45, P)).toEqual({ plates: [45, 45], remainderLb: 0 })
  })
  it('handles fractional plates and remainder', () => {
    expect(platesPerSide(137.5, 45, P)).toEqual({ plates: [45], remainderLb: 2.5 })
    expect(platesPerSide(140, 45, P)).toEqual({ plates: [45, 2.5], remainderLb: 0 })
  })
  it('bar only or below', () => {
    expect(platesPerSide(45, 45, P)).toEqual({ plates: [], remainderLb: 0 })
    expect(platesPerSide(20, 45, P)).toEqual({ plates: [], remainderLb: 0 })
  })
  it('nearest loadable rounds down', () => {
    expect(nearestLoadable(137.5, 45, P)).toBe(135)
  })
  it('warm-up ramp', () => {
    expect(warmupRamp(225, 45)).toEqual([
      { weightLb: 45, reps: 10 }, { weightLb: 115, reps: 5 }, { weightLb: 160, reps: 3 }, { weightLb: 190, reps: 1 },
    ])
    expect(warmupRamp(45, 45)).toEqual([])
  })
})
