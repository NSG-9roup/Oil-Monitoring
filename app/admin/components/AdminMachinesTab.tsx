'use client'

import React from 'react'
import type { AdminMachine } from '@/lib/types'

interface AdminMachinesTabProps {
  machines: AdminMachine[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  onOpenAdd: () => void
  onOpenEdit: (machine: AdminMachine) => void
  onDelete: (id: string) => void
}

export default function AdminMachinesTab({
  machines,
  searchQuery,
  setSearchQuery,
  onOpenAdd,
  onOpenEdit,
  onDelete
}: AdminMachinesTabProps) {

  const filteredMachines = machines.filter(machine => 
    machine.machine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <svg className="w-8 h-8 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            All Machines
          </h2>
          <p className="text-slate-400 font-medium text-xs mt-1">Configure client assets and factory plant locations.</p>
        </div>

        <button
          onClick={onOpenAdd}
          className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-orange-500/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Machine
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search machines by name, customer, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 pl-10 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
        />
        <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      {/* Spacious Premium Table Layout */}
      <div className="w-full overflow-auto rounded-[2rem] border border-slate-100 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] bg-white max-h-[65vh]">
        <table className="w-full min-w-[780px] divide-y divide-slate-100">
          <thead className="bg-slate-50/70 backdrop-blur-sm sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Machine Name</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100">
            {filteredMachines.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic text-sm">
                  No machines found matching filters.
                </td>
              </tr>
            ) : (
              filteredMachines.map((machine) => (
                <tr key={machine.id} className="hover:bg-indigo-50/15 transition-colors duration-200">
                  {/* Machine Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-black text-slate-800">{machine.machine_name}</div>
                  </td>

                  {/* Customer Company */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                    {machine.customer?.company_name || 'N/A'}
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                    {machine.location || 'N/A'}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${
                      machine.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : machine.status === 'maintenance'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {machine.status === 'active' && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                      )}
                      {machine.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-1.5">
                    <button
                      onClick={() => onOpenEdit(machine)}
                      className="inline-flex items-center px-3 py-1.5 text-slate-700 hover:text-white bg-slate-100 hover:bg-orange-500 rounded-xl transition-all duration-300"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    
                    <button
                      onClick={() => onDelete(machine.id)}
                      className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 hover:border-transparent rounded-xl transition-all duration-300"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
