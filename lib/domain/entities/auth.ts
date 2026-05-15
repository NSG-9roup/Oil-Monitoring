export type UserRole = 'customer' | 'admin' | 'sales'

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

export interface AdminProfile extends Profile {
  customer?: { company_name: string; id: string } | null // Avoid circular dependency with Customer
}

export interface AdminUser extends Profile {
  customer?: { company_name: string } | null
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
