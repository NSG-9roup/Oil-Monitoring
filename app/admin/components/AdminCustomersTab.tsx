'use client'

import React from 'react'
import Image from 'next/image'
import type { Customer } from '@/lib/types'

interface AdminCustomersTabProps {
  customers: Customer[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  onOpenImport: () => void
  onOpenAdd: () => void
  onOpenEdit: (customer: Customer) => void
  onOpenLogo: (customer: Customer) => void
  onDelete: (id: string) => void
  formatDate: (value?: string | number | Date) => string
}

export default function AdminCustomersTab({
  customers,
  searchQuery,
  setSearchQuery,
  onOpenImport,
  onOpenAdd,
  onOpenEdit,
  onOpenLogo,
  onDelete,
  formatDate
}: AdminCustomersTabProps) {

  const filteredCustomers = customers.filter((customer) => {
    const matchSearch = customer.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  return (
    <div className="space-y-6 animate-pop-micro">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <svg className="w-8 h-8 text-orange-500 shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            All Customers
          </h2>
          <p className="text-slate-400 font-medium text-xs mt-1">Manage corporate clients, customer profiles, and system access.</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto select-none">
          <button
            onClick={onOpenImport}
            className="flex-1 sm:flex-none px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={onOpenAdd}
            className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-orange-500/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Customer
          </button>
        </div>
      </div>
      
      {/* Search & Filters */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search customers by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 pl-10 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </div>

      {/* Spacious Premium Table Layout */}
      <div className="w-full overflow-auto rounded-[2rem] border border-slate-100 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] bg-white max-h-[65vh]">
        <table className="w-full min-w-[980px] divide-y divide-slate-100">
          <thead className="bg-slate-50/70 backdrop-blur-sm sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Company</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
              <th className="px-6 py-4.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic text-sm">
                  No customers found.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-indigo-50/10 transition-colors duration-200">
                  {/* Logo Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative w-14 h-11 rounded-xl overflow-hidden bg-white border border-slate-150 flex items-center justify-center shadow-sm">
                      {customer.logo_url ? (
                        <Image
                          src={customer.logo_url}
                          alt={customer.company_name}
                          fill
                          className="object-contain p-1.5"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
                          <span className="text-white font-black text-[10px]">
                            {customer.company_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Company Name Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-black text-slate-800">
                      {customer.company_name}
                    </div>
                  </td>

                  {/* Status Column */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${
                      customer.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {customer.status === 'active' && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse"></span>
                      )}
                      {customer.status}
                    </span>
                  </td>

                  {/* Created Date Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-bold">
                    {formatDate(customer.created_at)}
                  </td>

                  {/* Action Column */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-1.5">
                    <button
                      onClick={() => onOpenLogo(customer)}
                      className="inline-flex items-center px-3 py-1.5 text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-900 rounded-xl transition-all duration-300"
                      title="Upload Logo"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Logo
                    </button>
                    
                    <button
                      onClick={() => onOpenEdit(customer)}
                      className="inline-flex items-center px-3 py-1.5 text-slate-700 hover:text-white bg-slate-100 hover:bg-orange-500 rounded-xl transition-all duration-300"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>

                    <button
                      onClick={() => onDelete(customer.id)}
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
