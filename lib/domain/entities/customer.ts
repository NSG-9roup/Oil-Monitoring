export interface Customer {
  id: string
  company_name: string
  logo_url?: string | null
  status: string
  pin_configured?: boolean
  created_at: string
  updated_at: string
}

export interface CustomerFormData {
  company_name: string
  status: string
}
