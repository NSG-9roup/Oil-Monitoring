import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrendSection } from './TrendSection'

describe('TrendSection', () => {
  it('uses callbacks from props for quick actions', async () => {
    const user = userEvent.setup()
    const onOpenLabDetails = vi.fn()
    const onOpenActionCenter = vi.fn()

    render(
      <TrendSection
        language="en"
        chartData={[]}
        chartHeight={280}
        selectedMachineTrendAlerts={[]}
        performanceTitle="Performance"
        performanceDesc="Performance description"
        noSampleData="No sample data"
        checkConsole="Check console"
        noDataAvailable="No data available"
        trendAlertsTitle="Trend Alerts"
        trendAlertsDesc="Trend alerts description"
        activeTrendAlertsLabel="0 active"
        noTrendAlerts="No active trend alerts"
        severityLowLabel="Low"
        severityMediumLabel="Medium"
        severityHighLabel="High"
        recommendedActionLabel="Action"
        onOpenLabDetails={onOpenLabDetails}
        onOpenActionCenter={onOpenActionCenter}
      />
    )

    await user.click(screen.getByRole('button', { name: 'View Report Details' }))
    await user.click(screen.getByRole('button', { name: 'Follow Up in Action Center' }))

    expect(onOpenLabDetails).toHaveBeenCalledTimes(1)
    expect(onOpenActionCenter).toHaveBeenCalledTimes(1)
    expect(screen.getByText('No sample data')).toBeTruthy()
  })
})
