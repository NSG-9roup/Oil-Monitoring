import React, { useState } from 'react'
import Image from 'next/image'
import type { Customer } from '@/lib/types'

interface AdminCustomersTabProps {
  customers: Customer[]
  profile: any
  onOpenImport: () => void
  onOpenAdd: () => void
  onOpenEdit: (customer: Customer) => void
  onOpenLogo: (customer: Customer) => void
  onOpenPin: (customer: Customer) => void
  onDelete: (id: string) => void
  formatDate: (value?: string | number | Date) => string
}

export function AdminCustomersTab({
  customers,
  profile,
  onOpenImport,
  onOpenAdd,
  onOpenEdit,
  onOpenLogo,
  onOpenPin,
  onDelete,
  formatDate
}: AdminCustomersTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customerPinFilter, setCustomerPinFilter] = useState<'all' | 'set' | 'not-set'>('all')

  const filteredCustomers = customers.filter((customer) => {
    const matchSearch = customer.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    const hasPin = Boolean(customer.pin_configured)
    const matchPin = customerPinFilter === 'all' || (customerPinFilter === 'set' ? hasPin : !hasPin)
    return matchSearch && matchPin
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          All <span className="text-red-600">Customers</span>
        </h2>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={onOpenImport}
            className="flex-1 sm:flex-none px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={onOpenAdd}
            className="flex-1 sm:flex-none px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Customer
          </button>
        </div>
      </div>
      
      {/* Search Box */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search customers by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCustomerPinFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            customerPinFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setCustomerPinFilter('set')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            customerPinFilter === 'set'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          PIN Set
        </button>
        <button
          onClick={() => setCustomerPinFilter('not-set')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            customerPinFilter === 'not-set'
              ? 'bg-amber-600 text-white'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          PIN Not Set
        </button>
      </div>

      <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
        <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
          <thead className="bg-orange-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Logo</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">PIN</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Created</th>
              <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-gray-100">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-primary-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center p-2">
                    {customer.logo_url ? (
                      <Image
                        src={customer.logo_url}
                        alt={customer.company_name}
                        width={64}
                        height={48}
                        className="max-w-full max-h-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-red-600 rounded flex items-center justify-center">
                        <span className="text-white font-black text-xs">
                          {customer.company_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">
                    {customer.company_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${
                    customer.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {customer.status === 'active' && (
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    )}
                    {customer.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                    customer.pin_configured
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    PIN: {customer.pin_configured ? 'Set' : 'Not Set'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {formatDate(customer.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-2">
                  <button
                    onClick={() => onOpenLogo(customer)}
                    className="inline-flex items-center px-3 py-1.5 text-blue-700 hover:text-white bg-blue-100 hover:bg-blue-600 rounded-lg transition-all"
                    title="Upload Logo"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Logo
                  </button>
                  <button
                    onClick={() => onOpenEdit(customer)}
                    className="inline-flex items-center px-3 py-1.5 text-primary-700 hover:text-white bg-primary-100 hover:bg-primary-600 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  {profile.role === 'admin' && (
                    <button
                      onClick={() => onOpenPin(customer)}
                      className="inline-flex items-center px-3 py-1.5 text-amber-700 hover:text-white bg-amber-100 hover:bg-amber-600 rounded-lg transition-all"
                      title="Set User Management PIN"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.105 0 2 .895 2 2v3a2 2 0 11-4 0v-3c0-1.105.895-2 2-2zm0 0V8a4 4 0 118 0v3M5 12h2m-1-1v2" />
                      </svg>
                      Set PIN
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(customer.id)}
                    className="inline-flex items-center px-3 py-1.5 text-secondary-700 hover:text-white bg-secondary-100 hover:bg-secondary-600 rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
