'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminOrder {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  status: string
  created_at: string
  updated_at: string
  updated_by?: string | null
  customer?: { company_name?: string }
  product?: { product_name?: string; product_type?: string }
}

export interface AdminComplaint {
  id: string
  order_id: string
  customer_id: string
  description: string
  status: string
  resolution_notes?: string | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
  customer?: { company_name?: string }
  order?: { product?: { product_name?: string } }
}

interface AdminOrdersTabProps {
  initialOrders: AdminOrder[]
  initialComplaints: AdminComplaint[]
}

const ORDER_STATUS_FLOW: Record<string, string | null> = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'completed',
  completed: null,
  cancelled: null,
}

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const COMPLAINT_STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700 border-red-200',
  in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  open: 'Terbuka',
  in_progress: 'Diproses',
  resolved: 'Selesai',
}

export default function AdminOrdersTab({ initialOrders, initialComplaints }: AdminOrdersTabProps) {
  const supabase = createClient()

  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders)
  const [complaints, setComplaints] = useState<AdminComplaint[]>(initialComplaints)
  const [activeSection, setActiveSection] = useState<'orders' | 'complaints'>('orders')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // --- Orders ---
  const filteredOrders = orders.filter(o => {
    const matchSearch =
      searchQuery === '' ||
      o.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.product?.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredComplaints = complaints.filter(c => {
    const matchSearch =
      searchQuery === '' ||
      c.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleAdvanceOrderStatus = async (order: AdminOrder) => {
    const nextStatus = ORDER_STATUS_FLOW[order.status]
    if (!nextStatus) return
    if (!confirm(`Ubah status pesanan menjadi "${ORDER_STATUS_LABELS[nextStatus]}"?`)) return

    setLoadingId(order.id)
    try {
      const { error } = await supabase
        .from('oil_orders')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', order.id)
      if (error) throw error
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o))
    } catch {
      alert('Gagal mengupdate status pesanan.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Batalkan pesanan ini?')) return
    setLoadingId(orderId)
    try {
      const { error } = await supabase
        .from('oil_orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)
      if (error) throw error
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o))
    } catch {
      alert('Gagal membatalkan pesanan.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleResolveComplaint = async (complaintId: string) => {
    const notes = prompt('Masukkan catatan penyelesaian keluhan (opsional):')
    if (notes === null) return
    setLoadingId(complaintId)
    try {
      const { error } = await supabase
        .from('oil_complaints')
        .update({
          status: 'resolved',
          resolution_notes: notes || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', complaintId)
      if (error) throw error
      setComplaints(prev =>
        prev.map(c =>
          c.id === complaintId ? { ...c, status: 'resolved', resolution_notes: notes || null } : c
        )
      )
    } catch {
      alert('Gagal menyelesaikan keluhan.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleMarkInProgress = async (complaintId: string) => {
    setLoadingId(complaintId)
    try {
      const { error } = await supabase
        .from('oil_complaints')
        .update({ status: 'in_progress' })
        .eq('id', complaintId)
      if (error) throw error
      setComplaints(prev =>
        prev.map(c => c.id === complaintId ? { ...c, status: 'in_progress' } : c)
      )
    } catch {
      alert('Gagal mengupdate keluhan.')
    } finally {
      setLoadingId(null)
    }
  }

  // Summary counts
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const openComplaints = complaints.filter(c => c.status === 'open').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Pesanan', value: orders.length, color: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Menunggu', value: pendingOrders, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Total Keluhan', value: complaints.length, color: 'text-slate-900', bg: 'bg-slate-50 border-slate-200' },
          { label: 'Keluhan Terbuka', value: openComplaints, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
            <p className={`text-2xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Section Toggle + Search/Filter Bar */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => { setActiveSection('orders'); setStatusFilter('all'); setSearchQuery('') }}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeSection === 'orders' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Pesanan
              {pendingOrders > 0 && (
                <span className="ml-2 bg-yellow-400 text-yellow-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingOrders}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveSection('complaints'); setStatusFilter('all'); setSearchQuery('') }}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeSection === 'complaints' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Keluhan
              {openComplaints > 0 && (
                <span className="ml-2 bg-red-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {openComplaints}
                </span>
              )}
            </button>
          </div>

          {/* Search + Filter */}
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari perusahaan / produk..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 sm:w-60 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="all">Semua Status</option>
              {activeSection === 'orders' ? (
                <>
                  <option value="pending">Menunggu</option>
                  <option value="processing">Diproses</option>
                  <option value="shipped">Dikirim</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </>
              ) : (
                <>
                  <option value="open">Terbuka</option>
                  <option value="in_progress">Diproses</option>
                  <option value="resolved">Selesai</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* ─── ORDERS TABLE ─── */}
        {activeSection === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Perusahaan</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4">Qty</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 italic text-sm">
                      Tidak ada pesanan ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => {
                    const nextStatus = ORDER_STATUS_FLOW[order.status]
                    const isLoading = loadingId === order.id
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700">
                            {new Date(order.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-slate-900">{order.customer?.company_name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold text-slate-800">{order.product?.product_name || '-'}</p>
                            {order.product?.product_type && (
                              <p className="text-[10px] text-slate-400 font-medium">{order.product.product_type}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-700">{order.quantity} Pcs</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${ORDER_STATUS_STYLES[order.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {ORDER_STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {nextStatus && (
                              <button
                                onClick={() => handleAdvanceOrderStatus(order)}
                                disabled={isLoading}
                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {isLoading ? '...' : `→ ${ORDER_STATUS_LABELS[nextStatus]}`}
                              </button>
                            )}
                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={isLoading}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
                              >
                                Batal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── COMPLAINTS TABLE ─── */}
        {activeSection === 'complaints' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Perusahaan</th>
                  <th className="px-6 py-4">Produk Terkait</th>
                  <th className="px-6 py-4">Deskripsi</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Catatan Resolusi</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-400 italic text-sm">
                      Tidak ada keluhan ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map(comp => {
                    const isLoading = loadingId === comp.id
                    return (
                      <tr key={comp.id} className={`hover:bg-slate-50/50 transition-colors ${comp.status === 'open' ? 'bg-red-50/30' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700">
                            {new Date(comp.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-slate-900">{comp.customer?.company_name || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700">{comp.order?.product?.product_name || '-'}</span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-xs text-slate-600 line-clamp-2" title={comp.description}>{comp.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${COMPLAINT_STATUS_STYLES[comp.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {COMPLAINT_STATUS_LABELS[comp.status] || comp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-xs text-slate-500 line-clamp-2">{comp.resolution_notes || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {comp.status === 'open' && (
                              <button
                                onClick={() => handleMarkInProgress(comp.id)}
                                disabled={isLoading}
                                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {isLoading ? '...' : 'Proses'}
                              </button>
                            )}
                            {comp.status !== 'resolved' && (
                              <button
                                onClick={() => handleResolveComplaint(comp.id)}
                                disabled={isLoading}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                {isLoading ? '...' : '✓ Selesai'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
