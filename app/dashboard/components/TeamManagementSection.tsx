import React from 'react'

interface TeamMember {
  id: string
  full_name: string
  email: string | null
  phone_number: string | null
  created_at: string
}

interface TeamManagementSectionProps {
  language: 'id' | 'en'
  profile: any
  teamMembers: TeamMember[]
  teamMemberCount: number
  teamForm: any
  setTeamForm: React.Dispatch<React.SetStateAction<any>>
  teamSaving: boolean
  handleCreateTeamUser: () => void
  onManageProfile: () => void
  copy: {
    teamManagementTitle: string
    teamManagementDesc: string
    user: string
    teamMembersTitle: string
    teamMembersEmpty: string
    teamRoleCustomer: string
    teamAddFormTitle: string
    teamAddFormDesc: string
    teamFullName: string
    teamEmail: string
    teamPhone: string
    teamPin: string
    teamPinHint: string
    teamPassword: string
    teamPasswordHint: string
    teamCreatingButton: string
    teamCreateButton: string
  }
}

export function TeamManagementSection({
  language,
  profile,
  teamMembers,
  teamMemberCount,
  teamForm,
  setTeamForm,
  teamSaving,
  handleCreateTeamUser,
  onManageProfile,
  copy
}: TeamManagementSectionProps) {
  return (
    <section style={{ order: 10 }} className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900">{copy.teamManagementTitle}</h2>
          <p className="text-gray-600 font-medium mt-1">{copy.teamManagementDesc}</p>
          <button
            type="button"
            onClick={onManageProfile}
            className="mt-3 px-3 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            {language === 'id' ? 'Kelola Profil' : 'Manage Profile'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">{teamMemberCount} {copy.user}</span>
          <span className="px-3 py-1.5 rounded-full bg-primary-100 text-primary-700">{profile?.customer?.company_name || 'N/A'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <h3 className="text-lg font-black text-gray-900 mb-3">{copy.teamMembersTitle}</h3>
          {teamMembers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-gray-600">
              {copy.teamMembersEmpty}
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{member.full_name}</p>
                      <span className="px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-[11px] font-bold uppercase tracking-wide">{copy.teamRoleCustomer}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{member.email || '-'}</p>
                    <p className="text-xs text-gray-500 mt-1">{member.phone_number || '-'}</p>
                  </div>
                  <div className="text-sm text-gray-500 md:text-right">
                    <p className="font-semibold text-gray-700">
                      {new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-US', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      }).format(new Date(member.created_at))}
                    </p>
                    <p>{copy.user}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
          <h3 className="text-lg font-black text-gray-900">{copy.teamAddFormTitle}</h3>
          <p className="text-sm text-gray-600 mt-1">{copy.teamAddFormDesc}</p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamFullName}</span>
              <input
                type="text"
                value={teamForm.full_name}
                onChange={(e) => setTeamForm((prev: any) => ({ ...prev, full_name: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamEmail}</span>
              <input
                type="email"
                value={teamForm.email}
                onChange={(e) => setTeamForm((prev: any) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamPhone}</span>
              <input
                type="tel"
                value={teamForm.phone_number}
                onChange={(e) => setTeamForm((prev: any) => ({ ...prev, phone_number: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamPin}</span>
              <input
                type="password"
                value={teamForm.admin_pin}
                onChange={(e) => setTeamForm((prev: any) => ({ ...prev, admin_pin: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">{copy.teamPinHint}</p>
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamPassword}</span>
              <input
                type="password"
                value={teamForm.password}
                onChange={(e) => setTeamForm((prev: any) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">{copy.teamPasswordHint}</p>
            </label>

            <button
              type="button"
              onClick={handleCreateTeamUser}
              disabled={teamSaving}
              className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-4 py-3 text-white font-bold shadow-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {teamSaving ? copy.teamCreatingButton : copy.teamCreateButton}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
