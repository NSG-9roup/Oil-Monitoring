'use client'

import { useState } from 'react'
import { createOrderQuotation, createCustomerComplaint } from '@/app/actions/dashboardActions'
import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import { toast } from 'react-hot-toast'
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

interface Complaint {
  id: string
  order_id: string
  customer_id: string
  description: string
  status: string
  resolution_notes?: string | null
  created_at: string
  order?: {
    product?: {
      product_name?: string
    }
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
    if (!selectedOrderId || !complaintDesc.trim()) {
      toast.error(language === 'id' ? 'Silakan pilih pesanan dan isi deskripsi keluhan' : 'Please select an order and enter complaint description')
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
              disabled={orders.length === 0}
              className="flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-5 py-3 rounded-2xl font-bold transition-all shadow-sm active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-fast">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-pop-micro">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{language === 'id' ? 'Minta Penawaran Produk' : 'Request Product Quotation'}</h3>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">{language === 'id' ? 'Pilih Produk' : 'Select Product'}</label>
                  <select
                    required
                    value={orderForm.productId}
                    onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-3 transition-colors"
                  >
                    <option value="">{language === 'id' ? '-- Pilih Produk --' : '-- Select Product --'}</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">{language === 'id' ? 'Kuantitas (Pcs)' : 'Quantity (Pcs)'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block p-3 transition-colors"
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-xl transition-colors">
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                  {isSubmitting ? (language === 'id' ? 'Memproses...' : 'Processing...') : (language === 'id' ? 'Kirim Permintaan' : 'Submit Request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {isComplaintModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-fast">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-pop-micro">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{language === 'id' ? 'Buat Komplain' : 'File Complaint'}</h3>
              <button onClick={() => setIsComplaintModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateComplaint} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
                    {language === 'id' ? 'Pilih Pesanan / Penawaran' : 'Select Order / Quotation'}
                  </label>
                  <select
                    value={selectedOrderId || ''}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-red-500 focus:border-red-500 block p-3 transition-colors font-medium"
                  >
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {new Date(o.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')} — {o.product?.product_name || 'Produk'} ({o.quantity} Pcs)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">{language === 'id' ? 'Deskripsi Komplain' : 'Complaint Description'}</label>
                  <textarea
                    required
                    rows={4}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder={language === 'id' ? 'Jelaskan kendala, keterlambatan, atau masalah pada penawaran/pesanan Anda...' : 'Describe the issue or delay with your quotation/order...'}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-red-500 focus:border-red-500 block p-3 transition-colors resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsComplaintModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-xl transition-colors">
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Memproses...' : 'Kirim Komplain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
