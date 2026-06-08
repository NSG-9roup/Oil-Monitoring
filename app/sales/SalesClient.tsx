'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient, uploadWithRetry } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { LabRequest } from '@/lib/types'
import imageCompression from 'browser-image-compression'
import Image from 'next/image'
import { approveNewMachine } from '@/app/actions/adminActions'
import toast from 'react-hot-toast'
import { updateLabRequestStatusSales, updatePhotoPathSales } from '@/app/actions/salesActions'
import { sendPurchasingProposalEmail } from '@/app/actions/emailActions'

interface OfflineAction {
  type: 'COLLECT' | 'UNDO_COLLECT' | 'UPLOAD_PHOTO'
  requestId: string
  fileBase64?: string
  fileName?: string
  fileType?: string
}

interface SalesOrder {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  status: string
  created_at: string
  updated_at: string
  customer?: { company_name?: string }
  product?: { product_name?: string }
}

interface SalesComplaint {
  id: string
  order_id: string
  customer_id: string
  description: string
  status: string
  resolution_notes?: string | null
  created_at: string
  updated_at: string
  order?: { id: string; product?: { product_name?: string } }
  customer?: { company_name?: string }
}

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
  initialOrders: SalesOrder[]
  initialComplaints: SalesComplaint[]
}

export default function SalesClient({ user, profile, initialLabRequests, initialOrders = [], initialComplaints = [] }: SalesClientProps) {
  const [requests, setRequests] = useState<LabRequest[]>(initialLabRequests)
  const [orders, setOrders] = useState(initialOrders)
  // const [complaints, setComplaints] = useState(initialComplaints)
  const [activeTab, setActiveTab] = useState<'queue' | 'transit' | 'orders'>('queue')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'new' | 'high'>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')

  // Purchasing proposal form state
  const [proposalForm, setProposalForm] = useState({
    customerName: '',
    companyPT: '',
    productName: '',
    quantity: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  })
  const [sendingProposal, setSendingProposal] = useState(false)
  const [proposalHistory, setProposalHistory] = useState<{ id: string; companyPT: string; productName: string; quantity: number; sentAt: string }[]>([])
  
  // State for Uploading Photo progress indicator
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeUploadRequestId, setActiveUploadRequestId] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  const [isOnline, setIsOnline] = useState(true)
  const [syncingOffline, setSyncingOffline] = useState(false)

  // Setup online/offline listeners & sync queue
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine)
      
      const base64ToFile = async (base64: string, filename: string, mimeType: string): Promise<File> => {
        const res = await fetch(base64)
        const blob = await res.blob()
        return new File([blob], filename, { type: mimeType })
      }

      const syncOfflineQueue = async () => {
        const queueJson = localStorage.getItem('sales_offline_queue')
        if (!queueJson) return

        let queue: OfflineAction[] = []
        try {
          queue = JSON.parse(queueJson) as OfflineAction[]
        } catch {
          return
        }

        if (queue.length === 0) return

        setSyncingOffline(true)
        const toastId = toast.loading('Mensinkronisasikan perubahan offline ke database...')
        const remainingQueue: OfflineAction[] = []

        for (const action of queue) {
          try {
            if (action.type === 'COLLECT') {
              await updateLabRequestStatusSales(action.requestId, 'sampling')
            } else if (action.type === 'UNDO_COLLECT') {
              await updateLabRequestStatusSales(action.requestId, 'pending')
            } else if (action.type === 'UPLOAD_PHOTO' && action.fileBase64 && action.fileName && action.fileType) {
              const file = await base64ToFile(action.fileBase64, action.fileName, action.fileType)
              
              const fileExt = action.fileName.split('.').pop()
              const filePath = `samples/${action.requestId}_${Date.now()}.${fileExt}`

              const { error: uploadError } = await uploadWithRetry(
                supabase,
                'sample-photos',
                filePath,
                file,
                {
                  upsert: true,
                  contentType: action.fileType
                }
              )
              if (uploadError) throw uploadError

              await updatePhotoPathSales(action.requestId, filePath)
            }
          } catch (err) {
            console.error('Failed to sync offline action:', action, err)
            remainingQueue.push(action)
          }
        }

        setSyncingOffline(false)
        if (remainingQueue.length > 0) {
          localStorage.setItem('sales_offline_queue', JSON.stringify(remainingQueue))
          toast.error('Beberapa data offline gagal disinkronkan. Akan dicoba lagi nanti.', { id: toastId })
        } else {
          localStorage.removeItem('sales_offline_queue')
          toast.success('Semua data offline berhasil disinkronkan!', { id: toastId })
          router.refresh()
        }
      }

      const goOnline = () => {
        setIsOnline(true)
        syncOfflineQueue()
      }
      
      const goOffline = () => {
        setIsOnline(false)
      }

      window.addEventListener('online', goOnline)
      window.addEventListener('offline', goOffline)

      // Initial check
      if (navigator.onLine) {
        syncOfflineQueue()
      }

      return () => {
        window.removeEventListener('online', goOnline)
        window.removeEventListener('offline', goOffline)
      }
    }
  }, [supabase, router])

  // Set up real-time subscription for lab requests (Saran A)
  useEffect(() => {
    const channel = supabase
      .channel('sales-requests-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'oil_lab_requests'
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  // Synchronize server props with state when server components refresh
  useEffect(() => {
    setRequests(initialLabRequests)
  }, [initialLabRequests])

  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

  useEffect(() => {
    setComplaints(initialComplaints)
  }, [initialComplaints])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const handleSendProposal = async () => {
    if (!proposalForm.customerName || !proposalForm.companyPT || !proposalForm.productName || !proposalForm.quantity) {
      toast.error('Mohon lengkapi semua field yang wajib diisi.')
      return
    }
    setSendingProposal(true)
    try {
      const result = await sendPurchasingProposalEmail({
        salesName: profile.full_name || user.email || 'Sales Officer',
        customerName: proposalForm.customerName,
        companyPT: proposalForm.companyPT,
        productName: proposalForm.productName,
        quantity: Number(proposalForm.quantity),
        customerPhone: proposalForm.customerPhone || undefined,
        customerEmail: proposalForm.customerEmail || undefined,
        notes: proposalForm.notes || undefined,
      })
      if (!result.success) throw new Error(result.error)
      toast.success('✅ Penawaran berhasil dikirim ke Purchasing!')
      setProposalHistory(prev => [
        { id: Date.now().toString(), companyPT: proposalForm.companyPT, productName: proposalForm.productName, quantity: Number(proposalForm.quantity), sentAt: new Date().toISOString() },
        ...prev
      ])
      setProposalForm({ customerName: '', companyPT: '', productName: '', quantity: '', customerPhone: '', customerEmail: '', notes: '' })
    } catch (err) {
      toast.error(`Gagal mengirim: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSendingProposal(false)
    }
  }

  // 1. Aksi transisi status: Antrean -> Transit (Collected)
  const handleCollect = async (requestId: string) => {
    if (!confirm('Konfirmasi bahwa sampel oli sudah diambil?')) return

    if (!navigator.onLine) {
      try {
        const queueJson = localStorage.getItem('sales_offline_queue') || '[]'
        const queue: OfflineAction[] = JSON.parse(queueJson) as OfflineAction[]
        if (!queue.some(x => x.type === 'COLLECT' && x.requestId === requestId)) {
          queue.push({ type: 'COLLECT', requestId })
          localStorage.setItem('sales_offline_queue', JSON.stringify(queue))
        }
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'sampling' } : r))
        toast.success('Offline: Penjemputan sampel disimpan lokal. Akan disinkronkan saat online.')
      } catch (err) {
        console.error('Offline queue write failed:', err)
        alert('Gagal menyimpan status offline.')
      }
      return
    }

    setLoadingId(requestId)
    try {
      await updateLabRequestStatusSales(requestId, 'sampling')
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'sampling' } : r))
      toast.success('Status berhasil diubah ke Sampling!')
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

    if (!navigator.onLine) {
      try {
        const queueJson = localStorage.getItem('sales_offline_queue') || '[]'
        const queue: OfflineAction[] = JSON.parse(queueJson) as OfflineAction[]
        const filteredQueue = queue.filter(x => !(x.type === 'COLLECT' && x.requestId === requestId))
        if (!filteredQueue.some(x => x.type === 'UNDO_COLLECT' && x.requestId === requestId)) {
          filteredQueue.push({ type: 'UNDO_COLLECT', requestId })
        }
        localStorage.setItem('sales_offline_queue', JSON.stringify(filteredQueue))
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'pending' } : r))
        toast.success('Offline: Pembatalan sampel disimpan lokal.')
      } catch (err) {
        console.error('Offline queue write failed:', err)
        alert('Gagal menyimpan status offline.')
      }
      return
    }

    setLoadingId(requestId)
    try {
      await updateLabRequestStatusSales(requestId, 'pending')
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'pending' } : r))
      toast.success('Status dikembalikan ke Pending!')
    } catch (error) {
      console.error('Undo failed:', error)
      alert('Gagal mengembalikan status.')
    } finally {
      setLoadingId(null)
    }
  }

  // 3. Aksi verifikasi spesifikasi mesin baru langsung di tempat oleh sales
  const handleVerifyMachine = async (requestId: string, req: LabRequest) => {
    setLoadingId(requestId)
    try {
      if (!req.machine_id && req.new_machine_data?.machine_name) {
        const result = await approveNewMachine(
          requestId,
          req.customer_id,
          req.new_machine_data.machine_name,
          req.new_machine_data.location || null
        )

        if (result.success && result.machine) {
          const newMachine = result.machine
          setRequests(prev => prev.map(r => r.id === requestId ? {
            ...r,
            is_new_machine: false,
            machine_id: newMachine.id,
            machine: {
              machine_name: newMachine.machine_name,
              location: newMachine.location,
              serial_number: newMachine.serial_number,
              model: newMachine.model
            }
          } : r))
          alert('Mesin berhasil disetujui dan ditambahkan ke database otomatis!')
        } else {
          throw new Error('Approval action returned failure')
        }
      } else {
        alert('Data mesin baru tidak lengkap.')
      }
    } catch (e) {
      console.error('Verification failed:', e)
      alert('Gagal menyetujui mesin baru.')
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

    // Client-side validation: MIME type and file size (Saran D)
    if (!file.type.startsWith('image/')) {
      alert('Hanya diperbolehkan mengunggah file gambar (JPEG/PNG/WEBP).')
      if (e.target) e.target.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file foto bukti tidak boleh melebihi 5MB.')
      if (e.target) e.target.value = ''
      return
    }

    setUploadingId(activeUploadRequestId)

    try {
      // Opsi kompresi gambar agar hemat bandwidth di lapangan (maksimal 150KB)
      const options = {
        maxSizeMB: 0.15,
        maxWidthOrHeight: 800,
        useWebWorker: true
      }
      
      const compressedFile = await imageCompression(file, options)
      
      if (!navigator.onLine) {
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = reader.result as string
          try {
            const queueJson = localStorage.getItem('sales_offline_queue') || '[]'
            const queue: OfflineAction[] = JSON.parse(queueJson) as OfflineAction[]
            queue.push({
              type: 'UPLOAD_PHOTO',
              requestId: activeUploadRequestId,
              fileBase64: base64,
              fileName: file.name,
              fileType: compressedFile.type
            })
            localStorage.setItem('sales_offline_queue', JSON.stringify(queue))

            const localUrl = URL.createObjectURL(compressedFile)
            setRequests(prev => prev.map(r => r.id === activeUploadRequestId ? { ...r, sample_photo_path: localUrl } : r))
            toast.success('Offline: Foto bukti disimpan lokal. Akan diunggah otomatis saat online.')
          } catch (err) {
            console.error('Offline queue write failed:', err)
            alert('Gagal mengantre foto offline karena penyimpanan browser penuh.')
          } finally {
            setUploadingId(null)
            setActiveUploadRequestId(null)
          }
        }
        reader.readAsDataURL(compressedFile)
        return
      }

      const fileExt = file.name.split('.').pop()
      const filePath = `samples/${activeUploadRequestId}_${Date.now()}.${fileExt}`

      // Upload ke bucket public 'sample-photos' yang telah dipersiapkan dengan mekanisme retry (Saran D)
      const { error: uploadError } = await uploadWithRetry(
        supabase,
        'sample-photos',
        filePath,
        compressedFile,
        {
          upsert: true,
          contentType: compressedFile.type
        }
      )

      if (uploadError) throw uploadError

      // Update path foto di baris oil_lab_requests
      await updatePhotoPathSales(activeUploadRequestId, filePath)

      setRequests(prev => prev.map(r => r.id === activeUploadRequestId ? { ...r, sample_photo_path: filePath } : r))
      toast.success('Bukti foto botol sampel berhasil diunggah!')
    } catch (err) {
      console.error('Photo upload failed:', err)
      alert('Gagal mengunggah foto bukti setelah beberapa percobaan.')
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
                <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-ping'}`}></span>
              </h1>
              <p className="text-[10px] font-black text-slate-700 tracking-wide">
                {profile.full_name ? (
                  <span>👤 {profile.full_name}</span>
                ) : (
                  <span className="text-slate-400">{user.email || 'Sales Officer'}</span>
                )}
              </p>
            </div>
          </div>
          {/* Toggle View Mode + Logout */}
          <div className="flex items-center gap-2">
            {(activeTab === 'queue' || activeTab === 'transit') && (
              <div className="flex bg-slate-100 rounded-xl p-0.5">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'card' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Card View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Table View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18" />
                  </svg>
                </button>
              </div>
            )}
            <button onClick={handleSignOut} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-slate-100 active:scale-95">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-red-500 text-white text-[11px] font-black uppercase tracking-wider py-2.5 px-4 text-center select-none animate-pulse flex items-center justify-center gap-1.5 z-20">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 5 5 0 011.414-3.536m0 0l2.829 2.829m-2.829 4.243L3 21M5.636 5.636a9 9 0 0112.728 0m0 0l-2.829-2.829m-1.414-1.414a1 1 0 112 0 1 1 0 01-2 0z" /></svg>
          <span>Offline Mode: Perubahan disimpan lokal & disinkronkan saat terhubung internet</span>
        </div>
      )}
      {syncingOffline && (
        <div className="bg-orange-500 text-white text-[11px] font-black uppercase tracking-wider py-2.5 px-4 text-center select-none flex items-center justify-center gap-1.5 z-20">
          <svg className="w-4 h-4 animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" /></svg>
          <span>Sinkronisasi data offline sedang berlangsung...</span>
        </div>
      )}

      {/* Segmen Kontrol Utama (Tabs) */}
      <div className="bg-white border-b border-slate-100 p-2 sticky top-[73px] z-20 shadow-sm">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Antrean</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${activeTab === 'queue' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>{pendingCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('transit')}
            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'transit'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Transit</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${activeTab === 'transit' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>{transitCount}</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Pesanan</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${activeTab === 'orders' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>{orders.filter(o => o.status === 'pending' || o.status === 'processing').length}</span>
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
                            <Image src={req.customer.logo_url} alt="Logo" fill className="object-contain" unoptimized />
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
                          <Image src={samplePhotoUrl} alt="Bukti Foto" fill className="object-cover" unoptimized />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">FOTO BUKTI SAMPEL</p>
                          <p className="text-[11px] font-bold text-slate-700 truncate">Terunggah di Pabrik</p>
                        </div>
                      </div>
                    )}

                    {/* Bukti mesin baru telah dihapus dari inline form - Langsung Appprove via button bawah */}
                  </div>

                  {/* Tombol Aksi di Bagian Bawah Kartu */}
                  <div className="flex border-t border-slate-100">
                    {/* Aksi khusus Tab Antrean */}
                    {activeTab === 'queue' && (
                      <>
                        {isNewMachine && (
                          <button
                            onClick={() => handleVerifyMachine(req.id, req)}
                            disabled={loadingId === req.id}
                            className="flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50/50 hover:bg-amber-50 border-r border-slate-100 transition-colors"
                          >
                            Setujui Mesin
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

        {/* Table View for Queue & Transit */}
        {(activeTab === 'queue' || activeTab === 'transit') && viewMode === 'table' && filteredRequests.length > 0 && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest text-[9px]">Customer</th>
                  <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest text-[9px]">Mesin</th>
                  <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest text-[9px]">Lokasi</th>
                  <th className="px-4 py-3 text-center font-black text-slate-400 uppercase tracking-widest text-[9px]">Prioritas</th>
                  <th className="px-4 py-3 text-center font-black text-slate-400 uppercase tracking-widest text-[9px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 truncate max-w-[100px]">{req.customer?.company_name || '-'}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 truncate max-w-[100px]">
                      {req.is_new_machine ? req.new_machine_data?.machine_name : req.machine?.machine_name}
                      {req.is_new_machine && <span className="ml-1 text-amber-600 text-[9px] font-black">NEW</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-[80px]">
                      {req.is_new_machine ? req.new_machine_data?.location : req.machine?.location || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                        req.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                      }`}>{req.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {activeTab === 'queue' ? (
                        <button
                          onClick={() => handleCollect(req.id)}
                          disabled={loadingId === req.id}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-black transition-all disabled:opacity-50"
                        >
                          {loadingId === req.id ? '...' : 'Ambil'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUndoCollect(req.id)}
                          disabled={loadingId === req.id}
                          className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-red-100 transition-all disabled:opacity-50"
                        >
                          {loadingId === req.id ? '...' : 'Batal'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Tab — Kirim Penawaran ke Purchasing */}
        {activeTab === 'orders' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
            
            {/* Form Card */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Kirim Penawaran ke Purchasing</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">Email akan dikirim ke <strong className="text-orange-600">warehouse@nabelsakha.com</strong></p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Nama Customer */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Customer <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Nama contact person customer"
                    value={proposalForm.customerName}
                    onChange={e => setProposalForm(p => ({ ...p, customerName: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                  />
                </div>

                {/* Nama PT */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Perusahaan (PT) <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="PT / CV / UD nama perusahaan"
                    value={proposalForm.companyPT}
                    onChange={e => setProposalForm(p => ({ ...p, companyPT: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                  />
                </div>

                {/* Produk + Jumlah inline */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nama Produk <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Contoh: Mobil DTE 26"
                      value={proposalForm.productName}
                      onChange={e => setProposalForm(p => ({ ...p, productName: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-2xl px-3 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Jumlah <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      placeholder="0"
                      min="1"
                      value={proposalForm.quantity}
                      onChange={e => setProposalForm(p => ({ ...p, quantity: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-2xl px-3 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Kontak Customer */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">No. Telepon</label>
                    <input
                      type="tel"
                      placeholder="08xx-xxxx-xxxx"
                      value={proposalForm.customerPhone}
                      onChange={e => setProposalForm(p => ({ ...p, customerPhone: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-2xl px-3 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Customer</label>
                    <input
                      type="email"
                      placeholder="customer@email.com"
                      value={proposalForm.customerEmail}
                      onChange={e => setProposalForm(p => ({ ...p, customerEmail: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-2xl px-3 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Catatan Tambahan</label>
                  <textarea
                    placeholder="Spesifikasi khusus, urgensi, atau keterangan lainnya..."
                    value={proposalForm.notes}
                    onChange={e => setProposalForm(p => ({ ...p, notes: e.target.value }))}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSendProposal}
                  disabled={sendingProposal}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black uppercase tracking-[0.15em] text-[10px] rounded-2xl transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                >
                  {sendingProposal ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Kirim ke Purchasing
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* History Penawaran yang Terkirim */}
            {proposalHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Riwayat Penawaran Terkirim (Sesi Ini)</h3>
                {proposalHistory.map(h => (
                  <div key={h.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between shadow-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{h.productName}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{h.companyPT} • {h.quantity} unit</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-lg border border-emerald-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Terkirim
                      </span>
                      <p className="text-[9px] text-slate-400 mt-1">{new Date(h.sentAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
