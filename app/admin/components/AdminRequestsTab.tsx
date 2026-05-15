'use client'

import { useState } from 'react'
import { registerMachineFromAction, updateActionStatus } from '@/app/actions/dashboardActions'

type NewMachineData = {
  machine_name?: string
  model?: string
  location?: string
}

type MaintenanceActionRow = {
  id: string
  customer_id: string
  created_at: string
  priority: string
  status: string
  source_payload?: {
    is_new_machine?: boolean
    new_machine_data?: NewMachineData
  }
  machine?: {
    machine_name?: string
  }
  customer?: {
    company_name?: string
  }
}

interface AdminRequestsTabProps {
  actions: MaintenanceActionRow[]
  onRefresh: () => void
}

export default function AdminRequestsTab({ actions, onRefresh }: AdminRequestsTabProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingRequest, setEditingRequest] = useState<MaintenanceActionRow | null>(null)
  const [editFormData, setEditFormData] = useState({
    machine_name: '',
    model: '',
    location: '',
    serial_number: ''
  })

  const openRegisterModal = (action: MaintenanceActionRow) => {
    const data = action.source_payload?.new_machine_data || {}
    setEditingRequest(action)
    setEditFormData({
      machine_name: data.machine_name || '',
      model: data.model || '',
      location: data.location || '',
      serial_number: ''
    })
  }

  const handleRegister = async () => {
    if (!editingRequest) return
    setLoadingId(editingRequest.id)
    try {
      await registerMachineFromAction(editingRequest.id, {
        customer_id: editingRequest.customer_id,
        machine_name: editFormData.machine_name,
        model: editFormData.model,
        location: editFormData.location,
        serial_number: editFormData.serial_number
      })
      alert('Machine registered and action updated!')
      setEditingRequest(null)
      onRefresh()
    } catch (error) {
      console.error('Failed to register:', error)
      alert('Error registering machine.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleComplete = async (id: string) => {
    if (!confirm('Mark this request as completed?')) return
    setLoadingId(id)
    try {
      await updateActionStatus(id, 'completed')
      onRefresh()
    } catch {
      alert('Error updating status.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Lab Test Requests</h2>
          <p className="text-sm text-gray-500">Monitor and process incoming sampling requests from customers.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Machine</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No active requests found.</td>
                </tr>
              ) : (
                actions.map((action) => {
                  const isNew = action.source_payload?.is_new_machine
                  return (
                    <tr key={action.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900 text-sm">{action.customer?.company_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-800">
                            {isNew ? action.source_payload?.new_machine_data?.machine_name : action.machine?.machine_name}
                          </span>
                          {isNew && (
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded w-fit">New Machine</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                          action.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {action.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold ${
                          action.status === 'open' ? 'text-blue-600' : 'text-emerald-600'
                        }`}>
                          {action.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(action.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {isNew && action.status === 'open' && (
                          <button
                            onClick={() => openRegisterModal(action)}
                            className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                          >
                            Register Machine
                          </button>
                        )}
                        {action.status !== 'completed' && (
                          <button
                            onClick={() => handleComplete(action.id)}
                            disabled={loadingId === action.id}
                            className="text-xs font-bold text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Machine Modal */}
      {editingRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Verify & Register Machine</h3>
              <button onClick={() => setEditingRequest(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">Please verify the details provided by the customer before adding to the database.</p>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Machine Name</label>
                <input
                  type="text"
                  value={editFormData.machine_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, machine_name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Model / Type</label>
                  <input
                    type="text"
                    value={editFormData.model}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</label>
                  <input
                    type="text"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Serial Number (Optional)</label>
                <input
                  type="text"
                  placeholder="SN-123456"
                  value={editFormData.serial_number}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-xl text-sm outline-none"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={loadingId === editingRequest.id}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4"
              >
                {loadingId === editingRequest.id ? 'Registering...' : 'Approve & Register Machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
