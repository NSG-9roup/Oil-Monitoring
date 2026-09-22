'use client'

import { useState } from 'react'
import { createOrderQuotation, createCustomerComplaint } from '@/app/actions/dashboardActions'
import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import { toast } from 'react-hot-toast'
import type { Complaint } from '@/lib/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Product {
  id: string
  product_name: string
  product_type?: string
}

interface Order {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  status: string
  created_at: string
  updated_at: string
  product?: {
    product_name?: string
    product_type?: string
  }
}

interface OrdersSectionProps {
  customerId: string
  products: Product[]
  initialOrders: Order[]
  initialComplaints: Complaint[]
  language: 'id' | 'en'
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
}

const STATUS_LABELS: Record<string, { id: string; en: string }> = {
  pending: { id: 'Menunggu Review Sales', en: 'Pending Sales Review' },
  processing: { id: 'Diteruskan ke Admin Sales (Email Terkirim)', en: 'Forwarded to Admin Sales (Email Sent)' },
  completed: { id: 'Selesai / Penawaran Diterbitkan', en: 'Completed / Quotation Issued' },
  cancelled: { id: 'Dibatalkan', en: 'Cancelled' },
}

const COMPLAINT_STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-emerald-100 text-emerald-700',
}

export default function OrdersSection({
  products,
  initialOrders,
  initialComplaints,
  language,
}: OrdersSectionProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [complaints, setComplaints] = useState(initialComplaints)

  // Process orders data for monthly analytics
  const getMonthlyAnalytics = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    interface AnalyticsItem {
      monthIndex: number
      year: number
      name: string
      total: number
    }
    const last6Months: AnalyticsItem[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      last6Months.push({
        monthIndex: m,
        year: y,
        name: `${months[m]} ${y}`,
        total: 0
      })
    }

    orders.forEach(order => {
      const orderDate = new Date(order.created_at)
      const m = orderDate.getMonth()
      const y = orderDate.getFullYear()

      const match = last6Months.find(item => item.monthIndex === m && item.year === y)
      if (match) {
        match.total += order.quantity
      }
    })

    return last6Months.map(item => ({
      name: item.name,
      'Volume (Unit)': item.total
    }))
  }

  const chartData = getMonthlyAnalytics()

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // Form states
  const [orderForm, setOrderForm] = useState({ productId: '', quantity: 1 })
  const [complaintDesc, setComplaintDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderForm.productId || orderForm.quantity <= 0) return
    setIsSubmitting(true)
    try {
      const res = await createOrderQuotation({
        productId: orderForm.productId,
        quantity: orderForm.quantity,
      })

      if (res.data) {
        setOrders([res.data, ...orders])
      }
      setIsOrderModalOpen(false)
      setOrderForm({ productId: '', quantity: 1 })
      toast.success(language === 'id' ? 'Permintaan penawaran berhasil dibuat!' : 'Quotation request created successfully!')
    } catch (err: unknown) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : 'Failed to create quotation request'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!complaintDesc.trim()) {
      toast.error(language === 'id' ? 'Silakan isi deskripsi keluhan' : 'Please enter complaint description')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await createCustomerComplaint({
        orderId: selectedOrderId,
        description: complaintDesc,
      })

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal membuat komplain')
      }

      setComplaints([res.data, ...complaints])
      setIsComplaintModalOpen(false)
      setComplaintDesc('')
      setSelectedOrderId(null)
      toast.success(language === 'id' ? 'Komplain berhasil dikirim!' : 'Complaint submitted successfully!')
    } catch (err: unknown) {
      console.error('Error submitting complaint:', err)
      const errMsg = err instanceof Error ? err.message : 'Gagal mengirim komplain'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Analytics Chart */}
      {orders.length > 0 && (
        <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10">
          <SectionHeader
            title={language === 'id' ? 'Analisis Kuantitas Penawaran' : 'Quotation Quantity Analytics'}
            description={language === 'id' ? 'Akumulasi kuantitas produk oli yang diminta dalam 6 bulan terakhir' : 'Accumulated quantity of oil products requested over the last 6 months'}
            titleClassName="text-2xl lg:text-3xl"
          />
          <div className="h-64 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fb923c' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="Volume (Unit)" fill="url(#colorVolume)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Orders Section */}
      <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <SectionHeader
            title={language === 'id' ? 'Permintaan Penawaran Produk' : 'Product Quotation Requests'}
            description={language === 'id' ? 'Ajukan permintaan penawaran harga produk oli dan pantau statusnya' : 'Request product price quotations and track their status'}
            titleClassName="text-3xl lg:text-4xl"
          />
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setSelectedOrderId(orders[0]?.id || null)
                setIsComplaintModalOpen(true)
              }}
              className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-5 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95 shrink-0 text-xs sm:text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {language === 'id' ? 'Ajukan Komplain' : 'File Complaint'}
            </button>
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md active:scale-95 shrink-0 text-xs sm:text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              {language === 'id' ? 'Minta Penawaran' : 'Request Quotation'}
            </button>
          </div>
        </div>

        {/* Live Notification Banner when Quotation is Forwarded to Admin Sales */}
        {orders.some(o => o.status === 'processing') && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-sm animate-pop-micro">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-blue-500/20">
              📬
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                {language === 'id' ? 'Permintaan Penawaran Diteruskan ke Tim Admin Sales' : 'Quotation Forwarded to Admin Sales Team'}
              </h4>
              <p className="text-xs text-blue-800 font-medium mt-0.5 leading-relaxed">
                {language === 'id'
                  ? 'Permintaan penawaran Anda telah diteruskan oleh Sales ke Tim Admin Sales. Anda akan segera dihubungi oleh tim kami via Email / WhatsApp resmi untuk pengiriman Penawaran.'
                  : 'Your price quotation request has been forwarded by Sales to the Admin Sales team. Our team will contact you shortly via official Email / WhatsApp for the quotation.'}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">{language === 'id' ? 'Tanggal' : 'Date'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Produk' : 'Product'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Kuantitas' : 'Quantity'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Status' : 'Status'}</th>
                  <th className="px-6 py-4 text-right">{language === 'id' ? 'Aksi' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                      {language === 'id' ? 'Belum ada riwayat permintaan penawaran.' : 'No quotation request history yet.'}
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900 text-sm">
                          {new Date(order.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-800">{order.product?.product_name || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{order.quantity} Pcs</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {STATUS_LABELS[order.status]?.[language] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedOrderId(order.id)
                            setIsComplaintModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200/80 transition-all shadow-sm active:scale-95"
                          title="Laporkan kendala / ajukan keluhan pada pesanan penawaran ini"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {language === 'id' ? 'Komplain' : 'Complain'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Complaints Section */}
      {complaints.length > 0 && (
        <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10">
          <SectionHeader
            title={language === 'id' ? 'Riwayat Komplain' : 'Complaint History'}
            description={language === 'id' ? 'Pantau status komplain pesanan Anda' : 'Track your order complaints status'}
            titleClassName="text-2xl lg:text-3xl"
          />
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">{language === 'id' ? 'Tanggal' : 'Date'}</th>
                    <th className="px-6 py-4">{language === 'id' ? 'Produk Terkait' : 'Related Product'}</th>
                    <th className="px-6 py-4">{language === 'id' ? 'Deskripsi' : 'Description'}</th>
                    <th className="px-6 py-4">{language === 'id' ? 'Status' : 'Status'}</th>
                    <th className="px-6 py-4">{language === 'id' ? 'Tanggapan' : 'Resolution'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {complaints.map((comp) => (
                    <tr key={comp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-gray-900 text-sm">
                          {new Date(comp.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-800">{comp.order?.product?.product_name || '-'}</span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-gray-600 line-clamp-2" title={comp.description}>{comp.description}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${COMPLAINT_STATUS_STYLES[comp.status] || 'bg-gray-100 text-gray-600'}`}>
                          {comp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-gray-600 line-clamp-2" title={comp.resolution_notes || '-'}>{comp.resolution_notes || '-'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-fast" onClick={() => setIsOrderModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-pop-micro" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-8 py-6 border-b border-slate-100 flex items-center justify-between text-slate-900 select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{language === 'id' ? 'Minta Penawaran Produk' : 'Request Product Quotation'}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{language === 'id' ? 'Dapatkan penawaran harga resmi pelumas industri' : 'Get official pricing for industrial lubricants'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOrderModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
              >
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-8 space-y-6">
              <div className="space-y-4 rounded-[1.5rem] border border-slate-150 bg-slate-50/50 p-6 shadow-sm">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{language === 'id' ? 'Pilih Produk Pelumas' : 'Select Lubricant Product'}</label>
                  <select
                    required
                    value={orderForm.productId}
                    onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 block p-3.5 transition-colors shadow-sm outline-none"
                  >
                    <option value="">{language === 'id' ? '-- Pilih Produk Dari Katalog --' : '-- Select Product From Catalog --'}</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{language === 'id' ? 'Kuantitas (Pcs / Drum)' : 'Quantity (Pcs / Drums)'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-orange-100 focus:border-orange-500 block p-3.5 transition-colors shadow-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsOrderModalOpen(false)} 
                  className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>{language === 'id' ? 'Memproses...' : 'Processing...'}</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      <span>{language === 'id' ? 'Kirim Permintaan' : 'Submit Request'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {isComplaintModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-fast" onClick={() => setIsComplaintModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-pop-micro" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-8 py-6 border-b border-slate-100 flex items-center justify-between text-slate-900 select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{language === 'id' ? 'Buat Tiket Bantuan & Komplain' : 'Submit Support & Complaint'}</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{language === 'id' ? 'Sampaikan kendala terkait penawaran atau pesanan Anda' : 'Submit issues regarding your quotation or order'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsComplaintModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
              >
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="p-8 space-y-6">
              <div className="space-y-4 rounded-[1.5rem] border border-slate-150 bg-slate-50/50 p-6 shadow-sm">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    {language === 'id' ? 'Pilih Pesanan / Penawaran' : 'Select Order / Quotation'}
                  </label>
                  <select
                    value={selectedOrderId || ''}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-rose-100 focus:border-rose-500 block p-3.5 transition-colors shadow-sm outline-none"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {new Date(o.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')} — {o.product?.product_name || 'Produk'} ({o.quantity} Pcs)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{language === 'id' ? 'Deskripsi Kendala / Komplain' : 'Issue Description'}</label>
                  <textarea
                    required
                    rows={4}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder={language === 'id' ? 'Jelaskan kendala, keterlambatan, atau masalah pada penawaran/pesanan Anda...' : 'Describe the issue or delay with your quotation/order...'}
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:ring-2 focus:ring-rose-100 focus:border-rose-500 block p-3.5 transition-colors shadow-sm outline-none resize-none"
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsComplaintModalOpen(false)} 
                  className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>{language === 'id' ? 'Memproses...' : 'Processing...'}</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      <span>{language === 'id' ? 'Kirim Komplain' : 'Submit Complaint'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
