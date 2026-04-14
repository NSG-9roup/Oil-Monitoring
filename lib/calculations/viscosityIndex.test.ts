import { describe, it, expect } from 'vitest'
import { calculateVI } from './viscosityIndex'

describe('calculateVI (ASTM D2270)', () => {
  it('calculates exact VI when v100 is explicitly in the exact lookup table (V100 = 2.0)', () => {
    // V100 = 2.0
    // L = 7.994, H = 6.394 (adjusted according to file)
    // If v40 == L (7.994), VI should be 0
    expect(calculateVI(7.994, 2.0).vi).toBeCloseTo(0, 1)

    // If v40 == H (6.394), VI should be 100
    expect(calculateVI(6.394, 2.0).vi).toBeCloseTo(100, 1)
  })

  it('calculates interpolated VI when v100 is between lookup table values', () => {
    const v100 = 5.05 // Between 5.0 and 5.5
    const v40 = 28.975 // Close to H value for 5.05
    const result = calculateVI(v40, v100)
    expect(result.isValid).toBe(true)
    expect(result.vi).toBeGreaterThan(95)
    expect(result.vi).toBeLessThan(105)
  })

  it('calculates VI > 100 using the fallback method', () => {
    const result = calculateVI(50.0, 10.0)
    expect(result.method).toBe('high-vi')
    expect(result.vi).toBeGreaterThan(100)
  })

  it('handles invalid inputs gracefully by returning isValid: false', () => {
    expect(calculateVI(0, 10).isValid).toBe(false)
    expect(calculateVI(10, 0).isValid).toBe(false)
    expect(calculateVI(10, 1.9).isValid).toBe(false)
  })
})
