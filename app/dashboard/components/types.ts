export type DashboardLanguage = 'id' | 'en'

export interface MachineTolerances {
  viscosity40Min?: number | null
  viscosity40Max?: number | null
  viscosity100Min?: number | null
  viscosity100Max?: number | null
  waterContentMax?: number | null
  waterContentUnit?: string | null
  tanMax?: number | null
}

export interface ChartPoint {
  date: string
  isoDate?: string
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
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value: number
  notes: string
  machine_id?: string
  pdf_path?: string
  overall_status?: 'normal' | 'warning' | 'critical' | null
  running_hours?: number | null
  viscosity_40c_min?: number | null
  viscosity_40c_max?: number | null
  viscosity_100c_min?: number | null
  viscosity_100c_max?: number | null
  water_content_max?: number | null
  tan_max?: number | null
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

export interface LabRequest {
  id: string
  customer_id: string
  requested_by_profile_id: string
  assigned_to_profile_id?: string | null
  machine_id: string | null
  title: string
  description: string | null
  notes?: string | null
  running_hours?: number | null
  due_date: string | null
  priority: string
  status: string
  is_new_machine: boolean
  new_machine_data: {
    machine_name?: string
    model?: string
    location?: string
  } | null
  request_date: string
  created_at: string
  updated_at: string
  machine?: {
    machine_name: string
    location?: string | null
  } | null
  sample_photo_path?: string | null
  assigned_to?: {
    full_name: string
  } | null
}

export interface Machine {
  id: string
  machine_name: string
  serial_number: string
  model: string
  location: string
  status: string
  customer_id: string
}

export interface MachineInsight {
  machine: Machine
  latestTest?: unknown
  healthScore: number | null
  status: { level: string; text: string; [key: string]: unknown }
  daysSinceTest?: number | null
  priorityScore?: number
  nextAction?: string
}

