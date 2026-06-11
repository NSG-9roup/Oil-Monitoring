import { useState, useMemo } from 'react'
import OilDropLoader from '@/app/components/OilDropLoader'

interface EmailLog {
  id: string
  recipient_email: string
  subject: string
  status: 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed'
  resend_id?: string
  error_details?: string
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

interface AdminEmailLogsTabProps {
  logs: EmailLog[]
  loading: boolean
  onRefresh: () => void
}

const STATUS_BADGES: Record<string, string> = {
  sent: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  opened: 'bg-blue-50 text-blue-700 border-blue-200',
  bounced: 'bg-orange-50 text-orange-700 border-orange-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

export default function AdminEmailLogsTab({ logs, loading, onRefresh }: AdminEmailLogsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null)

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.resend_id || '').toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || log.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [logs, searchQuery, statusFilter])

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">Email Delivery Logs</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Monitor real-time system email notifications and deliverability reports
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-250 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
          </svg>
          Refresh Logs
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-[1.5rem]">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipient email or subject..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl text-xs font-semibold text-slate-800 transition-all outline-none"
          />
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl text-xs font-semibold text-slate-850 transition-all outline-none cursor-pointer"
          >
            <option value="all">All Delivery Statuses</option>
            <option value="sent">Sent (Initial Dispatch)</option>
            <option value="delivered">Delivered Successfully</option>
            <option value="opened">Opened / Clicked</option>
            <option value="bounced">Bounced</option>
            <option value="failed">Failed to Send</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-slate-450 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Email Subject</th>
                <th className="px-6 py-4">Resend ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <OilDropLoader compact label="Loading email logs..." className="text-orange-500" />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic text-xs">
                    No email log records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-900 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700 max-w-[200px] truncate" title={log.recipient_email}>
                      {log.recipient_email}
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800 max-w-[250px] truncate" title={log.subject}>
                      {log.subject}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-mono text-slate-400 whitespace-nowrap">
                      {log.resend_id || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${STATUS_BADGES[log.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs font-bold text-slate-800 hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-fast">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-pop-micro">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Email Log Details</h3>
                <p className="text-[9px] font-mono text-slate-400 mt-0.5">{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recipient</span>
                  <p className="font-bold text-slate-800 mt-1 break-all">{selectedLog.recipient_email}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subject</span>
                  <p className="font-bold text-slate-800 mt-1">{selectedLog.subject}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</span>
                  <p className="mt-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${STATUS_BADGES[selectedLog.status]}`}>
                      {selectedLog.status}
                    </span>
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date Sent</span>
                  <p className="font-bold text-slate-800 mt-1">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {selectedLog.resend_id && (
                <div className="bg-slate-50 p-4 rounded-xl text-xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Resend API Message ID</span>
                  <p className="font-mono font-bold text-slate-700 mt-1 break-all">{selectedLog.resend_id}</p>
                </div>
              )}

              {selectedLog.error_details && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-xs text-red-800">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">Error details</span>
                  <p className="font-bold mt-1 leading-relaxed">{selectedLog.error_details}</p>
                </div>
              )}

              {selectedLog.metadata && (
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Raw Webhook Metadata Payload</span>
                  <pre className="bg-slate-900 text-slate-200 text-[10px] p-4 rounded-xl font-mono overflow-x-auto max-h-48 leading-relaxed">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
