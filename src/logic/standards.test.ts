import { describe, expect, it } from 'vitest'
import { dotsScore, rateLift, thresholdsAt } from './standards'
import { getTable } from '@/data/standards'

describe('strength standards', () => {
  it('returns the table row exactly at a breakpoint', () => {
    expect(thresholdsAt('bench', 'male', 170)).toEqual([100, 140, 195, 260, 325])
  })
  it('interpolates between breakpoints', () => {
    const t = thresholdsAt('bench', 'male', 180)
    expect(t[2]).toBe(205) // midway between 195 and 215
  })
  it('clamps outside the table', () => {
    expect(thresholdsAt('squat', 'male', 90)).toEqual(getTable('squat', 'male')[0])
    expect(thresholdsAt('squat', 'male', 400)).toEqual(getTable('squat', 'male')[9])
  })
  it('rates a lift with progress to the next level', () => {
    const r = rateLift('bench', 'male', 170, 225)
    expect(r.level).toBe('Intermediate')
    expect(r.nextLevel).toBe('Advanced')
    expect(r.nextThresholdLb).toBe(260)
    expect(r.progress).toBeCloseTo((225 - 195) / (260 - 195), 5)
  })
  it('handles below-beginner and elite', () => {
    expect(rateLift('bench', 'male', 170, 50).level).toBeNull()
    expect(rateLift('bench', 'male', 170, 50).nextLevel).toBe('Beginner')
    const e = rateLift('bench', 'male', 170, 400)
    expect(e.level).toBe('Elite')
    expect(e.nextLevel).toBeNull()
    expect(e.progress).toBe(1)
  })
  it('derived and female tables scale', () => {
    expect(thresholdsAt('front_squat', 'male', 170)[2]).toBe(Math.round(280 * 0.8))
    expect(thresholdsAt('bench', 'female', 170)[2]).toBe(Math.round(195 * 0.52))
  })
  it('DOTS is in a sane range', () => {
    // 1000 lb total at 180 lb male ≈ 300ish
    const d = dotsScore(1000, 180, 'male')
    expect(d).toBeGreaterThan(280)
    expect(d).toBeLessThan(330)
  })
})
