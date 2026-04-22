export type DashboardLanguage = 'id' | 'en'

export interface ChartPoint {
  date: string
  viscosity_40c: number
  viscosity_100c: number
  water: number
  tan: number
}

export interface TrendAlertItem {
  id: string
  parameter: 'Viscosity' | 'Water content' | 'TAN'
  severity: 'Low' | 'Medium' | 'High'
  title: string
  message: string
  recommendedAction: string
  chartValue: number
  chartDate: string
}

export interface LabProduct {
  product_name: string
  product_type: string
  baseline_viscosity_40c?: number
  baseline_viscosity_100c?: number
  baseline_tan?: number
}

export interface LabReportItem {
  id: string
  test_date: string
  test_type: string
  viscosity_40c: number
  viscosity_100c: number
  water_content: number
  tan_value: number
  notes: string
  machine_id?: string
  pdf_path?: string
  evaluation_mode?: 'oil_type_based' | 'product_specific' | 'new_oil_verification'
  product?: LabProduct
}

export interface StatusResult {
  level: 'critical' | 'warning' | 'normal' | 'unknown'
  text: string
}

export interface TrendResult {
  direction: string
  icon: string
}

export interface RecommendationResult {
  icon: string
  text: string
  action: string
  severity: 'critical' | 'warning' | 'normal'
}
