// Role type
export type UserRole = 'customer' | 'admin' | 'sales'

// Base Customer interface
export interface Customer {
  id: string
  company_name: string
  logo_url?: string | null
  status: string
  pin_configured?: boolean
  created_at: string
  updated_at: string
}

// Base Profile interface
export interface Profile {
  id: string
  full_name: string
  email: string
  phone_number?: string | null
  role: UserRole
  customer_id: string | null
  created_at: string
  updated_at: string
}

// Admin profile with nested customer
export interface AdminProfile extends Profile {
  customer?: Customer | null
}

export interface AdminUser extends Profile {
  customer?: { company_name: string } | null
}

// Base Product interface
export interface Product {
  id: string
  product_name: string
  product_type: string
  base_oil?: string
  viscosity_grade?: string
  oil_grade?: string
  created_at: string
  updated_at: string
}

// Admin Product with baseline viscosity fields
export interface AdminProduct extends Product {
  baseline_viscosity_40c?: number | null
  baseline_viscosity_100c?: number | null
  baseline_tan?: number | null
}

// Machine interface
export interface Machine {
  id: string
  customer_id: string
  machine_name: string
  serial_number?: string
  model?: string
  location: string | null
  status: string
  created_at: string
  updated_at: string
}

// Admin Machine with nested customer info
export interface AdminMachine extends Machine {
  customer?: { company_name: string } | null
}

export interface MachineProduct {
  id: string
  machine_id: string
  product_id: string
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
  product?: Product
}

// Base LabTest interface
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

// Admin LabTest with nested relations
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

export interface PurchaseHistory {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  purchase_date: string
  unit_price: number
  total_price: number
  status: 'completed' | 'pending' | 'cancelled'
  created_at: string
  updated_at: string
}

// Admin Purchase with nested relations
export interface AdminPurchase extends PurchaseHistory {
  customer?: { company_name: string }
  product?: { product_name: string }
}

// Form data types
export interface CustomerFormData {
  company_name: string
  status: string
}

export interface MachineFormData {
  machine_name: string
  customer_id: string
  serial_number?: string
  model?: string
  location?: string
  status: string
}

export interface ProductFormData {
  product_name: string
  product_type: string
  base_oil?: string
  viscosity_grade?: string
  baseline_viscosity_40c?: number
  baseline_viscosity_100c?: number
  baseline_tan?: number
  oil_grade?: string
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

export interface UserFormData {
  email: string
  password?: string
  full_name: string
  phone_number?: string
  contact_email?: string
  role: UserRole
  customer_id?: string
}

export interface PurchaseFormData {
  customer_id: string
  product_id: string
  quantity: number
  purchase_date: string
  unit_price: number
  total_price: number
}

export type MaintenanceActionStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'verified' | 'overdue'
export type MaintenanceActionPriority = 'low' | 'medium' | 'high'
export type MaintenanceVerificationStatus = 'pending' | 'passed' | 'failed'

export interface MaintenanceAction {
  id: string
  customer_id: string
  machine_id: string
  alert_key?: string | null
  title: string
  description?: string | null
  priority: MaintenanceActionPriority
  status: MaintenanceActionStatus
  owner_profile_id?: string | null
  due_date?: string | null
  completed_at?: string | null
  completed_by?: string | null
  verification_status: MaintenanceVerificationStatus
  evidence_notes?: string | null
  source_payload?: Record<string, unknown>
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
  machine?: { machine_name: string; location?: string | null }
  owner?: { full_name: string; email?: string | null } | null
}

export interface MaintenanceActionLog {
  id: string
  action_id: string
  actor_id?: string | null
  event_type: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed' | 'verified' | 'reopened'
  from_status?: string | null
  to_status?: string | null
  metadata?: Record<string, unknown>
  created_at: string
}

// API Error type
export interface ApiError {
  message: string
  code?: string
  details?: unknown
}
