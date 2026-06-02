'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('GLOBAL ERROR CAUGHT:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm text-gray-800 whitespace-pre-wrap">
            {error.message || 'Unknown error'}
          </pre>
          <pre className="bg-gray-100 p-4 rounded text-sm text-gray-800 whitespace-pre-wrap mt-2">
            {error.stack}
          </pre>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
