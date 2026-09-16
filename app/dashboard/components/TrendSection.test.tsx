import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrendSection } from './TrendSection'

describe('TrendSection', () => {
  it('uses callbacks from props for quick actions', async () => {
    const user = userEvent.setup()
    const onOpenLabDetails = vi.fn()

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
        totalAnalysisCount={1}
        fleetHealthIndex={85}
        onOpenLabDetails={onOpenLabDetails}
      />
    )

    // Component renders action button which calls onOpenLabDetails
    const actionButton = screen.getByRole('button', { name: 'Request First Lab Test' })
    await user.click(actionButton)
    expect(onOpenLabDetails).toHaveBeenCalledTimes(1)

    // Verify other props are rendered
    expect(screen.getByText('Performance')).toBeTruthy()
    expect(screen.getByText('Viscosity @40°C')).toBeTruthy()
    expect(screen.getAllByText('No sample data').length).toBe(4)
  })
})
