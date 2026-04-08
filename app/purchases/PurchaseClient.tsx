'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface Purchase {
  id: string
  purchase_date: string
  quantity: number
  unit_price: number
  total_price: number
  status: 'completed' | 'pending' | 'cancelled'
  product?: {
    product_name: string
    product_type: string
  }
}

interface PurchaseClientProps {
  user: User
  profile: any
}

export default function PurchaseClient({ user, profile }: PurchaseClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all')

  useEffect(() => {
    loadPurchases()
  }, [])

  const loadPurchases = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('oil_purchase_history')
        .select('*, product:oil_products(product_name, product_type)')
        .eq('customer_id', profile.customer_id)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      setPurchases(data || [])
    } catch (error) {
      console.error('Failed to load purchases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredPurchases = purchases.filter(purchase => {
    const matchSearch = purchase.product?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.status?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || purchase.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalSpent = filteredPurchases.reduce((sum, p) => sum + (p.total_price || 0), 0)
  const totalQuantity = filteredPurchases.reduce((sum, p) => sum + (p.quantity || 0), 0)

  return (
    <div className="clean-ui min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 bg-grid-pattern flex flex-col" style={{ backgroundSize: '40px 40px' }}>
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Left: NSG Logo + Brand + Back Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <img 
                src="https://i.imgur.com/8nqsjFz.png" 
                alt="Nabel Sakha Gemilang" 
                className="h-10 w-auto object-contain"
              />
              <div className="border-l-2 border-gray-300 pl-3">
                <h1 className="text-xl font-bold text-gray-800">OilTrack™</h1>
                <p className="text-xs text-gray-500">{profile.customer?.company_name}</p>
              </div>
            </div>
            
            {/* Right: Actions + User Info */}
            <div className="flex items-center gap-3">
              <button
                onClick={loadPurchases}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={handleSignOut}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white p-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Sign Out"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title Card */}
        <div className="mb-8 bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl shadow-xl p-6 border-2 border-gray-100 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-gray-900">
              Purchase <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">History</span>
            </h2>
            <p className="text-gray-600 font-medium mt-2">Complete record of all oil product purchases and transactions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-100 hover:border-primary-300 transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-bold uppercase">Total Purchases</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{filteredPurchases.length}</p>
              </div>
              <div className="bg-primary-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100 hover:border-green-300 transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-bold uppercase">Total Quantity</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{totalQuantity.toLocaleString()} L</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100 hover:border-blue-300 transition-all transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-bold uppercase">Total Spent</p>
                <p className="text-2xl font-black text-gray-900 mt-2">
                  Rp {totalSpent.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by product name or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'pending' | 'cancelled')}
                className="w-full sm:w-48 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-medium"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Purchase Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-gray-100">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
              <p className="text-gray-600 font-medium mt-4">Loading purchases...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <p className="text-lg font-bold">No purchases found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-primary-50 to-secondary-50 border-b-2 border-primary-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-primary-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800 whitespace-nowrap">
                        {new Date(purchase.purchase_date).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {purchase.product?.product_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {purchase.product?.product_type || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 text-right font-medium">
                        {purchase.quantity || 0} L
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 text-right">
                        Rp {purchase.unit_price ? purchase.unit_price.toLocaleString('id-ID') : '0'}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                        Rp {purchase.total_price ? purchase.total_price.toLocaleString('id-ID') : '0'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border-2 ${
                          purchase.status === 'completed' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : purchase.status === 'pending'
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {purchase.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            © 2026 <span className="font-bold">PT Nabel Sakha Gemilang</span> - Oil Condition Monitoring System
          </p>
        </div>
      </footer>
    </div>
  )
}
