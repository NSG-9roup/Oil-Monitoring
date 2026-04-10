export type AlertSeverity = 'critical' | 'warning'

export type DashboardAlert = {
  id: string
  machineId: string
  customerId: string | null
  machineName: string
  customerName: string
  customerEmail: string
  severity: AlertSeverity
  title: string
  message: string
  recommendedAction: string
  testDate: string
  daysSinceTest: number | null
  healthScore: number | null
}

export type AlertInput = {
  machineId: string
  customerId: string | null
  machineName: string
  customerName: string
  customerEmail: string
  statusLevel: 'critical' | 'warning' | 'normal' | 'unknown'
  statusText: string
  nextAction: string
  testDate: string | null
  daysSinceTest: number | null
  healthScore: number | null
}

export function buildDashboardAlerts(items: AlertInput[]): DashboardAlert[] {
  return items
    .filter((item) => item.statusLevel === 'critical' || item.statusLevel === 'warning')
    .map((item) => {
      const staleWarning = item.daysSinceTest !== null && item.daysSinceTest > 45
      const isCritical = item.statusLevel === 'critical' || (item.healthScore !== null && item.healthScore < 50)
      const severity: AlertSeverity = isCritical ? 'critical' : 'warning'

      const title = isCritical
        ? `Critical condition detected on ${item.machineName}`
        : `Warning trend detected on ${item.machineName}`

      const message = staleWarning
        ? `${item.statusText}. Last test is ${item.daysSinceTest} days old, retest overdue.`
        : `${item.statusText}. Last test date ${item.testDate || '-'} needs follow-up.`

      return {
        id: `${item.machineId}:${item.testDate || 'none'}:${severity}`,
        machineId: item.machineId,
        customerId: item.customerId,
        machineName: item.machineName,
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        severity,
        title,
        message,
        recommendedAction: item.nextAction,
        testDate: item.testDate || '',
        daysSinceTest: item.daysSinceTest,
        healthScore: item.healthScore,
      }
    })
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1
      }

      return (b.daysSinceTest || 0) - (a.daysSinceTest || 0)
    })
}
