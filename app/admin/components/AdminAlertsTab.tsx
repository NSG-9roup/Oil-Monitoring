import React, { useState, useMemo } from 'react'
import type { DashboardAlert } from '@/lib/alerts/engine'
import type { Customer } from '@/lib/types'

interface AdminAlertsTabProps {
  alertQueue: DashboardAlert[]
  customers: Customer[]
  reviewedAlertIds: string[]
  emailedAlertIds: string[]
  onRefresh: () => void
  onMarkReviewed: (id: string) => void
  onSendEmail: (alert: DashboardAlert, lang: 'id' | 'en') => void
}

export function AdminAlertsTab({
  alertQueue,
  customers,
  reviewedAlertIds,
  emailedAlertIds,
  onRefresh,
  onMarkReviewed,
  onSendEmail
}: AdminAlertsTabProps) {
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'open' | 'reviewed' | 'emailed'>('all')
  const [alertCustomerFilter, setAlertCustomerFilter] = useState<string>('all')
  const [emailLanguage, setEmailLanguage] = useState<'id' | 'en'>('id')

  const filteredAlertQueue = useMemo(() => {
    return alertQueue.filter((a) => {
      if (alertSeverityFilter !== 'all' && a.severity !== alertSeverityFilter) return false
      if (alertCustomerFilter !== 'all' && a.customerId !== alertCustomerFilter) return false

      const isReviewed = reviewedAlertIds.includes(a.id)
      const isEmailed = emailedAlertIds.includes(a.id)

      if (alertStatusFilter === 'open' && (isReviewed || isEmailed)) return false
      if (alertStatusFilter === 'reviewed' && !isReviewed) return false
      if (alertStatusFilter === 'emailed' && !isEmailed) return false

      return true
    })
  }, [alertQueue, alertSeverityFilter, alertCustomerFilter, alertStatusFilter, reviewedAlertIds, emailedAlertIds])

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Alert <span className="text-red-600">Queue</span>
        </h2>
        <button
          onClick={onRefresh}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Alerts
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <select
          value={alertSeverityFilter}
          onChange={(e) => setAlertSeverityFilter(e.target.value as 'all' | 'critical' | 'warning')}
          className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
        </select>

        <select
          value={alertStatusFilter}
          onChange={(e) => setAlertStatusFilter(e.target.value as 'all' | 'open' | 'reviewed' | 'emailed')}
          className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="emailed">Emailed</option>
        </select>

        <select
          value={alertCustomerFilter}
          onChange={(e) => setAlertCustomerFilter(e.target.value)}
          className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
        >
          <option value="all">All Customers</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.company_name}</option>
          ))}
        </select>

        <select
          value={emailLanguage}
          onChange={(e) => setEmailLanguage(e.target.value as 'id' | 'en')}
          className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
        >
          <option value="id">Email Template: Bahasa Indonesia</option>
          <option value="en">Email Template: English</option>
        </select>

        <button
          onClick={() => {
            setAlertSeverityFilter('all')
            setAlertStatusFilter('all')
            setAlertCustomerFilter('all')
          }}
          className="px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100"
        >
          Reset Filters
        </button>
      </div>

      <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
        In-app alert only. Admin can review and send manual email notification when needed.
      </div>

      <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
        <table className="w-full min-w-[1080px] divide-y-2 divide-primary-200">
          <thead className="bg-orange-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Severity</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Machine</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Summary</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Next Action</th>
              <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-gray-100">
            {filteredAlertQueue.map((alertItem) => (
              <tr key={alertItem.id} className="hover:bg-primary-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${
                    alertItem.severity === 'critical'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                  }`}>
                    {alertItem.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                  <div>{alertItem.customerName}</div>
                  <div className="text-xs text-gray-500">{alertItem.customerEmail || '-'}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-800 font-bold">{alertItem.machineName}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{alertItem.message}</td>
                <td className="px-6 py-4 text-sm text-gray-700">{alertItem.recommendedAction}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-2">
                  <button
                    onClick={() => onMarkReviewed(alertItem.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                      reviewedAlertIds.includes(alertItem.id)
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {reviewedAlertIds.includes(alertItem.id) ? 'Reviewed' : 'Mark Reviewed'}
                  </button>
                  <button
                    onClick={() => onSendEmail(alertItem, emailLanguage)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                      emailedAlertIds.includes(alertItem.id)
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {emailedAlertIds.includes(alertItem.id) ? 'Email Sent' : 'Send Email Manual'}
                  </button>
                </td>
              </tr>
            ))}
            {filteredAlertQueue.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No alerts match current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
