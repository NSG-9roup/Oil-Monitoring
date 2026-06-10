'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import { toast } from 'react-hot-toast'

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
  product?: { product_name?: string; product_type?: string }
}

interface Complaint {
  id: string
  order_id: string
  customer_id: string
  description: string
  status: string
  resolution_notes?: string | null
  created_at: string
  updated_at: string
  resolved_at?: string | null
  order?: { id: string; product?: { product_name?: string } }
}

interface OrdersSectionProps {
  customerId: string
  products: Product[]
  initialOrders: Order[]
  initialComplaints: Complaint[]
  language: 'id' | 'en'
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  shipped: 'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const STATUS_LABELS: Record<string, Record<'id' | 'en', string>> = {
  pending: { id: 'Menunggu ACC', en: 'Pending Approval' },
  processing: { id: 'Diproses (Dikirim)', en: 'Processing (Emailed)' },
  shipped: { id: 'Dikirim', en: 'Shipped' },
  completed: { id: 'Selesai', en: 'Completed' },
  cancelled: { id: 'Dibatalkan', en: 'Cancelled' },
}

const COMPLAINT_STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-orange-100 text-orange-700',
  resolved: 'bg-emerald-100 text-emerald-700',
}

export default function OrdersSection({
  customerId,
  products,
  initialOrders,
  initialComplaints,
  language,
}: OrdersSectionProps) {
  const supabase = createClient()
  const [orders, setOrders] = useState(initialOrders)
  const [complaints, setComplaints] = useState(initialComplaints)

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
      const { data, error } = await supabase
        .from('oil_orders')
        .insert({
          customer_id: customerId,
          product_id: orderForm.productId,
          quantity: orderForm.quantity,
          status: 'pending',
        })
        .select(`*, product:oil_products(product_name, product_type)`)
        .single()

      if (error) throw error

      setOrders([data, ...orders])
      setIsOrderModalOpen(false)
      setOrderForm({ productId: '', quantity: 1 })
      toast.success(language === 'id' ? 'Permintaan penawaran berhasil dibuat!' : 'Quotation request created successfully!')
    } catch (err) {
      console.error(err)
      toast.error(language === 'id' ? 'Gagal membuat permintaan penawaran' : 'Failed to create quotation request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrderId || !complaintDesc.trim()) return
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from('oil_complaints')
        .insert({
          order_id: selectedOrderId,
          customer_id: customerId,
          description: complaintDesc,
          status: 'open',
        })
        .select(`*, order:oil_orders(id, product:oil_products(product_name))`)
        .single()

      if (error) throw error

      setComplaints([data, ...complaints])
      setIsComplaintModalOpen(false)
      setComplaintDesc('')
      setSelectedOrderId(null)
      toast.success(language === 'id' ? 'Komplain berhasil dikirim!' : 'Complaint submitted successfully!')
    } catch (err) {
      console.error(err)
      toast.error(language === 'id' ? 'Gagal mengirim komplain' : 'Failed to submit complaint')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Orders Section */}
      <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <SectionHeader
            title={language === 'id' ? 'Permintaan Penawaran Produk' : 'Product Quotation Requests'}
            description={language === 'id' ? 'Ajukan permintaan penawaran harga produk oli dan pantau statusnya' : 'Request product price quotations and track their status'}
            titleClassName="text-3xl lg:text-4xl"
          />
          <button
            onClick={() => setIsOrderModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md active:scale-95 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            {language === 'id' ? 'Minta Penawaran' : 'Request Quotation'}
          </button>
        </div>

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
                      {language === 'id' ? 'Belum ada riwayat pesanan.' : 'No order history yet.'}
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
                        {(order.status === 'completed' || order.status === 'shipped') && (
                          <button
                            onClick={() => {
                              setSelectedOrderId(order.id)
                              setIsComplaintModalOpen(true)
                            }}
                            className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                          >
                            {language === 'id' ? 'Komplain' : 'Complain'}
                          </button>
                        )}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{language === 'id' ? 'Buat Komplain' : 'File Complaint'}</h3>
              <button onClick={() => setIsComplaintModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleCreateComplaint} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">{language === 'id' ? 'Deskripsi Komplain' : 'Complaint Description'}</label>
                  <textarea
                    required
                    rows={4}
                    value={complaintDesc}
                    onChange={(e) => setComplaintDesc(e.target.value)}
                    placeholder={language === 'id' ? 'Jelaskan masalah pada pesanan Anda...' : 'Describe the issue with your order...'}
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
