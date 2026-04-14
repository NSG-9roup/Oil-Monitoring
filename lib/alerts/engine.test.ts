import { describe, it, expect } from 'vitest'
import { buildDashboardAlerts } from './engine'
import type { AlertInput } from './engine'

describe('buildDashboardAlerts', () => {
  it('filters out normal or unknown statuses', () => {
    const inputs: AlertInput[] = [
      {
        machineId: '1', customerId: 'c1', machineName: 'M1', customerName: 'C1', customerEmail: 'e@o.com',
        statusLevel: 'normal', statusText: 'Healthy', nextAction: 'None', testDate: '2023-01-01', daysSinceTest: 5, healthScore: 90
      },
      {
        machineId: '2', customerId: 'c2', machineName: 'M2', customerName: 'C2', customerEmail: 'e@o.com',
        statusLevel: 'critical', statusText: 'Danger', nextAction: 'Stop', testDate: '2023-01-01', daysSinceTest: 5, healthScore: 40
      }
    ]
    const alerts = buildDashboardAlerts(inputs)
    expect(alerts.length).toBe(1)
    expect(alerts[0].machineId).toBe('2')
  })

  it('sets severity to critical if healthScore < 50 regardless of status array string', () => {
    const inputs: AlertInput[] = [
      {
        machineId: '1', customerId: 'c1', machineName: 'M1', customerName: 'C1', customerEmail: 'e@o.com',
        statusLevel: 'warning', statusText: 'Warning state', nextAction: 'Check', testDate: '2023-01-01', daysSinceTest: 5, healthScore: 45
      }
    ]
    const alerts = buildDashboardAlerts(inputs)
    expect(alerts[0].severity).toBe('critical')
  })
})
