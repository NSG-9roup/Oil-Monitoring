'use client'

import React from 'react'
import type { AdminProduct } from '@/lib/types'

interface AdminProductsTabProps {
  products: AdminProduct[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  onOpenImport: () => void
  onOpenAdd: () => void
  onOpenEdit: (product: AdminProduct) => void
  onDelete: (id: string) => void
}

export default function AdminProductsTab({
  products,
  searchQuery,
  setSearchQuery,
  onOpenImport,
  onOpenAdd,
  onOpenEdit,
  onDelete
}: AdminProductsTabProps) {

  const filteredProducts = products.filter(product => 
    product.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.base_oil?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.viscosity_grade?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <svg className="w-8 h-8 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            All Products
          </h2>
          <p className="text-slate-400 font-medium text-xs mt-1">Manage lubricant product catalog, base oils, and specific baseline characteristics.</p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto select-none">
          <button
            onClick={onOpenImport}
            className="flex-1 sm:flex-none px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
          </button>
          
          <button
            onClick={onOpenAdd}
            className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-orange-500/10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search products by name, type, base oil, or viscosity grade..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 pl-10 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
        />
        <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>

      {/* Spacious Premium Table Layout */}
      <div className="w-full overflow-auto rounded-[2rem] border border-slate-100 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] bg-white max-h-[65vh]">
        <table className="w-full min-w-[980px] divide-y divide-slate-100">
          <thead className="bg-slate-50/70 backdrop-blur-sm sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Type</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Oil</th>
              <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Viscosity Grade</th>
              <th className="px-6 py-4.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-slate-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold italic text-sm">
                  No products found matching filters.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-indigo-50/15 transition-colors duration-200">
                  {/* Product Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-black text-slate-800">{product.product_name}</div>
                  </td>

                  {/* Product Type */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                      {product.product_type}
                    </span>
                  </td>

                  {/* Base Oil */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                    {product.base_oil || '-'}
                  </td>

                  {/* Viscosity Grade */}
                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-600">
                    {product.viscosity_grade || '-'}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-1.5">
                    <button
                      onClick={() => onOpenEdit(product)}
                      className="inline-flex items-center px-3 py-1.5 text-slate-700 hover:text-white bg-slate-100 hover:bg-orange-500 rounded-xl transition-all duration-300"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    
                    <button
                      onClick={() => onDelete(product.id)}
                      className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-500 border border-red-100 hover:border-transparent rounded-xl transition-all duration-300"
                    >
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
