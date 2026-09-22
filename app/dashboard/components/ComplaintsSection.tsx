'use client'

import { useState } from 'react'
import { SectionHeader } from '@/app/dashboard/components/SectionHeader'
import { createCustomerComplaint } from '@/app/actions/dashboardActions'
import { toast } from 'react-hot-toast'
import type { Complaint } from '@/lib/types'
import { SearchableSelect } from '@/app/components/SearchableSelect'
import { Portal } from '@/app/components/Portal'

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
  lab_test: { id: '🔬 Uji Lab & Sampel', en: '🔬 Lab Test & Sample', badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  order: { id: '📦 Pesanan Oli', en: '📦 Oil Order', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  machine: { id: '⚙️ Kondisi Mesin', en: '⚙️ Machine Condition', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  service: { id: '💬 Layanan & Teknis', en: '💬 Service & Technical', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  general: { id: '📋 Umum / Lainnya', en: '📋 General / Other', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const STATUS_CONFIG: Record<string, { id: string; en: string; style: string }> = {
  open: { id: 'Menunggu Review', en: 'Pending Review', style: 'bg-rose-100 text-rose-700 border-rose-200' },
  in_progress: { id: 'Sedang Ditindaklanjuti', en: 'In Progress', style: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved: { id: 'Selesai / Teratasi', en: 'Resolved', style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

export const getTicketCode = (id: string) => {
  if (!id) return '#TKT-00000000'
  const clean = id.replace(/[^a-zA-Z0-9]/g, '')
  return `#TKT-${clean.slice(0, 8).toUpperCase()}`
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
  
  // Filtering & Search
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)

  const openCount = complaints.filter(c => c.status === 'open').length
  const progressCount = complaints.filter(c => c.status === 'in_progress').length
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (!searchQuery.trim()) return true

    const q = searchQuery.toLowerCase().trim()
    const ticketCode = getTicketCode(c.id).toLowerCase()
    const t = (c.title || '').toLowerCase()
    const d = (c.description || '').toLowerCase()
    const m = (c.machine?.machine_name || '').toLowerCase()
    const p = (c.order?.product?.product_name || '').toLowerCase()

    return ticketCode.includes(q) || t.includes(q) || d.includes(q) || m.includes(q) || p.includes(q)
  })

  const handleCopyTicket = (ticketCode: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ticketCode)
    setCopiedTicketId(id)
    toast.success(language === 'id' ? `ID Tiket ${ticketCode} disalin!` : `Ticket ID ${ticketCode} copied!`)
    setTimeout(() => setCopiedTicketId(null), 2000)
  }

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
    <div className="space-y-6 animate-pop-micro">
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
          <div 
            onClick={() => setFilterStatus('open')}
            className={`p-5 rounded-2xl bg-rose-50/50 border transition-all cursor-pointer ${filterStatus === 'open' ? 'border-rose-400 ring-2 ring-rose-200 shadow-sm' : 'border-rose-100 hover:border-rose-200'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">{language === 'id' ? 'Menunggu Review' : 'Pending Review'}</p>
                <p className="text-2xl font-black text-rose-900 mt-1">{openCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setFilterStatus('in_progress')}
            className={`p-5 rounded-2xl bg-amber-50/50 border transition-all cursor-pointer ${filterStatus === 'in_progress' ? 'border-amber-400 ring-2 ring-amber-200 shadow-sm' : 'border-amber-100 hover:border-amber-200'}`}
          >
            <div className="flex items-center justify-between">
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
          </div>

          <div 
            onClick={() => setFilterStatus('resolved')}
            className={`p-5 rounded-2xl bg-emerald-50/50 border transition-all cursor-pointer ${filterStatus === 'resolved' ? 'border-emerald-400 ring-2 ring-emerald-200 shadow-sm' : 'border-emerald-100 hover:border-emerald-200'}`}
          >
            <div className="flex items-center justify-between">
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
      </div>

      {/* SLA & Quick Support Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg border border-slate-700/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                {language === 'id' ? 'Standar Layanan SLA' : 'Support SLA Guarantee'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {language === 'id' ? 'Maks. 1×24 Jam Kerja' : 'Max 24h Business Day'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {language === 'id' 
                ? 'Setiap laporan kendala langsung ditinjau oleh staf lab & teknisi kami. Laporkan segera jika ada anomali mesin.' 
                : 'Every issue report is reviewed directly by our lab & technical staff. Report promptly if any machine anomalies occur.'}
            </p>
          </div>
        </div>
        <a
          href="https://wa.me/6281234567890?text=Halo%20Tim%20Support%20OilTrack,%20saya%20ingin%20konsultasi%20kendala%20oli%20mesin%20kami"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
          {language === 'id' ? 'Hotline WA Support' : 'WhatsApp Support'}
        </a>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: language === 'id' ? 'Semua Komplain' : 'All Complaints', count: complaints.length },
            { id: 'open', label: language === 'id' ? 'Menunggu Review' : 'Pending Review', count: openCount },
            { id: 'in_progress', label: language === 'id' ? 'Sedang Ditindaklanjuti' : 'In Progress', count: progressCount },
            { id: 'resolved', label: language === 'id' ? 'Selesai / Teratasi' : 'Resolved', count: resolvedCount },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${
                filterStatus === st.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{st.label}</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
                filterStatus === st.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {st.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'id' ? 'Cari tiket, judul, mesin...' : 'Search ticket, title, machine...'}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all placeholder:text-slate-400 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Complaints List Table */}
      <div className="w-full bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        {filteredComplaints.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery ? (language === 'id' ? 'Tiket tidak ditemukan' : 'No tickets found') : (language === 'id' ? 'Tidak ada riwayat komplain' : 'No complaints recorded')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery 
                ? (language === 'id' ? `Tidak ada komplain yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain.` : `No tickets match "${searchQuery}". Try other keywords.`)
                : (language === 'id' 
                  ? 'Semua operasional oli dan layanan terpantau berjalan lancar. Klik tombol di atas jika ada kendala.' 
                  : 'All lubricant operations are currently in good standing. Click above if you need assistance.')}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                {language === 'id' ? 'Reset Pencarian' : 'Clear Search'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">{language === 'id' ? 'ID Tiket & Tanggal' : 'Ticket ID & Date'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Kategori & Judul' : 'Category & Title'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Detail Keluhan' : 'Complaint Details'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Status' : 'Status'}</th>
                  <th className="px-6 py-4">{language === 'id' ? 'Tanggapan Tim Teknis' : 'Staff Resolution'}</th>
                  <th className="px-6 py-4 text-center">{language === 'id' ? 'Aksi' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredComplaints.map((comp) => {
                  const catConfig = CATEGORY_LABELS[comp.category || 'general'] || CATEGORY_LABELS.general
                  const statusConf = STATUS_CONFIG[comp.status] || STATUS_CONFIG.open
                  const ticketCode = getTicketCode(comp.id)
                  const isCopied = copiedTicketId === comp.id

                  return (
                    <tr 
                      key={comp.id} 
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      onClick={() => setSelectedComplaint(comp)}
                    >
                      {/* Ticket ID & Date */}
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleCopyTicket(ticketCode, comp.id, e)}
                            title={language === 'id' ? 'Klik untuk salin ID tiket' : 'Click to copy ticket ID'}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200/80 font-mono text-[11px] font-bold text-slate-800 transition-all active:scale-95 group/copy"
                          >
                            <span>{ticketCode}</span>
                            {isCopied ? (
                              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-slate-400 group-hover/copy:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                          <p className="text-[11px] text-gray-500 font-semibold">
                            {new Date(comp.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Category & Title */}
                      <td className="px-6 py-4 align-top min-w-[200px]">
                        <div className="space-y-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${catConfig.badge}`}>
                            {catConfig[language]}
                          </span>
                          <p className="text-sm font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                            {comp.title || (language === 'id' ? 'Laporan Kendala' : 'Issue Report')}
                          </p>
                          {comp.machine?.machine_name && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                              <span className="text-slate-400">⚙️</span>
                              <span>{comp.machine.machine_name}</span>
                            </div>
                          )}
                          {comp.order?.product?.product_name && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
                              <span className="text-slate-400">📦</span>
                              <span>{comp.order.product.product_name}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Complaint Details */}
                      <td className="px-6 py-4 max-w-xs align-top">
                        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                          {comp.description}
                        </p>
                        <span className="text-[10px] text-rose-600 font-bold hover:underline inline-block mt-1">
                          {language === 'id' ? 'Lihat selengkapnya →' : 'View full details →'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusConf.style}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                          {statusConf[language]}
                        </span>
                      </td>

                      {/* Staff Resolution */}
                      <td className="px-6 py-4 max-w-sm align-top">
                        {comp.resolution_notes ? (
                          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                {language === 'id' ? 'Tim Lab & Teknis' : 'Official Resolution'}
                              </span>
                              {comp.resolved_at && (
                                <span className="text-[9px] text-emerald-600 font-bold">
                                  {new Date(comp.resolved_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-emerald-950 leading-relaxed">{comp.resolution_notes}</p>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex items-center gap-2.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {language === 'id' ? 'Dalam antrean review teknis...' : 'In queue for technical review...'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap align-top text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedComplaint(comp)
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                        >
                          {language === 'id' ? 'Detail' : 'View'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedComplaint && (
        <Portal>
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-fast">
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden animate-pop-micro border border-slate-100 flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono text-xs font-bold shadow-md">
                    #
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        {getTicketCode(selectedComplaint.id)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyTicket(getTicketCode(selectedComplaint.id), selectedComplaint.id, e)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 font-bold px-2 py-0.5 rounded bg-slate-200/60 transition-all"
                      >
                        {copiedTicketId === selectedComplaint.id ? '✓ Tersalin' : 'Salin'}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {new Date(selectedComplaint.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Status & Category Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${CATEGORY_LABELS[selectedComplaint.category || 'general']?.badge}`}>
                    {CATEGORY_LABELS[selectedComplaint.category || 'general']?.[language]}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${STATUS_CONFIG[selectedComplaint.status]?.style}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
                    {STATUS_CONFIG[selectedComplaint.status]?.[language]}
                  </span>
                </div>

                {/* Title & Linked Resources */}
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {selectedComplaint.title || (language === 'id' ? 'Laporan Kendala' : 'Issue Report')}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                    {selectedComplaint.machine?.machine_name && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        ⚙️ Mesin: {selectedComplaint.machine.machine_name}
                      </span>
                    )}
                    {selectedComplaint.order?.product?.product_name && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                        📦 Order: {selectedComplaint.order.product.product_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Complaint Description */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    {language === 'id' ? 'Deskripsi Keluhan Pelanggan' : 'Customer Issue Details'}
                  </label>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {selectedComplaint.description}
                  </div>
                </div>

                {/* Technical Staff Resolution */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    {language === 'id' ? 'Tanggapan Resmi Tim Teknis & Lab' : 'Official Staff Resolution'}
                  </label>
                  {selectedComplaint.resolution_notes ? (
                    <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 leading-relaxed space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700">
                        <span>🛡️ Tim Lab & Technical Support</span>
                        {selectedComplaint.resolved_at && (
                          <span>{new Date(selectedComplaint.resolved_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')}</span>
                        )}
                      </div>
                      <p className="whitespace-pre-line font-medium">{selectedComplaint.resolution_notes}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-400 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <span>{language === 'id' ? 'Tiket sedang dalam antrean review oleh tim teknis kami (SLA < 1×24 jam).' : 'Ticket is currently queued for review (SLA < 24h).'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Tim%20Support,%20saya%20ingin%20follow%20up%20tiket%20${encodeURIComponent(getTicketCode(selectedComplaint.id))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                  {language === 'id' ? 'Follow Up via WA' : 'Follow Up via WA'}
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  {language === 'id' ? 'Tutup' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Universal Complaint Creation Modal */}
      {isModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/35 backdrop-blur-sm animate-fade-fast">
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
        </Portal>
      )}
    </div>
  )
}
