'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateActionStatus } from '@/app/actions/dashboardActions'

interface SalesAction {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  source_payload?: {
    is_new_machine?: boolean
    new_machine_data?: {
      machine_name?: string
      model?: string
      location?: string
    }
  }
  machine?: {
    machine_name: string
    location?: string
    serial_number?: string
    model?: string
  }
  customer?: {
    company_name: string
    logo_url?: string
  }
}

interface SalesClientProps {
  user: {
    id: string
    email?: string | null
  }
  profile: {
    full_name?: string | null
  }
  initialActions: SalesAction[]
}

export default function SalesClient({ user, profile, initialActions }: SalesClientProps) {
  const [actions, setActions] = useState(initialActions)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleCollect = async (actionId: string) => {
    if (!confirm('Konfirmasi bahwa sampel oli sudah diambil?')) return

    setLoadingId(actionId)
    try {
      await updateActionStatus(actionId, 'completed', 'Sample collected by field sales.')
      setActions(prev => prev.filter(a => a.id !== actionId))
      alert('Berhasil! Sampel ditandai sebagai "Collected".')
    } catch (error) {
      console.error('Update failed:', error)
      alert('Gagal mengupdate status.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Simple Header */}
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-black">S</div>
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Sales Field</h1>
              <p className="text-[10px] font-bold text-gray-500 uppercase">{profile.full_name || user.email || 'Sales User'}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Sampling Queue</h2>
          <span className="bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded-full">{actions.length} TASKS</span>
        </div>

        {actions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-sm font-bold text-gray-400 italic">No pending sampling requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map((action) => {
              const isNewMachine = action.source_payload?.is_new_machine
              const machineData = isNewMachine ? action.source_payload?.new_machine_data : null
              
              return (
                <div key={action.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        {action.customer?.logo_url ? (
                          <Image src={action.customer.logo_url} alt="Logo" width={24} height={24} className="rounded" />
                        ) : (
                          <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-gray-400">C</div>
                        )}
                        <span className="text-[11px] font-black uppercase text-gray-500 tracking-wider">{action.customer?.company_name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${action.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {action.priority}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">
                      {isNewMachine ? machineData?.machine_name : action.machine?.machine_name}
                    </h3>
                    
                    {isNewMachine && (
                      <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded mb-2 uppercase tracking-widest">
                        New Machine - Needs Verification
                      </span>
                    )}

                    <div className="space-y-2 mt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span>{isNewMachine ? machineData?.location : action.machine?.location || 'No Location'}</span>
                      </div>
                      {action.description && (
                        <div className="bg-gray-50 p-3 rounded-2xl text-xs text-gray-600 italic leading-relaxed">
                          &quot;{action.description}&quot;
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCollect(action.id)}
                    disabled={loadingId === action.id}
                    className="w-full bg-gray-900 text-white py-4 font-black uppercase tracking-[0.2em] text-xs hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loadingId === action.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Collect Sample
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <footer className="p-8 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">© 2026 PT Nabel Sakha Gemilang</p>
      </footer>
    </div>
  )
}
