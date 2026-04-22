import React, { useState } from 'react'
import type { AdminPurchase } from '@/lib/types'

interface AdminPurchasesTabProps {
  purchases: AdminPurchase[]
  onOpenAdd: () => void
  onOpenEdit: (purchase: AdminPurchase) => void
  onDelete: (id: string) => void
  formatDate: (value?: string | number | Date) => string
}

export function AdminPurchasesTab({
  purchases,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  formatDate
}: AdminPurchasesTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
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

  const filteredPurchases = purchases.filter(purchase => {
    const matchSearch = purchase.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.product?.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchDate = filterByDate(purchase.purchase_date)
    return matchSearch && matchDate
  })

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Purchase <span className="text-red-600">History</span>
        </h2>
        <button
          onClick={onOpenAdd}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Purchase
        </button>
      </div>
      
      {/* Search Box */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search purchases by customer or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
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
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Total</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-gray-100">
            {filteredPurchases.map((purchase) => (
              <tr key={purchase.id} className="hover:bg-primary-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {formatDate(purchase.purchase_date)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {purchase.customer?.company_name || 'N/A'}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                  {purchase.product?.product_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  {purchase.quantity || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                  Rp {purchase.unit_price?.toLocaleString('id-ID') || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  Rp {(purchase.total_price ?? ((purchase.quantity || 0) * (purchase.unit_price || 0)))?.toLocaleString('id-ID') || '0'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    purchase.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : purchase.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {purchase.status || 'unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                  <button
                    onClick={() => onOpenEdit(purchase)}
                    className="text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(purchase.id)}
                    className="text-secondary-600 hover:text-secondary-800 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredPurchases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No purchase history found. Click &quot;Add Purchase&quot; to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
