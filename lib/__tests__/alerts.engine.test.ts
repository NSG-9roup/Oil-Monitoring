import { describe, it, expect } from 'vitest'
import { buildDashboardAlerts, AlertInput } from '../alerts/engine'

describe('Alerts Engine', () => {
  describe('buildDashboardAlerts', () => {
    it('should generate critical alert for critical status level', () => {
      const testData: AlertInput[] = [{
        machineId: 'm1',
        customerId: 'c1',
        machineName: 'Machine 1',
        customerName: 'Customer 1',
        customerEmail: 'c1@example.com',
        statusLevel: 'critical',
        statusText: 'Viscosity high',
        nextAction: 'Change oil',
        testDate: '2026-05-01',
        daysSinceTest: 5,
        healthScore: 40,
      }]

      const alerts = buildDashboardAlerts(testData)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('critical')
      expect(alerts[0].title).toContain('Critical')
    })

    it('should generate warning alert for warning status level', () => {
      const testData: AlertInput[] = [{
        machineId: 'm2',
        customerId: 'c1',
        machineName: 'Machine 2',
        customerName: 'Customer 1',
        customerEmail: 'c1@example.com',
        statusLevel: 'warning',
        statusText: 'Water content rising',
        nextAction: 'Monitor',
        testDate: '2026-05-01',
        daysSinceTest: 10,
        healthScore: 70,
      }]

      const alerts = buildDashboardAlerts(testData)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('warning')
    })

    it('should not generate alerts for normal status level', () => {
      const testData: AlertInput[] = [{
        machineId: 'm3',
        customerId: 'c1',
        machineName: 'Machine 3',
        customerName: 'Customer 1',
        customerEmail: 'c1@example.com',
        statusLevel: 'normal',
        statusText: 'All normal',
        nextAction: 'Continue sampling',
        testDate: '2026-05-01',
        daysSinceTest: 30,
        healthScore: 95,
      }]

      const alerts = buildDashboardAlerts(testData)
      expect(alerts).toHaveLength(0)
    })
  })
})
