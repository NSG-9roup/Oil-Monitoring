import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-orange-50 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        {/* Animated oil drop icon */}
        <div className="relative mx-auto w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-400 to-red-600 rounded-full opacity-20 animate-pulse" />
          <svg className="w-32 h-32 text-orange-500 drop-shadow-lg" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 10 C50 10, 20 50, 20 65 C20 82, 33 95, 50 95 C67 95, 80 82, 80 65 C80 50, 50 10, 50 10Z" opacity="0.8" />
            <text x="50" y="72" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">404</text>
          </svg>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-3">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
          Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan. 
          Silakan kembali ke dashboard untuk melanjutkan monitoring.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Kembali ke Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-gray-700 font-bold rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 hover:-translate-y-0.5 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Halaman Login
          </Link>
        </div>

        <p className="mt-10 text-xs text-gray-400">
          Oil Condition Monitoring System &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
