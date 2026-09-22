'use client'

import { useState } from 'react'
import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import { createCustomerComplaint } from '@/app/actions/dashboardActions'
import { toast } from 'react-hot-toast'
import type { Complaint } from '@/lib/types'
import { SearchableSelect } from '@/app/components/SearchableSelect'

interface MachineItem {
  id: string
  machine_name: string
}

interface OrderItem {
  id: string
  quantity: number
  created_at: string
  product?: {
    product_name?: string
  }
}

interface ComplaintsSectionProps {
  complaints: Complaint[]
  machines: MachineItem[]
  orders: OrderItem[]
  language: 'id' | 'en'
  isModalOpen: boolean
  setIsModalOpen: (open: boolean) => void
  onComplaintAdded: (newComplaint: Complaint) => void
}

const CATEGORY_LABELS: Record<string, { id: string; en: string; badge: string }> = {
  lab_test: { id: 'Uji Lab & Sampel', en: 'Lab Test & Sample', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  order: { id: 'Pesanan Oli', en: 'Oil Order', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  machine: { id: 'Kondisi Mesin', en: 'Machine Condition', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  service: { id: 'Layanan & Teknis', en: 'Service & Technical', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  general: { id: 'Umum / Lainnya', en: 'General / Other', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const STATUS_CONFIG: Record<string, { id: string; en: string; style: string }> = {
  open: { id: 'Menunggu Review', en: 'Pending Review', style: 'bg-rose-100 text-rose-700 border-rose-200' },
  in_progress: { id: 'Sedang Ditindaklanjuti', en: 'In Progress', style: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { id: 'Selesai / Teratasi', en: 'Resolved', style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

export default function ComplaintsSection({
  complaints,
  machines,
  orders,
  language,
  isModalOpen,
  setIsModalOpen,
  onComplaintAdded,
}: ComplaintsSectionProps) {
  const [category, setCategory] = useState<'lab_test' | 'order' | 'machine' | 'service' | 'general'>('lab_test')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMachineId, setSelectedMachineId] = useState<string>('')
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const openCount = complaints.filter(c => c.status === 'open').length
  const progressCount = complaints.filter(c => c.status === 'in_progress').length
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus === 'all') return true
    return c.status === filterStatus
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      toast.error(language === 'id' ? 'Silakan isi deskripsi kendala / komplain' : 'Please describe your complaint')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await createCustomerComplaint({
        category,
        title: title.trim() || (language === 'id' ? 'Laporan Kendala' : 'Issue Report'),
        description: description.trim(),
        machineId: selectedMachineId || null,
        orderId: selectedOrderId || null,
      })

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Gagal mengirim komplain')
      }

      onComplaintAdded(res.data as unknown as Complaint)
      setIsModalOpen(false)
      setTitle('')
      setDescription('')
      setSelectedMachineId('')
      setSelectedOrderId('')
      toast.success(language === 'id' ? 'Laporan komplain berhasil dikirim ke tim kami!' : 'Complaint submitted successfully!')
    } catch (err: unknown) {
      console.error('Error submitting complaint:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim komplain')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-pop-micro">
      {/* Header with KPI Cards */}
      <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <SectionHeader
            title={language === 'id' ? 'Pusat Komplain & Bantuan' : 'Helpdesk & Complaint Center'}
            description={language === 'id' 
              ? 'Pantau penanganan kendala atau laporkan masalah hasil lab, mesin, dan pengiriman' 
              : 'Track resolution progress or submit complaints regarding lab tests, machines, and orders'}
            titleClassName="text-3xl lg:text-4xl"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-500/10 active:scale-95 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            {language === 'id' ? 'Ajukan Komplain Baru' : 'File New Complaint'}
          </button>
        </div>

        {/* KPI Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">{language === 'id' ? 'Menunggu Respon' : 'Pending'}</p>
              <p className="text-2xl font-black text-rose-900 mt-1">{openCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600">{language === 'id' ? 'Sedang Ditindaklanjuti' : 'In Progress'}</p>
              <p className="text-2xl font-black text-amber-900 mt-1">{progressCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">{language === 'id' ? 'Terselesaikan' : 'Resolved'}</p>
              <p className="text-2xl font-black text-emerald-900 mt-1">{resolvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'open', 'in_progress', 'resolved'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              filterStatus === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st === 'all' ? (language === 'id' ? 'Semua Komplain' : 'All Complaints') : (STATUS_CONFIG[st]?.[language] || st)}
          </button>
        ))}
      </div>

      {/* Complaints List */}
      <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        {filteredComplaints.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {language === 'id' ? 'Tidak ada riwayat komplain' : 'No complaints recorded'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'id' 
                ? 'Semua operasional oli dan layanan terpantau berjalan lancar. Klik tombol di atas jika ada kendala.' 
                : 'All lubricant operations are currently in good standing. Click above if you need assistance.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">{language === 'id' ? 'Tanggal' : 'Date'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Kategori & Judul' : 'Category & Title'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Detail Keluhan' : 'Complaint Details'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Status' : 'Status'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Tanggapan Tim Teknis' : 'Staff Resolution'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredComplaints.map((comp) => {
                  const catConfig = CATEGORY_LABELS[comp.category || 'general'] || CATEGORY_LABELS.general
                  const statusConf = STATUS_CONFIG[comp.status] || STATUS_CONFIG.open

                  return (
                    <tr key={comp.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-semibold align-top">
                        {new Date(comp.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${catConfig.badge}`}>
                            {catConfig[language]}
                          </span>
                          <p className="text-sm font-bold text-gray-900">{comp.title || 'Laporan Kendala'}</p>
                          {comp.machine?.machine_name && (
                            <p className="text-[11px] text-slate-500 font-medium">Mesin: {comp.machine.machine_name}</p>
                          )}
                          {comp.order?.product?.product_name && (
                            <p className="text-[11px] text-slate-500 font-medium">Order: {comp.order.product.product_name}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-sm align-top">
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{comp.description}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusConf.style}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                          {statusConf[language]}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-sm align-top">
                        {comp.resolution_notes ? (
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-emerald-900">{comp.resolution_notes}</p>
                            {comp.resolved_at && (
                              <p className="text-[9px] text-emerald-600 mt-1 font-bold">
                                {new Date(comp.resolved_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {language === 'id' ? 'Menunggu pemeriksaan tim support...' : 'Awaiting team review...'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Universal Complaint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-fast">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-pop-micro border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {language === 'id' ? 'Ajukan Kendala / Komplain' : 'Submit Issue / Complaint'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {language === 'id' ? 'Respons Cepat Tim Teknis & Sales' : 'Fast Technical Support Response'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  {language === 'id' ? 'Kategori Kendala' : 'Complaint Category'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'lab_test', label: language === 'id' ? '🔬 Uji Lab & Sampel' : '🔬 Lab Test & Sample' },
                    { id: 'machine', label: language === 'id' ? '⚙️ Operasional Mesin' : '⚙️ Machine Operation' },
                    { id: 'order', label: language === 'id' ? '📦 Pesanan / Penawaran' : '📦 Order & Quotation' },
                    { id: 'service', label: language === 'id' ? '💬 Layanan Umum' : '💬 General Service' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id as 'lab_test' | 'order' | 'machine' | 'service' | 'general')}
                      className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                        category === c.id
                          ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Machine Selection (If category is lab_test or machine) */}
              {(category === 'lab_test' || category === 'machine') && machines.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    {language === 'id' ? 'Pilih Mesin Terkait (Opsional)' : 'Select Related Machine (Optional)'}
                  </label>
                  <SearchableSelect
                    options={[
                      { value: '', label: language === 'id' ? '-- Semua / Tidak Terikat Mesin Tertentu --' : '-- All / General --' },
                      ...machines.map((m) => ({ value: m.id, label: m.machine_name }))
                    ]}
                    value={selectedMachineId}
                    onChange={(val) => setSelectedMachineId(val)}
                    placeholder={language === 'id' ? 'Cari / pilih mesin...' : 'Search / select machine...'}
                  />
                </div>
              )}

              {/* Order Selection (If category is order) */}
              {category === 'order' && orders.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    {language === 'id' ? 'Pilih Pesanan Terkait (Opsional)' : 'Select Related Order (Optional)'}
                  </label>
                  <SearchableSelect
                    options={[
                      { value: '', label: language === 'id' ? '-- Semua / Tidak Terikat Pesanan Tertentu --' : '-- All / General --' },
                      ...orders.map((o) => ({
                        value: o.id,
                        label: `${new Date(o.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')} — ${o.product?.product_name || 'Produk'}`,
                        sublabel: `${o.quantity} Pcs`
                      }))
                    ]}
                    value={selectedOrderId}
                    onChange={(val) => setSelectedOrderId(val)}
                    placeholder={language === 'id' ? 'Cari / pilih pesanan...' : 'Search / select order...'}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  {language === 'id' ? 'Judul Singkat Keluhan' : 'Complaint Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'id' ? 'Contoh: Laporan Uji Lab Belum Terbit, Oli Berbusa, dll.' : 'e.g. Lab report delayed, oil foaming...'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-3 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  {language === 'id' ? 'Deskripsi Lengkap Masalah' : 'Full Problem Description'}
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={language === 'id' ? 'Jelaskan kronologi kendala atau pertanyaan yang membutuhkan tindak lanjut tim teknis...' : 'Explain the issue or assistance needed in detail...'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium rounded-xl focus:ring-rose-500 focus:border-rose-500 block p-3 outline-none resize-none"
                ></textarea>
              </div>

              <div className="mt-6 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (language === 'id' ? 'Mengirim...' : 'Sending...') : (language === 'id' ? 'Kirim Komplain' : 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
