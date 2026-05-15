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
