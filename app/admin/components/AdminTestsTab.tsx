import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AdminLabTest, Customer, AdminMachine } from '@/lib/types'

interface AdminTestsTabProps {
  tests: AdminLabTest[]
  customers: Customer[]
  machines: AdminMachine[]
  onOpenAdd: () => void
  onOpenEdit: (test: AdminLabTest) => void
  onDelete: (id: string) => void
  onViewPdf: (url: string) => void
  formatDate: (value?: string | number | Date) => string
}

export function AdminTestsTab({
  tests,
  customers,
  machines,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onViewPdf,
  formatDate
}: AdminTestsTabProps) {
  const supabase = createClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [filterMachine, setFilterMachine] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')

  const filterByDate = (dateString?: string) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (customDateFrom || customDateTo) {
      if (customDateFrom && date < new Date(customDateFrom)) return false
      if (customDateTo && date > new Date(customDateTo)) return false
      return true
    }

    switch (dateFilter) {
      case 'today':
        return date >= today
      case 'week': {
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        return date >= lastWeek
      }
      case 'month': {
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        return date >= lastMonth
      }
      default:
        return true
    }
  }

  const filteredTests = tests.filter(test => {
    const matchSearch = test.machine?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.test_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.product?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.machine?.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.machine?.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.machine?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.machine?.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(test.viscosity_40c || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(test.viscosity_100c || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(test.water_content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(test.tan_value || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.test_date?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchDate = filterByDate(test.test_date)
    const matchCompany = filterCompany === 'all' || String(test.machine?.customer_id) === filterCompany
    const matchMachine = filterMachine === 'all' || String(test.machine_id) === filterMachine
    
    return matchSearch && matchDate && matchCompany && matchMachine
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Lab <span className="text-orange-600">Tests</span>
        </h2>
        <button
          onClick={onOpenAdd}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Lab Test
        </button>
      </div>
      
      {/* Search Box */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tests by machine name or test type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Company and Machine Filter */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">Filter by Company</label>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
          >
            <option value="all">All Companies</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>{customer.company_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-2">Filter by Machine</label>
          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
          >
            <option value="all">All Machines</option>
            {machines
              .filter(machine => filterCompany === 'all' || machine.customer_id === filterCompany)
              .map(machine => (
              <option key={machine.id} value={machine.id}>{machine.machine_name} - {machine.customer?.company_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-4 bg-white rounded-xl p-4 border-2 border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                dateFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                dateFilter === 'today'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                dateFilter === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                dateFilter === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              This Month
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">From:</label>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => {
                  setCustomDateFrom(e.target.value)
                  setDateFilter('all')
                }}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-600">To:</label>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => {
                  setCustomDateTo(e.target.value)
                  setDateFilter('all')
                }}
                className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
        <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
          <thead className="bg-orange-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Test Date</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Machine</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">PDF</th>
              <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-gray-100">
            {filteredTests.map((test) => (
              <tr key={test.id} className="hover:bg-primary-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatDate(test.test_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {test.machine?.machine_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {test.machine?.customer?.company_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {test.product?.product_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {test.pdf_path ? (
                    <button
                      onClick={() => {
                        const pdfPath = test.pdf_path
                        if (!pdfPath) return
                        const { data } = supabase.storage.from('lab-reports').getPublicUrl(pdfPath)
                        if (data?.publicUrl) {
                          onViewPdf(data.publicUrl)
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View PDF
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                  <button
                    onClick={() => onOpenEdit(test)}
                    className="text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(test.id)}
                    className="text-secondary-600 hover:text-secondary-800 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredTests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No lab tests found. Click "Add Lab Test" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
