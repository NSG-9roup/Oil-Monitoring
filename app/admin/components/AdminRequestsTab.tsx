'use client'

import { useState } from 'react'
import type { LabRequest } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

interface AdminRequestsTabProps {
  labRequests: LabRequest[]
  onRefresh: () => void
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  assigned: 'bg-blue-100 text-blue-700',
  sampling: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-gray-100 text-gray-600',
}

export default function AdminRequestsTab({ labRequests, onRefresh }: AdminRequestsTabProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null)
  
  const supabase = createClient()

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!confirm(`Update status menjadi "${newStatus}"?`)) return
    setLoadingId(id)
    try {
      const res = await fetch('/api/admin/lab-requests/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')
      onRefresh()
    } catch {
      alert('Gagal mengupdate status.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lab Test Requests</h2>
            <p className="text-sm text-gray-500 mt-1">Monitor dan proses pengajuan uji lab dari pelanggan.</p>
          </div>
          <span className="bg-gray-900 text-white text-xs font-black px-3 py-1.5 rounded-full">
            {labRequests.filter(r => r.status === 'pending').length} PENDING
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Mesin</th>
                <th className="px-6 py-4">Judul Request</th>
                <th className="px-6 py-4">Diajukan Oleh</th>
                <th className="px-6 py-4 text-center">Foto Bukti</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {labRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400 italic">
                    Belum ada permintaan uji lab.
                  </td>
                </tr>
              ) : (
                labRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900 text-sm">{req.customer?.company_name ?? '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-800">
                          {req.is_new_machine
                            ? (req.new_machine_data?.machine_name ?? 'Mesin Baru')
                            : (req.machine?.machine_name ?? '-')}
                        </span>
                        {req.is_new_machine && (
                          <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                            Mesin Baru
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <span className="text-sm text-gray-700 line-clamp-2">{req.title}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {req.requested_by?.full_name ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {req.sample_photo_path ? (
                        (() => {
                          const url = supabase.storage.from('sample-photos').getPublicUrl(req.sample_photo_path).data.publicUrl
                          return (
                            <button
                              onClick={() => setPreviewPhoto({ url, title: (req.customer?.company_name || 'Customer') + ' - ' + req.title })}
                              className="inline-flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100 hover:border-orange-200 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            >
                              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Lihat Foto
                            </button>
                          )
                        })()
                      ) : (
                        <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider select-none">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${PRIORITY_STYLES[req.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${STATUS_STYLES[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(req.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'assigned')}
                          disabled={loadingId === req.id}
                          className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
                        >
                          Assign
                        </button>
                      )}
                      {req.status === 'assigned' && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'sampling')}
                          disabled={loadingId === req.id}
                          className="text-xs font-bold text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors disabled:opacity-50"
                        >
                          Mulai Sampling
                        </button>
                      )}
                      {(req.status === 'sampling' || req.status === 'assigned') && (
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'completed')}
                          disabled={loadingId === req.id}
                          className="text-xs font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
                        >
                          Selesai
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

      {/* Modal Preview Foto Botol Sampel */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Foto Bukti Sampel</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{previewPhoto.title}</p>
              </div>
              <button
                onClick={() => setPreviewPhoto(null)}
                className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 bg-slate-50 flex items-center justify-center">
              <div className="relative w-full aspect-square rounded-[1.5rem] overflow-hidden border border-slate-200/60 shadow-lg bg-white p-2">
                <img
                  src={previewPhoto.url}
                  alt="Bukti Foto Botol"
                  className="w-full h-full object-cover rounded-[1rem]"
                />
              </div>
            </div>
            <div className="px-6 py-4.5 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewPhoto(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
