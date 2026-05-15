import React, { useState } from 'react'

export interface CsvPreviewRow {
  [key: string]: string | undefined
}

interface CsvImportPreviewProps {
  data: CsvPreviewRow[]
  onConfirm: (validData: CsvPreviewRow[]) => void
  onCancel: () => void
  isLoading: boolean
  columns: string[]
}

export default function CsvImportPreview({ data, onConfirm, onCancel, isLoading, columns }: CsvImportPreviewProps) {
  const [validData] = useState<CsvPreviewRow[]>(data)

  const handleConfirm = () => {
    onConfirm(validData)
  }

  return (
    <div className="fixed inset-0 bg-gray-900/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
          <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Data Import Preview
          </h3>
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-4 text-sm">
            <p className="font-bold">Dry-Run Preview</p>
            <p>Please review the fields parsed from your uploaded CSV. You have <strong>{data.length}</strong> row(s) ready to be imported.</p>
          </div>

          <div className="overflow-x-auto max-h-[50vh] border border-gray-200 rounded-lg shadow-inner">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-100 text-gray-900 font-bold uppercase tracking-wide border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center text-gray-500">No</th>
                  {columns.map(col => (
                    <th key={col} className="px-4 py-3">{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 font-mono text-xs text-center text-gray-400">{index + 1}</td>
                    {columns.map(col => (
                      <td key={col} className="px-4 py-2 truncate max-w-[200px]" title={row[col]}>
                        {row[col] || <span className="text-gray-300 italic">Empty</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end items-center gap-3 rounded-b-2xl">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2.5 font-bold text-gray-700 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || data.length === 0}
            className="px-6 py-2.5 font-black text-white bg-primary-600 hover:bg-primary-700 active:bg-primary-800 rounded-xl transition-colors flex items-center shadow-lg shadow-primary-500/30 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Importing...
              </>
            ) : (
              `Confirm Import (${data.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
