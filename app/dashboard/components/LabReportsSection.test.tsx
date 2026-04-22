import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LabReportsSection } from './LabReportsSection'

describe('LabReportsSection', () => {
  it('calls helper and action callbacks through component contract', async () => {
    const user = userEvent.setup()
    const onToggleReport = vi.fn()
    const onOpenReportPdf = vi.fn()
    const onDownloadReportPdf = vi.fn()
    const onOpenPurchaseAnalytics = vi.fn()

    const getStatus = vi.fn(() => ({ level: 'warning' as const, text: 'warning' }))
    const getTrend = vi.fn(() => ({ direction: 'stable', icon: '→' }))
    const getRecommendations = vi.fn(() => [
      {
        icon: '⚠',
        text: 'Monitor viscosity',
        action: 'Review maintenance schedule',
        severity: 'warning' as const,
      },
    ])

    render(
      <LabReportsSection
        language="en"
        title="Lab Reports"
        description="1 report"
        reports={[
          {
            id: 'r1',
            test_date: '2026-04-01',
            test_type: 'routine',
            viscosity_40c: 110,
            viscosity_100c: 14,
            water_content: 0.01,
            tan_value: 1.2,
            notes: 'ok',
            pdf_path: 'reports/r1.pdf',
            evaluation_mode: 'oil_type_based',
            product: {
              product_name: 'Oil A',
              product_type: 'hydraulic',
            },
          },
        ]}
        expandedReports={new Set(['r1'])}
        selectedMachineName="Machine A"
        criticalLabel="Critical"
        warningLabel="Warning"
        normalLabel="Normal"
        unknownLabel="Unknown"
        viscosityLabel="Viscosity"
        waterContentLabel="Water"
        tanValueLabel="TAN"
        notAvailableLabel="N/A"
        emptyLabel="No data"
        completeAnalysisLabel="Complete Analysis"
        evaluationLabel="Industry standard"
        machineLabel="Machine"
        productLabel="Product"
        viewReportLabel="View Report"
        onOpenPurchaseAnalytics={onOpenPurchaseAnalytics}
        onToggleReport={onToggleReport}
        onOpenReportPdf={onOpenReportPdf}
        onDownloadReportPdf={onDownloadReportPdf}
        getStatus={getStatus}
        getTrend={getTrend}
        getRecommendations={getRecommendations}
      />
    )

    expect(getStatus).toHaveBeenCalledTimes(1)
    expect(getTrend).toHaveBeenCalledTimes(4)
    expect(getRecommendations).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Open Purchase Analytics' }))
    expect(onOpenPurchaseAnalytics).toHaveBeenCalledTimes(1)

    await user.click(screen.getByText(/2026/))
    expect(onToggleReport).toHaveBeenCalledWith('r1')

    const viewButtons = screen.getAllByRole('button', { name: 'View Report' })
    await user.click(viewButtons[0])
    expect(onOpenReportPdf).toHaveBeenCalledWith('reports/r1.pdf')

    await user.click(screen.getByRole('button', { name: 'Download PDF' }))
    expect(onDownloadReportPdf).toHaveBeenCalledWith('reports/r1.pdf', '2026-04-01')
  })
})
