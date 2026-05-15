import { describe, it, expect } from 'vitest'
import { generateAlerts, filterAlertsByStatus } from '../alerts/engine'

describe('Alerts Engine', () => {
  describe('generateAlerts', () => {
    it('should generate critical alert for high viscosity deviation', () => {
      const testData = {
        viscosity_40c: 150,
        baseline_viscosity_40c: 100,
        water_content: 0.02,
        tan_value: 0.5,
      }

      const alerts = generateAlerts(testData)
      const criticalAlert = alerts.find(a => a.severity === 'critical' && a.parameter === 'viscosity')

      expect(criticalAlert).toBeDefined()
      expect(criticalAlert?.message).toContain('Viscosity')
    })

    it('should generate warning alert for moderate water content', () => {
      const testData = {
        viscosity_40c: 100,
        baseline_viscosity_40c: 100,
        water_content: 0.08,
        tan_value: 0.3,
      }

      const alerts = generateAlerts(testData)
      const waterAlert = alerts.find(a => a.parameter === 'water_content')

      expect(waterAlert?.severity).toMatch(/critical|warning/)
    })

    it('should not generate alerts for normal parameters', () => {
      const testData = {
        viscosity_40c: 100,
        baseline_viscosity_40c: 100,
        water_content: 0.02,
        tan_value: 0.3,
      }

      const alerts = generateAlerts(testData)
      expect(alerts.length).toBe(0)
    })
  })

  describe('filterAlertsByStatus', () => {
    it('should filter alerts by severity', () => {
      const allAlerts = [
        { id: '1', severity: 'critical', status: 'open' },
        { id: '2', severity: 'warning', status: 'open' },
        { id: '3', severity: 'critical', status: 'open' },
      ]

      const criticalOnly = filterAlertsByStatus(allAlerts, 'critical')
      expect(criticalOnly).toHaveLength(2)
      expect(criticalOnly.every(a => a.severity === 'critical')).toBe(true)
    })

    it('should return all alerts when filter is "all"', () => {
      const allAlerts = [
        { id: '1', severity: 'critical' },
        { id: '2', severity: 'warning' },
      ]

      const filtered = filterAlertsByStatus(allAlerts, 'all')
      expect(filtered).toHaveLength(2)
    })
  })
})
