'use client'

import React from 'react'
import type { AdminUser } from '@/lib/types'

interface AdminUsersTabProps {
  users: AdminUser[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  onOpenAdd: () => void
  onOpenEdit: (user: AdminUser) => void
  onDelete: (id: string) => void
}

export default function AdminUsersTab({
  users,
  searchQuery,
  setSearchQuery,
  onOpenAdd,
  onOpenEdit,
  onDelete
}: AdminUsersTabProps) {

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-pop-micro">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <svg className="w-8 h-8 text-orange-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            All <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Users</span>
          </h2>
          <p className="text-slate-400 font-medium text-xs mt-1">Manage corporate client team members, administrators, and field sales representatives.</p>
        </div>

        <button
          onClick={onOpenAdd}
          className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add User
        </button>
      </div>

      {/* Search Input */}
      {users.length > 0 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search users by name, email, role, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-2xl px-4 py-3 pl-10 text-xs font-semibold placeholder:text-slate-400 text-slate-900 transition-all outline-none"
          />
          <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-bold italic text-sm">
          No users registered in the system. Click &quot;Add User&quot; to create one.
        </div>
      ) : (
        /* Spacious Premium Table Layout */
        <div className="w-full overflow-auto rounded-[2rem] border border-slate-100 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] bg-white max-h-[65vh]">
          <table className="w-full min-w-[980px] divide-y divide-slate-100">
            <thead className="bg-slate-50/70 backdrop-blur-sm sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</th>
                <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</th>
                <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">System Role</th>
                <th className="px-6 py-4.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</th>
                <th className="px-6 py-4.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic text-sm">
                    No users found matching filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-indigo-50/15 transition-colors duration-200">
                    {/* Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-black text-slate-800">{user.full_name || 'No name'}</div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-500">
                      {user.email || '-'}
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-500">
                      {user.phone_number || '-'}
                    </td>

                    {/* System Role */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                        user.role === 'admin' 
                          ? 'bg-red-50 text-red-700 border-red-100' 
                          : user.role === 'sales'
                          ? 'bg-orange-50 text-orange-700 border-orange-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Company */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500">
                      {user.customer?.company_name || 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-1.5">
                      <button
                        onClick={() => onOpenEdit(user)}
                        className="inline-flex items-center px-3 py-1.5 text-slate-700 hover:text-white bg-slate-100 hover:bg-orange-500 rounded-xl transition-all duration-300"
                      >
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      
                      <button
                        onClick={() => onDelete(user.id)}
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
      )}
    </div>
  )
}
