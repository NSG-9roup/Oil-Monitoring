'use client'

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
  setActiveTab: (tab: 'overview' | 'customers' | 'machines' | 'products' | 'tests' | 'users' | 'requests') => void
  formatDate: (value?: string | number | Date) => string
}

export default function AdminOverviewTab({
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
  const [language, setLanguage] = React.useState<'id' | 'en'>('id')

  React.useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('language') : 'id'
    if (stored === 'en' || stored === 'id') {
      setLanguage(stored as 'en' | 'id')
    }
  }, [])

  const activeMachines = machines.filter(m => m.status === 'active').length
  const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length
  const inactiveMachines = machines.filter(m => m.status === 'inactive').length

  // Build top customers statistics with absolute robust nested relation resolver
  const testsByCustomer = recentTests.reduce<Record<string, { name: string; count: number }>>((acc, test) => {
    const customerId = test.machine?.customer_id
    
    let companyName = 'Unknown'
    const machine = test.machine as {
      customer?: { company_name: string } | Array<{ company_name: string }>
      oil_customers?: { company_name: string } | Array<{ company_name: string }>
    } | undefined
    if (machine) {
      const cust = machine.customer || machine.oil_customers
      if (cust) {
        if (Array.isArray(cust)) {
          companyName = cust[0]?.company_name || 'Unknown'
        } else if (typeof cust === 'object') {
          companyName = cust.company_name || 'Unknown'
        }
      }
    }
    
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
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-tr from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm shadow-orange-500/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span>
            {language === 'en' ? 'System' : 'Ikhtisar'}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">
              {language === 'en' ? 'Overview' : 'Sistem'}
            </span>
          </span>
        </h2>
        <p className="text-slate-400 font-medium text-xs mt-1">
          {language === 'en' 
            ? 'Real-time corporate client accounts and industrial machinery assets stats.' 
            : 'Statistik real-time akun pelanggan korporat dan aset permesinan industri.'}
        </p>
      </div>

      {/* Stats Cards Grid (Clean, Premium, No AI Rainbow Borders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <div className="bg-white rounded-[2rem] border border-slate-100/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_40px_rgba(234,88,12,0.04)] hover:border-orange-500/15 hover:-translate-y-0.5 transition-all duration-350 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">Client Base</span>
              <p className="mt-4 text-4xl font-extrabold text-slate-800 tracking-tight">{totalCustomers}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {activeCustomers} active clients
              </p>
            </div>
            <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Machines */}
        <div className="bg-white rounded-[2rem] border border-slate-100/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_40px_rgba(234,88,12,0.04)] hover:border-orange-500/15 hover:-translate-y-0.5 transition-all duration-350 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">Assets</span>
              <p className="mt-4 text-4xl font-extrabold text-slate-800 tracking-tight">{totalMachines}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
                {activeMachines} active machinery
              </p>
            </div>
            <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Lab Tests */}
        <div className="bg-white rounded-[2rem] border border-slate-100/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_40px_rgba(234,88,12,0.04)] hover:border-orange-500/15 hover:-translate-y-0.5 transition-all duration-350 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">Diagnostics</span>
              <p className="mt-4 text-4xl font-extrabold text-slate-800 tracking-tight">{totalTests}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                Recorded reports
              </p>
            </div>
            <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-white rounded-[2rem] border border-slate-100/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_40px_rgba(234,88,12,0.04)] hover:border-orange-500/15 hover:-translate-y-0.5 transition-all duration-350 relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">Catalog</span>
              <p className="mt-4 text-4xl font-extrabold text-slate-800 tracking-tight">{products.length}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                Active lubricants
              </p>
            </div>
            <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-orange-500/20 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions (Bespoke Horizontal Ribbon - Stripe / Vercel style) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
          Quick Navigation Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => setActiveTab('customers')} 
            className="bg-slate-50/40 hover:bg-white border border-slate-100 hover:border-orange-500/25 rounded-2xl p-4 transition-all duration-350 flex items-center gap-3.5 group active:scale-98 hover:shadow-[0_8px_25px_rgba(0,0,0,0.015)]"
          >
            <div className="h-10 w-10 bg-white text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 group-hover:text-orange-500 group-hover:border-orange-100 transition-all duration-350 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-slate-700 tracking-wide block">Customers</span>
              <span className="text-[9px] font-medium text-slate-400 block truncate -mt-0.5">Manage accounts</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('machines')} 
            className="bg-slate-50/40 hover:bg-white border border-slate-100 hover:border-orange-500/25 rounded-2xl p-4 transition-all duration-350 flex items-center gap-3.5 group active:scale-98 hover:shadow-[0_8px_25px_rgba(0,0,0,0.015)]"
          >
            <div className="h-10 w-10 bg-white text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 group-hover:text-orange-500 group-hover:border-orange-100 transition-all duration-350 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-slate-700 tracking-wide block">Machines</span>
              <span className="text-[9px] font-medium text-slate-400 block truncate -mt-0.5">Asset directory</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('tests')} 
            className="bg-slate-50/40 hover:bg-white border border-slate-100 hover:border-orange-500/25 rounded-2xl p-4 transition-all duration-350 flex items-center gap-3.5 group active:scale-98 hover:shadow-[0_8px_25px_rgba(0,0,0,0.015)]"
          >
            <div className="h-10 w-10 bg-white text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 group-hover:text-orange-500 group-hover:border-orange-100 transition-all duration-350 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-slate-700 tracking-wide block">Lab Tests</span>
              <span className="text-[9px] font-medium text-slate-400 block truncate -mt-0.5">Diagnostic records</span>
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('products')} 
            className="bg-slate-50/40 hover:bg-white border border-slate-100 hover:border-orange-500/25 rounded-2xl p-4 transition-all duration-350 flex items-center gap-3.5 group active:scale-98 hover:shadow-[0_8px_25px_rgba(0,0,0,0.015)]"
          >
            <div className="h-10 w-10 bg-white text-slate-400 rounded-xl flex items-center justify-center border border-slate-100 group-hover:text-orange-500 group-hover:border-orange-100 transition-all duration-350 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-slate-700 tracking-wide block">Products</span>
              <span className="text-[9px] font-medium text-slate-400 block truncate -mt-0.5">Lubricant database</span>
            </div>
          </button>
        </div>
      </div>

      {/* Two Column Layout (Activities & Top Customers) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities card */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                Recent Test Activities
              </h3>
              <button 
                onClick={() => setActiveTab('tests')} 
                className="text-[10px] font-bold text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-wider"
              >
                {language === 'en' ? 'View All' : 'Lihat Semua'}
              </button>
            </div>
            
            <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
              {recentTests.slice(0, 8).map((test) => (
                <div 
                  key={test.id} 
                  className="flex items-center justify-between p-3.5 bg-slate-50/30 hover:bg-white border border-slate-100/60 hover:border-orange-500/10 rounded-2xl transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.01)] group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex-shrink-0 text-slate-400 group-hover:text-orange-500 group-hover:border-orange-100 transition-all duration-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{test.machine?.machine_name || 'Unknown Machine'}</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate -mt-0.5">
                        {/* Dynamic Safe Nested company name resolver */}
                        {(() => {
                          const machine = test.machine as {
                            customer?: { company_name: string } | Array<{ company_name: string }>;
                            oil_customers?: { company_name: string } | Array<{ company_name: string }>;
                          } | undefined;
                          const cust = machine?.customer || machine?.oil_customers;
                          if (Array.isArray(cust)) {
                            return cust[0]?.company_name || 'Unknown Company';
                          }
                          return cust?.company_name || 'Unknown Company';
                        })()}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 whitespace-nowrap bg-slate-100/60 px-2 py-0.5 rounded-md select-none">
                    {formatDate(test.test_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Customers card (Fully Fixed unknown names!) */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)] flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
              Top Customers by Tests
            </h3>
            
            <div className="space-y-3.5">
              {topCustomers.map(([id, data], idx) => (
                <div 
                  key={id} 
                  className="flex items-center justify-between p-3.5 bg-slate-50/30 border border-slate-100/60 rounded-2xl hover:border-orange-500/10 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.01)] group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="bg-slate-100 text-slate-500 font-bold text-xs w-8 h-8 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-tr group-hover:from-orange-500 group-hover:to-red-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-orange-500/10 transition-all duration-300">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-slate-700 text-xs truncate max-w-[200px]">{data.name}</span>
                  </div>
                  <span className="bg-orange-50 border border-orange-100/50 text-orange-600 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 select-none">
                    {data.count} tests
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Machine Status Overview (Data-Rich Corporate Asset Breakdown) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Machine Asset Status Overview
        </h3>
        
        {/* Sleek Segmented Horizontal Progress Visualizer */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex mb-8 p-0.5 border border-slate-200/20">
          {activeMachines > 0 && (
            <div 
              style={{ width: `${(activeMachines / totalMachines) * 100}%` }} 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full transition-all duration-500"
              title={`Active: ${activeMachines}`}
            />
          )}
          {maintenanceMachines > 0 && (
            <div 
              style={{ width: `${(maintenanceMachines / totalMachines) * 100}%` }} 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
              title={`Maintenance: ${maintenanceMachines}`}
            />
          )}
          {inactiveMachines > 0 && (
            <div 
              style={{ width: `${(inactiveMachines / totalMachines) * 100}%` }} 
              className="h-full bg-slate-350 rounded-r-full transition-all duration-500"
              title={`Inactive: ${inactiveMachines}`}
            />
          )}
        </div>

        {/* Clean status grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50/30 border border-slate-100/60 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/20 transition-all duration-355 hover:bg-white hover:shadow-[0_4px_25px_rgba(0,0,0,0.015)]">
            <div>
              <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Active</p>
              <p className="text-slate-800 text-2xl font-extrabold mt-1 tracking-tight">{activeMachines}</p>
            </div>
            <div className="h-9 w-9 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-slate-50/30 border border-slate-100/60 rounded-2xl p-4 flex items-center justify-between group hover:border-amber-500/20 transition-all duration-355 hover:bg-white hover:shadow-[0_4px_25px_rgba(0,0,0,0.015)]">
            <div>
              <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Maintenance</p>
              <p className="text-slate-800 text-2xl font-extrabold mt-1 tracking-tight">{maintenanceMachines}</p>
            </div>
            <div className="h-9 w-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          <div className="bg-slate-50/30 border border-slate-100/60 rounded-2xl p-4 flex items-center justify-between group hover:border-slate-350 transition-all duration-355 hover:bg-white hover:shadow-[0_4px_25px_rgba(0,0,0,0.015)]">
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Inactive</p>
              <p className="text-slate-800 text-2xl font-extrabold mt-1 tracking-tight">{inactiveMachines}</p>
            </div>
            <div className="h-9 w-9 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-slate-500 group-hover:text-white transition-all duration-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
