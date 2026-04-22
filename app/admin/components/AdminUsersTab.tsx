import React, { useState } from 'react'
import type { AdminUser } from '@/lib/types'

interface AdminUsersTabProps {
  users: AdminUser[]
  onOpenAdd: () => void
  onOpenEdit: (user: AdminUser) => void
  onDelete: (id: string) => void
}

export function AdminUsersTab({
  users,
  onOpenAdd,
  onOpenEdit,
  onDelete
}: AdminUsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
          <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          All <span className="text-red-600">Users</span> <span className="text-xl text-gray-500 font-medium">({users.length})</span>
        </h2>
        <button
          onClick={onOpenAdd}
          className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add User
        </button>
      </div>
      
      {/* Search Box */}
      {users.length > 0 && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by name or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found. Click &quot;🔄 Reload&quot; or &quot;+ Add User&quot; to create one.
        </div>
      )}
      {users.length > 0 && (
        <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
          <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
          <thead className="bg-orange-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y-2 divide-gray-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-primary-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{user.full_name || 'No name'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{user.email || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">{user.phone_number || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                    user.role === 'sales' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    'bg-green-100 text-green-800 border-green-300'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                  {user.customer?.company_name || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                  <button
                    onClick={() => onOpenEdit(user)}
                    className="text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(user.id)}
                    className="text-secondary-600 hover:text-secondary-800 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
