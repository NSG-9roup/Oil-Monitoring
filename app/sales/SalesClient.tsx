'use client'

import { useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { LabRequest } from '@/lib/types'
import imageCompression from 'browser-image-compression'
import Image from 'next/image'

interface SalesClientProps {
  user: {
    id: string
    email?: string | null
  }
  profile: {
    id: string
    full_name?: string | null
  }
  initialLabRequests: LabRequest[]
}

export default function SalesClient({ user, profile, initialLabRequests }: SalesClientProps) {
  const [requests, setRequests] = useState<LabRequest[]>(initialLabRequests)
  const [activeTab, setActiveTab] = useState<'queue' | 'transit'>('queue')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'new' | 'high'>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  
  // States for On-Site Verification Form
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [serialNumber, setSerialNumber] = useState('')
  const [machineModel, setMachineModel] = useState('')

  // State for Uploading Photo progress indicator
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeUploadRequestId, setActiveUploadRequestId] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // 1. Aksi transisi status: Antrean -> Transit (Collected)
  const handleCollect = async (requestId: string) => {
    if (!confirm('Konfirmasi bahwa sampel oli sudah diambil?')) return

    setLoadingId(requestId)
    try {
      const { error } = await supabase
        .from('oil_lab_requests')
        .update({ status: 'sampling' })
        .eq('id', requestId)

      if (error) throw error

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'sampling' } : r))
    } catch (error) {
      console.error('Update failed:', error)
      alert('Gagal mengupdate status.')
    } finally {
      setLoadingId(null)
    }
  }

  // 2. Aksi pembatalan status (Undo): Transit -> Antrean
  const handleUndoCollect = async (requestId: string) => {
    if (!confirm('Batalkan pengambilan sampel dan kembalikan ke antrean?')) return

    setLoadingId(requestId)
    try {
      const { error } = await supabase
        .from('oil_lab_requests')
        .update({ status: 'pending' })
        .eq('id', requestId)

      if (error) throw error

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'pending' } : r))
    } catch (error) {
      console.error('Undo failed:', error)
      alert('Gagal mengembalikan status.')
    } finally {
      setLoadingId(null)
    }
  }

  // 3. Aksi verifikasi spesifikasi mesin baru langsung di tempat oleh sales
  const handleVerifyMachine = async (requestId: string, machineId: string | null | undefined, req: LabRequest) => {
    if (!serialNumber.trim() || !machineModel.trim()) {
      alert('Nomor Seri dan Model wajib diisi untuk verifikasi.')
      return
    }

    setLoadingId(requestId)
    try {
      // Jika machine_id tidak ada, kita update data registrasi di new_machine_data
      if (!machineId) {
        const updatedNewData = {
          ...req.new_machine_data,
          serial_number: serialNumber,
          model: machineModel,
        }

        const { error } = await supabase
          .from('oil_lab_requests')
          .update({ 
            new_machine_data: updatedNewData,
            is_new_machine: false // Melepas penanda mesin baru setelah diverifikasi
          })
          .eq('id', requestId)

        if (error) throw error

        setRequests(prev => prev.map(r => r.id === requestId ? {
          ...r,
          is_new_machine: false,
          new_machine_data: updatedNewData
        } : r))
      } else {
        // Jika machine_id ada, update langsung tabel oil_machines
        const { error: machineErr } = await supabase
          .from('oil_machines')
          .update({
            serial_number: serialNumber,
            model: machineModel
          })
          .eq('id', machineId)

        if (machineErr) throw machineErr

        const { error: requestErr } = await supabase
          .from('oil_lab_requests')
          .update({ is_new_machine: false })
          .eq('id', requestId)

        if (requestErr) throw requestErr

        setRequests(prev => prev.map(r => r.id === requestId ? {
          ...r,
          is_new_machine: false,
          machine: r.machine ? {
            ...r.machine,
            serial_number: serialNumber,
            model: machineModel
          } : null
        } : r))
      }

      alert('Spesifikasi mesin sukses diverifikasi langsung dari lokasi pabrik!')
      setVerifyingId(null)
      setSerialNumber('')
      setMachineModel('')
    } catch (e) {
      console.error('Verification failed:', e)
      alert('Gagal memverifikasi spesifikasi mesin.')
    } finally {
      setLoadingId(null)
    }
  }

  // 4. Aksi Kompresi dan Upload Foto Sampel Fisik
  const handlePhotoUploadTrigger = (requestId: string) => {
    setActiveUploadRequestId(requestId)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !activeUploadRequestId) return

    const file = files[0]
    setUploadingId(activeUploadRequestId)

    try {
      // Opsi kompresi gambar agar hemat bandwidth di lapangan (maksimal 150KB)
      const options = {
        maxSizeMB: 0.15,
        maxWidthOrHeight: 800,
        useWebWorker: true
      }
      
      const compressedFile = await imageCompression(file, options)
      
      const fileExt = file.name.split('.').pop()
      const filePath = `samples/${activeUploadRequestId}_${Date.now()}.${fileExt}`

      // Upload ke bucket public 'sample-photos' yang telah dipersiapkan
      const { error: uploadError } = await supabase.storage
        .from('sample-photos')
        .upload(filePath, compressedFile, {
          upsert: true,
          contentType: compressedFile.type
        })

      if (uploadError) throw uploadError

      // Update path foto di baris oil_lab_requests
      const { error: dbError } = await supabase
        .from('oil_lab_requests')
        .update({ sample_photo_path: filePath })
        .eq('id', activeUploadRequestId)

      if (dbError) throw dbError

      setRequests(prev => prev.map(r => r.id === activeUploadRequestId ? { ...r, sample_photo_path: filePath } : r))
      alert('Bukti foto botol sampel berhasil diunggah!')
    } catch (err) {
      console.error('Photo upload failed:', err)
      alert('Gagal mengunggah foto bukti.')
    } finally {
      setUploadingId(null)
      setActiveUploadRequestId(null)
      if (e.target) e.target.value = ''
    }
  }

  // Search & Filter Engine
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // Tab filter
      const matchesTab = activeTab === 'queue'
        ? (r.status === 'pending' || r.status === 'assigned')
        : r.status === 'sampling'

      // Search filter
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = 
        r.customer?.company_name?.toLowerCase().includes(searchLower) ||
        r.machine?.machine_name?.toLowerCase().includes(searchLower) ||
        r.new_machine_data?.machine_name?.toLowerCase().includes(searchLower) ||
        r.machine?.location?.toLowerCase().includes(searchLower) ||
        r.new_machine_data?.location?.toLowerCase().includes(searchLower)

      // Filter chips mode
      const matchesMode = 
        filterMode === 'all' ? true :
        filterMode === 'mine' ? r.assigned_to_profile_id === profile.id :
        filterMode === 'new' ? r.is_new_machine === true :
        filterMode === 'high' ? r.priority === 'high' : true

      return matchesTab && matchesSearch && matchesMode
    })
  }, [requests, activeTab, searchQuery, filterMode, profile.id])

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'assigned').length
  const transitCount = requests.filter(r => r.status === 'sampling').length

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Input File Tersembunyi untuk Kamera / Kamera Roll */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Header Premium */}
      <header className="bg-white border-b border-slate-100 px-4 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center select-none">
          <div className="flex items-center">
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 select-none">
                <Image
                  src="/teks logo.webp"
                  alt="OilTrack"
                  width={3186}
                  height={881}
                  className="h-5 w-auto object-contain inline-block shrink-0"
                />
                <span className="text-slate-800 font-extrabold text-[10px] lowercase tracking-normal bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-md border border-orange-100">sales</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{profile.full_name || user.email || 'Sales Officer'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-slate-100 active:scale-95">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      {/* Segmen Kontrol Utama (Tabs) */}
      <div className="bg-white border-b border-slate-100 p-2 sticky top-[73px] z-20 shadow-sm">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Antrean Queue</span>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === 'queue' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>{pendingCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'transit'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Dalam Transit</span>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === 'transit' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>{transitCount}</span>
          </button>
        </div>
      </div>

      {/* Mesin Pencari & Filter Chips */}
      <div className="bg-white px-4 py-3 border-b border-slate-100">
        <div className="max-w-md mx-auto space-y-3">
          {/* Bar Pencarian */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari Customer, Mesin, atau Area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 pl-10 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 p-0.5 hover:bg-slate-200 rounded-full transition-all"><svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            )}
          </div>

          {/* Filter Chips Horizontal */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                filterMode === 'all'
                  ? 'bg-slate-900 border-slate-950 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterMode('mine')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                filterMode === 'mine'
                  ? 'bg-orange-500 border-orange-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Tugas Saya
            </button>
            <button
              onClick={() => setFilterMode('new')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                filterMode === 'new'
                  ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Mesin Baru 🟡
            </button>
            <button
              onClick={() => setFilterMode('high')}
              className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${
                filterMode === 'high'
                  ? 'bg-red-500 border-red-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              Prioritas 🔴
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 space-y-4 z-10">
        <div className="flex items-center justify-between px-1 mb-1">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {activeTab === 'queue' ? 'Daftar Pengambilan Sampel' : 'Daftar Sampel Dalam Transit'}
          </h2>
          <span className="bg-slate-200 text-slate-700 text-[9px] font-black px-2 py-0.5 rounded-full">{filteredRequests.length} ITEM</span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-slate-200/80 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-xs font-bold text-slate-400 italic">Tidak ada tugas sampling yang cocok.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const isNewMachine = req.is_new_machine
              const machineData = isNewMachine ? req.new_machine_data : null
              const hasPhoto = !!req.sample_photo_path

              // Mendapatkan url publik foto bukti dari Supabase
              const samplePhotoUrl = hasPhoto 
                ? supabase.storage.from('sample-photos').getPublicUrl(req.sample_photo_path!).data.publicUrl
                : null

              const isAssignedToMe = req.assigned_to_profile_id === profile.id

              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-md ${
                    req.priority === 'high' ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <div className="p-5">
                    {/* Baris Atas: Logo Customer & Prioritas */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        {req.customer?.logo_url ? (
                          <div className="relative w-6 h-6 rounded overflow-hidden bg-slate-50 border border-slate-100">
                            <img src={req.customer.logo_url} alt="Logo" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-[10px] font-black text-slate-400">C</div>
                        )}
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider truncate max-w-[20ch]">
                          {req.customer?.company_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {isAssignedToMe && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-black rounded-lg uppercase tracking-wider">TUGAS SAYA</span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                          req.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                    </div>

                    {/* Informasi Mesin */}
                    <h3 className="text-base font-black text-slate-900 leading-snug mb-1">
                      {isNewMachine ? machineData?.machine_name : req.machine?.machine_name}
                    </h3>

                    {isNewMachine && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 text-[9px] font-black rounded-lg uppercase tracking-widest mb-3">
                        <span className="h-1 w-1 rounded-full bg-amber-500 animate-ping"></span>
                        Mesin Baru - Butuh Verifikasi
                      </span>
                    )}

                    {/* Data Metadata Lokasi & Deskripsi Rekomendasi */}
                    <div className="space-y-3 mt-3.5">
                      {/* Navigasi GPS Google Maps Integrasi */}
                      {(() => {
                        const targetLocation = isNewMachine ? machineData?.location : req.machine?.location
                        const locationText = targetLocation || 'Lokasi tidak spesifik'
                        const mapsQuery = `${req.customer?.company_name} ${locationText}`
                        
                        return (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 text-xs text-slate-500 font-semibold hover:text-orange-500 transition-colors w-fit group"
                          >
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="underline decoration-dashed decoration-slate-350">{locationText}</span>
                          </a>
                        )
                      })()}

                      {req.title && (
                        <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs text-slate-600 font-bold leading-relaxed">
                          &quot;{req.title}&quot;
                          {req.description && (
                            <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal whitespace-pre-wrap">{req.description}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Bukti Foto Botol Sampel */}
                    {hasPhoto && samplePhotoUrl && (
                      <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-100">
                          <img src={samplePhotoUrl} alt="Bukti Foto" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">FOTO BUKTI SAMPEL</p>
                          <p className="text-[11px] font-bold text-slate-700 truncate">Terunggah di Pabrik</p>
                        </div>
                      </div>
                    )}

                    {/* Inline Form Verifikasi Spesifikasi Mesin Baru */}
                    {verifyingId === req.id && (
                      <div className="mt-4 p-4 border-2 border-amber-200 bg-amber-50/30 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">Verifikasi On-Site</h4>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nomor Seri Fisik (Serial S/N)</label>
                          <input
                            type="text"
                            placeholder="Contoh: S/N-998877"
                            value={serialNumber}
                            onChange={(e) => setSerialNumber(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Model Mesin</label>
                          <input
                            type="text"
                            placeholder="Contoh: Turbo-G3"
                            value={machineModel}
                            onChange={(e) => setMachineModel(e.target.value)}
                            className="w-full bg-white border border-slate-200 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => {
                              setVerifyingId(null)
                              setSerialNumber('')
                              setMachineModel('')
                            }}
                            className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            Batal
                          </button>
                          <button
                            onClick={() => handleVerifyMachine(req.id, req.machine_id, req)}
                            disabled={loadingId === req.id}
                            className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                          >
                            Simpan & Verifikasi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi di Bagian Bawah Kartu */}
                  <div className="flex border-t border-slate-100">
                    {/* Aksi khusus Tab Antrean */}
                    {activeTab === 'queue' && (
                      <>
                        {isNewMachine && verifyingId !== req.id && (
                          <button
                            onClick={() => {
                              setVerifyingId(req.id)
                              setSerialNumber(req.machine?.serial_number || '')
                              setMachineModel(req.machine?.model || '')
                            }}
                            className="flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50/50 hover:bg-amber-50 border-r border-slate-100 transition-colors"
                          >
                            Verifikasi Mesin
                          </button>
                        )}
                        <button
                          onClick={() => handleCollect(req.id)}
                          disabled={loadingId === req.id}
                          className="flex-[2] py-4 bg-slate-900 text-white font-black uppercase tracking-[0.15em] text-[10px] hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                        >
                          {loadingId === req.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          ) : (
                            <>
                              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              Ambil Sampel
                            </>
                          )}
                        </button>
                      </>
                    )}

                    {/* Aksi khusus Tab Transit */}
                    {activeTab === 'transit' && (
                      <div className="w-full flex">
                        {/* Tombol Ambil / Ganti Foto */}
                        <button
                          onClick={() => handlePhotoUploadTrigger(req.id)}
                          disabled={uploadingId === req.id}
                          className="flex-1 py-4 bg-white text-slate-800 border-r border-slate-100 font-black uppercase tracking-wider text-[10px] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                        >
                          {uploadingId === req.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/20 border-t-slate-950" />
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {hasPhoto ? 'Ganti Foto' : 'Ambil Foto Botol'}
                            </>
                          )}
                        </button>
                        
                        {/* Tombol Undo Batal */}
                        <button
                          onClick={() => handleUndoCollect(req.id)}
                          disabled={loadingId === req.id}
                          className="flex-1 py-4 bg-red-50 text-red-700 font-black uppercase tracking-wider text-[10px] hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                        >
                          {loadingId === req.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-700/20 border-t-red-700" />
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
                              Batal
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="p-8 text-center bg-white border-t border-slate-100">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authenticated Field Representative</p>
        <p className="text-xs font-bold text-slate-800 mt-1">© 2026 PT Nabel Sakha Gemilang</p>
      </footer>
    </div>
  )
}
