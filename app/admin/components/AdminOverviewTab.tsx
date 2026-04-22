import React from 'react'
import type { AdminMachine, AdminLabTest, AdminProduct } from '@/lib/types'

interface AdminOverviewTabProps {
  totalCustomers: number
  activeCustomers: number
  totalMachines: number
  machines: AdminMachine[]
  totalTests: number
  products: AdminProduct[]
  recentTests: AdminLabTest[]
  setActiveTab: (tab: 'overview' | 'customers' | 'machines' | 'products' | 'tests' | 'alerts' | 'purchases' | 'users') => void
  formatDate: (value?: string | number | Date) => string
}

export function AdminOverviewTab({
  totalCustomers,
  activeCustomers,
  totalMachines,
  machines,
  totalTests,
  products,
  recentTests,
  setActiveTab,
  formatDate
}: AdminOverviewTabProps) {
  const activeMachines = machines.filter(m => m.status === 'active').length
  const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length
  const inactiveMachines = machines.filter(m => m.status === 'inactive').length

  const testsByCustomer = recentTests.reduce<Record<string, { name: string; count: number }>>((acc, test) => {
    const customerId = test.machine?.customer_id
    const companyName = test.machine?.customer?.company_name || 'Unknown'
    if (customerId) {
      if (!acc[customerId]) {
        acc[customerId] = { name: companyName, count: 0 }
      }
      acc[customerId].count++
    }
    return acc
  }, {})

  const topCustomers = Object.entries(testsByCustomer)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)

  return (
    <div>
      <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 flex items-center gap-3">
        <svg className="w-8 h-8 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="tracking-tight">System</span>
        <span className="tracking-tight text-red-600">Overview</span>
      </h2>
      <p className="mb-6 text-sm font-medium text-gray-500">Live summary of customers, machines, tests, and products.</p>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <div className="rounded-3xl border border-orange-100/80 bg-white p-6 shadow-lg ring-1 ring-orange-50 transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Customers</p>
              <p className="mt-2 text-4xl font-black text-gray-900">{totalCustomers}</p>
              <p className="mt-2 text-xs text-gray-500">{activeCustomers} active</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100/80 bg-white p-6 shadow-lg ring-1 ring-orange-50 transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Machines</p>
              <p className="mt-2 text-4xl font-black text-gray-900">{totalMachines}</p>
              <p className="mt-2 text-xs text-gray-500">{activeMachines} active</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100/80 bg-white p-6 shadow-lg ring-1 ring-orange-50 transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Lab Tests</p>
              <p className="mt-2 text-4xl font-black text-gray-900">{totalTests}</p>
              <p className="mt-2 text-xs text-gray-500">Total recorded</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-lg ring-1 ring-orange-100 transition-all hover:-translate-y-1 hover:shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Products</p>
              <p className="mt-2 text-4xl font-black text-gray-900">{products.length}</p>
              <p className="mt-2 text-xs text-gray-500">In catalog</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => setActiveTab('customers')} className="bg-white border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group">
            <svg className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-sm font-bold text-gray-700">Add Customer</span>
          </button>
          <button onClick={() => setActiveTab('machines')} className="bg-white border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group">
            <svg className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-bold text-gray-700">Add Machine</span>
          </button>
          <button onClick={() => setActiveTab('tests')} className="bg-white border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group">
            <svg className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-bold text-gray-700">Add Test</span>
          </button>
          <button onClick={() => setActiveTab('products')} className="bg-white border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group">
            <svg className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-sm font-bold text-gray-700">Add Product</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
          <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentTests.slice(0, 8).map((test) => (
              <div key={test.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">Lab test for {test.machine?.machine_name || 'Unknown Machine'}</p>
                  <p className="text-xs text-gray-500">{formatDate(test.test_date)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
          <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
            <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Top Customers by Tests
          </h3>
          <div className="space-y-3">
            {topCustomers.map(([id, data], idx) => (
              <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 text-white font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{data.name}</span>
                </div>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
                  {data.count} tests
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
        <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Machine Status Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-700 text-sm font-bold uppercase">Active</p>
                <p className="text-green-900 text-3xl font-black mt-1">{activeMachines}</p>
              </div>
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-700 text-sm font-bold uppercase">Maintenance</p>
                <p className="text-yellow-900 text-3xl font-black mt-1">{maintenanceMachines}</p>
              </div>
              <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="bg-orange-100 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 text-sm font-bold uppercase">Inactive</p>
                <p className="text-gray-900 text-3xl font-black mt-1">{inactiveMachines}</p>
              </div>
              <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
