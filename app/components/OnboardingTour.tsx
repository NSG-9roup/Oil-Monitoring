'use client'

import { useState, useEffect } from 'react'

interface OnboardingStep {
  title: string
  description: string
  icon: string
  targetId?: string
}

const steps: { id: OnboardingStep; en: OnboardingStep }[] = [
  {
    id: {
      title: 'Selamat datang di OilTrack™ 🎉',
      description: 'Dashboard ini membantu Anda memantau kondisi oli mesin secara real-time. Kami akan menunjukkan fitur-fitur utamanya dalam beberapa langkah singkat.',
      icon: '👋',
    },
    en: {
      title: 'Welcome to OilTrack™ 🎉',
      description: "This dashboard helps you monitor your machine's oil condition in real-time. We'll show you the key features in a few quick steps.",
      icon: '👋',
    },
  },
  {
    id: {
      title: 'Kartu Profil Perusahaan',
      description: 'Di bagian paling atas Anda bisa melihat informasi perusahaan, jumlah mesin yang terdaftar, dan status akun Anda.',
      icon: '🏢',
      targetId: 'profile-section',
    },
    en: {
      title: 'Company Profile Card',
      description: 'At the top you can see your company info, registered machine count, and account status.',
      icon: '🏢',
      targetId: 'profile-section',
    },
  },
  {
    id: {
      title: 'Download Laporan PDF',
      description: 'Unduh Fleet Report (ringkasan semua mesin) atau Trust & ROI Snapshot (estimasi penghematan biaya) kapan saja.',
      icon: '📄',
      targetId: 'download-cards',
    },
    en: {
      title: 'Download PDF Reports',
      description: 'Download Fleet Report (all machines summary) or Trust & ROI Snapshot (cost savings estimate) anytime.',
      icon: '📄',
      targetId: 'download-cards',
    },
  },
  {
    id: {
      title: 'Kartu Kesehatan Mesin',
      description: 'Carousel di bawah menampilkan semua mesin Anda. Warna bar di atas kartu menunjukkan kondisi: 🟢 Normal, 🟡 Waspada, 🔴 Kritis. Klik kartu untuk melihat detail.',
      icon: '⚙️',
      targetId: 'machine-carousel',
    },
    en: {
      title: 'Machine Health Cards',
      description: 'The carousel below shows all your machines. The colored bar indicates condition: 🟢 Normal, 🟡 Warning, 🔴 Critical. Click a card to see details.',
      icon: '⚙️',
      targetId: 'machine-carousel',
    },
  },
  {
    id: {
      title: 'Grafik Tren Parameter',
      description: 'Setelah memilih mesin, grafik Viscosity Trend (?), Kandungan Air (?), dan TAN (?) akan tampil. Hover tanda "?" untuk melihat penjelasan istilah teknis.',
      icon: '📈',
    },
    en: {
      title: 'Parameter Trend Charts',
      description: 'After selecting a machine, charts for Viscosity Trend (?), Water Content (?), and TAN (?) appear. Hover the "?" icon to see technical term explanations.',
      icon: '📈',
    },
  },
  {
    id: {
      title: 'Alert & Maintenance',
      description: 'Bagian bawah dashboard menampilkan alert aktif dan daftar tindakan maintenance. Anda bisa assign tugas ke teknisi dan track statusnya langsung dari sini.',
      icon: '🔔',
    },
    en: {
      title: 'Alerts & Maintenance',
      description: "The lower dashboard shows active alerts and maintenance action items. You can assign tasks to technicians and track their status right here.",
      icon: '🔔',
    },
  },
  {
    id: {
      title: 'Siap digunakan! ✅',
      description: 'Anda sudah siap menggunakan OilTrack™. Jika ada pertanyaan tentang istilah teknis, hover ikon "?" di setiap parameter. Selamat monitoring!',
      icon: '🚀',
    },
    en: {
      title: "You're all set! ✅",
      description: 'You\'re ready to use OilTrack™. If you have questions about technical terms, hover the "?" icon next to each parameter. Happy monitoring!',
      icon: '🚀',
    },
  },
]

const STORAGE_KEY = 'oiltrack_onboarding_completed'

interface OnboardingTourProps {
  language?: 'id' | 'en'
}

export function OnboardingTour({ language = 'id' }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) setVisible(true)
    } catch {
      // localStorage tidak tersedia
    }
  }, [])

  const handleClose = () => {
    setVisible(false)
    try { localStorage.setItem(STORAGE_KEY, 'true') } catch { /* ignore */ }
  }

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1)
    else handleClose()
  }

  const handleSkip = () => handleClose()

  if (!visible) return null

  const current = steps[step][language]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={handleSkip} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101] px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-bounce-in">
          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-orange-500' : i < step ? 'w-3 bg-orange-300' : 'w-3 bg-gray-200'}`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="text-5xl text-center mb-4">{current.icon}</div>

          {/* Content */}
          <h2 className="text-xl font-black text-gray-900 text-center mb-3">{current.title}</h2>
          <p className="text-gray-600 text-center leading-relaxed text-sm">{current.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleSkip}
              className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
            >
              {language === 'id' ? 'Lewati' : 'Skip'}
            </button>
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  {language === 'id' ? '← Kembali' : '← Back'}
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
              >
                {step < steps.length - 1
                  ? (language === 'id' ? 'Lanjut →' : 'Next →')
                  : (language === 'id' ? 'Mulai! 🚀' : 'Get Started! 🚀')}
              </button>
            </div>
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-gray-400 mt-4">
            {step + 1} / {steps.length}
          </p>
        </div>
      </div>
    </>
  )
}

/** Tombol untuk memunculkan kembali tour */
export function ReplayOnboardingButton({ language = 'id' }: { language?: 'id' | 'en' }) {
  const handleReplay = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    window.location.reload()
  }

  return (
    <button
      onClick={handleReplay}
      className="text-xs text-gray-500 hover:text-orange-600 transition-colors flex items-center gap-1"
      title={language === 'id' ? 'Tampilkan panduan lagi' : 'Show guide again'}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {language === 'id' ? 'Panduan' : 'Guide'}
    </button>
  )
}
