import React, { useState } from 'react'
import type { AdminMachine } from '@/lib/types'

interface AdminMachinesTabProps {
  machines: AdminMachine[]
  onOpenAdd: () => void
  onOpenEdit: (machine: AdminMachine) => void
  onDelete: (id: string) => void
}

export function AdminMachinesTab({
  machines,
  onOpenAdd,
  onOpenEdit,
  onDelete
}: AdminMachinesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMachines = machines.filter(machine => 
    machine.machine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          All <span className="text-orange-600">Machines</span>
        </h2>
        <button
          onClick={onOpenAdd}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Machine
        </button>
      </div>
      
      {/* Search Box */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search machines by name, serial number, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
        <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
          <thead className="bg-orange-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Machine Name</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Location</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-gray-100">
            {filteredMachines.map((machine) => (
              <tr key={machine.id} className="hover:bg-primary-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{machine.machine_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {machine.customer?.company_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {machine.location || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    machine.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {machine.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                  <button
                    onClick={() => onOpenEdit(machine)}
                    className="text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(machine.id)}
                    className="text-secondary-600 hover:text-secondary-800 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredMachines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No machines found. Click &quot;Add Machine&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
