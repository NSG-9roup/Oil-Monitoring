'use client'

import React from 'react'
import type { AdminLabTest, Customer, AdminMachine } from '@/lib/types'

interface AdminTestsTabProps {
  recentTests: AdminLabTest[]
  customers: Customer[]
  machines: AdminMachine[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterCompany: string
  setFilterCompany: (companyId: string) => void
  filterMachine: string
  setFilterMachine: (machineId: string) => void
  dateFilter: string
  setDateFilter: (filter: string) => void
  customDateFrom: string
  setCustomDateFrom: (date: string) => void
  customDateTo: string
  setCustomDateTo: (date: string) => void
  filterByDate: (testDate: string | null | undefined) => boolean
  onOpenAdd: () => void
  onOpenEdit: (test: AdminLabTest) => void
  onDelete: (id: string) => void
  onOpenPdf: (pdfPath: string) => void
  formatDate: (value?: string | number | Date) => string
}

export default function AdminTestsTab({
  recentTests,
  customers,
  machines,
  searchQuery,
  setSearchQuery,
  filterCompany,
  setFilterCompany,
  filterMachine,
  setFilterMachine,
  dateFilter,
  setDateFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  filterByDate,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onOpenPdf,
  formatDate
}: AdminTestsTabProps) {

  const [sendingId, setSendingId] = React.useState<string | null>(null)

  const handleSendEmail = async (testId: string) => {
    setSendingId(testId)
    try {
      const { sendLabTestResultEmailAction } = await import('@/app/actions/emailActions')
      const result = await sendLabTestResultEmailAction(testId)
      if (result.success) {
        alert('Hasil lab berhasil dikirim ke email customer!')
      } else {
        alert('Gagal mengirim email: ' + result.error)
      }
    } catch (err) {
      console.error(err)
      alert('Gagal memicu pengiriman email.')
    } finally {
      setSendingId(null)
    }
  }

  const filteredTests = recentTests.filter(test => {
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
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <svg className="w-8 h-8 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Lab Tests
          </h2>
          <p className="text-slate-400 font-medium text-xs mt-1">Upload chemical lab report PDFs, input oil viscosity metrics, and manage analysis logs.</p>
        </div>

        <button
          onClick={onOpenAdd}
          className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-orange-500/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Lab Test
        </button>
      </div>

      {/* Filters Board */}
      <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search lab tests by machine, model, serial number, product, or viscosity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 pl-10 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* Company & Machine Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Filter by Company</label>
            <select
              value={filterCompany}
              onChange={(e) => {
                setFilterCompany(e.target.value)
                setFilterMachine('all') // Reset machine selection on company change
              }}
              className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">All Companies</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Filter by Machine</label>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">All Machines</option>
              {machines
                .filter(m => filterCompany === 'all' || m.customer_id === filterCompany)
                .map(m => (
                  <option key={m.id} value={m.id}>{m.machine_name} - {m.customer?.company_name}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Date Filters */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between select-none">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' }
            ].map(d => (
              <button
                key={d.key}
                onClick={() => setDateFilter(d.key)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                  dateFilter === d.key
                    ? 'bg-slate-900 border-slate-950 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">From:</span>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => {
                  setCustomDateFrom(e.target.value)
                  setDateFilter('all')
                }}
                className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">To:</span>
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => {
                  setCustomDateTo(e.target.value)
                  setDateFilter('all')
                }}
                className="bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spacious Premium Table Layout */}
      <div className="w-full overflow-auto rounded-[2rem] border border-slate-100 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] bg-white max-h-[65vh]">
        <table className="w-full min-w-[980px] divide-y divide-slate-100">
          <thead className="bg-slate-50/70 backdrop-blur-sm sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Date</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Machine Name</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Company</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Lubricant Product</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Report PDF</th>
              <th className="px-6 py-4.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100">
            {filteredTests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic text-sm">
                  No lab test results found matching filters.
                </td>
              </tr>
            ) : (
              filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-indigo-50/15 transition-colors duration-200">
                  {/* Test Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-slate-800">
                    {formatDate(test.test_date)}
                  </td>

                  {/* Machine Name */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700">
                    {test.machine?.machine_name || 'N/A'}
                  </td>

                  {/* Customer Company */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                    {test.machine?.customer?.company_name || 'N/A'}
                  </td>

                  {/* Product */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                    {test.product?.product_name || 'N/A'}
                  </td>

                  {/* PDF Link */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {test.pdf_path ? (
                      <button
                        onClick={() => onOpenPdf(test.pdf_path!)}
                        className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 rounded-xl transition-all duration-300 font-black text-[10px] uppercase tracking-wider border border-blue-150 hover:border-transparent active:scale-95"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View PDF
                      </button>
                    ) : (
                      <span className="text-xs text-slate-350 font-bold">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-1.5">
                    <button
                      onClick={() => handleSendEmail(test.id)}
                      disabled={sendingId === test.id}
                      className={`inline-flex items-center px-3 py-1.5 rounded-xl transition-all duration-300 border font-bold text-[10px] uppercase tracking-wider ${
                        sendingId === test.id
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border-emerald-100 hover:border-transparent active:scale-95'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {sendingId === test.id ? 'Kirim...' : 'Kirim Hasil'}
                    </button>

                    <button
                      onClick={() => onOpenEdit(test)}
                      className="inline-flex items-center px-3 py-1.5 text-slate-700 hover:text-white bg-slate-100 hover:bg-orange-500 rounded-xl transition-all duration-300"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    
                    <button
                      onClick={() => onDelete(test.id)}
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
