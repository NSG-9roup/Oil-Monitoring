'use client'

import React, { ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to monitoring service
    logger.error('React Error Boundary caught error:', {
      error: error.toString(),
      errorInfo: errorInfo.componentStack,
    })

    // You could also log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-red-50 rounded-lg p-8 border border-red-200">
          <div className="max-w-md">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-900 text-center mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-red-700 text-center mb-6">
              We encountered an unexpected error. Please try refreshing the page
              or contact support if the problem persists.
            </p>
            <details className="mb-6 p-3 bg-white rounded border border-red-200">
              <summary className="cursor-pointer font-semibold text-red-900">
                Error details (Development only)
              </summary>
              <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-32">
                {this.state.error.toString()}
              </pre>
            </details>
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
