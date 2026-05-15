export interface LabTest {
  id: string
  machine_id: string
  product_id: string
  test_date: string
  test_type?: string
  viscosity_40c?: number | null
  viscosity_100c?: number | null
  water_content: number | null
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value: number | null
  notes?: string
  pdf_path: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface AdminLabTest extends LabTest {
  machine?: {
    machine_name: string
    customer_id: string
    serial_number?: string | null
    model?: string | null
    location?: string | null
    customer?: { company_name: string }
  }
  product?: {
    product_name: string
    product_type: string
    baseline_viscosity_40c?: number
    baseline_viscosity_100c?: number
    baseline_tan?: number
  }
}

export interface LabTestFormData {
  machine_id: string
  product_id: string
  test_date: string
  viscosity_40c?: number
  viscosity_100c?: number
  water_content?: number
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value?: number
  notes?: string
}
