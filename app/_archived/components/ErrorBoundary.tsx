'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary — mencegah seluruh halaman crash jika satu section gagal.
 * Gunakan di sekitar komponen yang mungkin throw error (chart, data fetch, dll).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hanya log di development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ErrorBoundary] Section "${this.props.sectionName ?? 'unknown'}" crashed:`, error, info.componentStack)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center my-4">
          <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="font-bold text-red-800 mb-1">
            {this.props.sectionName ? `Section "${this.props.sectionName}" gagal dimuat` : 'Bagian ini gagal dimuat'}
          </p>
          <p className="text-sm text-red-600 mb-4">
            {process.env.NODE_ENV === 'development' ? this.state.error?.message : 'Terjadi kesalahan yang tidak terduga.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
