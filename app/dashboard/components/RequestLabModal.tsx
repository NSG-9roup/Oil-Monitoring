'use client'

import { useState, useEffect } from 'react'
import type { Machine, DashboardLanguage } from '@/app/dashboard/components/types'
import { SearchableSelect } from '@/app/components/SearchableSelect'
import { Portal } from '@/app/components/Portal'

export interface RequestFormData {
  machine_id?: string
  is_new_machine: boolean
  new_machine_name?: string
  new_machine_model?: string
  new_machine_location?: string
  assigned_to_profile_id?: string
  requested_date?: string
  priority: string
  running_hours?: number | string
  running_hours_unit?: 'hours' | 'months' | 'years' | string
  notes?: string
}

export interface DashboardCopyRequestLab {
  requestLab: {
    title: string
    subtitle: string
    machineInfo: string
    unregisteredMachine: string
    registeredMachinePlaceholder: string
    noLocation: string
    newMachineNamePlaceholder: string
    modelPlaceholder: string
    locationPlaceholder: string
    priorityLabel: string
    preferredDateLabel: string
    notesLabel: string
    notesPlaceholder: string
    sending: string
    submit: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface RequestLabModalProps {
  isOpen: boolean
  onClose: () => void
  initialMachines: Machine[]
  initialSalesTeam: Array<{ id: string; full_name: string }>
  initialData?: Partial<RequestFormData>
  copy: DashboardCopyRequestLab
  language: DashboardLanguage
  onSubmit: (data: RequestFormData) => Promise<void>
  isSaving: boolean
}

export function RequestLabModal({
  isOpen,
  onClose,
  initialMachines,
  initialSalesTeam,
  initialData,
  copy,
  language,
  onSubmit,
  isSaving,
}: RequestLabModalProps) {
  const [form, setForm] = useState<RequestFormData>({
    machine_id: initialData?.machine_id || '',
    is_new_machine: initialData?.is_new_machine || false,
    new_machine_name: initialData?.new_machine_name || '',
    new_machine_model: initialData?.new_machine_model || '',
    new_machine_location: initialData?.new_machine_location || '',
    assigned_to_profile_id: initialData?.assigned_to_profile_id || '',
    requested_date: initialData?.requested_date || '',
    priority: initialData?.priority || 'medium',
    running_hours: initialData?.running_hours || '',
    running_hours_unit: initialData?.running_hours_unit || 'hours',
    notes: initialData?.notes || '',
  })

  useEffect(() => {
    if (isOpen) {
      setForm({
        machine_id: initialData?.machine_id || '',
        is_new_machine: initialData?.is_new_machine || false,
        new_machine_name: initialData?.new_machine_name || '',
        new_machine_model: initialData?.new_machine_model || '',
        new_machine_location: initialData?.new_machine_location || '',
        assigned_to_profile_id: initialData?.assigned_to_profile_id || '',
        requested_date: initialData?.requested_date || '',
        priority: initialData?.priority || 'medium',
        running_hours: initialData?.running_hours || '',
        running_hours_unit: initialData?.running_hours_unit || 'hours',
        notes: initialData?.notes || '',
      })
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleSubmit = async () => {
    await onSubmit(form)
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4 z-[120] animate-fade-fast"
        onClick={onClose}
      >
      <div
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 overflow-hidden animate-pop-micro"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white px-8 py-6 border-b border-slate-100 flex justify-between items-center text-slate-900 select-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{copy.requestLab.title}</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{copy.requestLab.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 sm:p-10">
          <div className="space-y-6 mb-8">
            {/* Machine Selection Section */}
            <div className="space-y-4 rounded-[1.5rem] border border-slate-150 bg-slate-50/50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.requestLab.machineInfo}</span>
                <label className="flex items-center gap-2 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={form.is_new_machine}
                    onChange={(e) => setForm(prev => ({ ...prev, is_new_machine: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-350 text-orange-500 focus:ring-orange-200 outline-none"
                  />
                  <span className="text-xs font-bold text-slate-600 group-hover:text-orange-600 transition-colors">{copy.requestLab.unregisteredMachine}</span>
                </label>
              </div>

              {!form.is_new_machine ? (
                <SearchableSelect
                  options={initialMachines.map(m => ({
                    value: m.id,
                    label: m.machine_name,
                    sublabel: m.location || copy.requestLab.noLocation
                  }))}
                  value={form.machine_id || ''}
                  onChange={(val) => setForm(prev => ({ ...prev, machine_id: val }))}
                  placeholder={copy.requestLab.registeredMachinePlaceholder}
                />
              ) : (
                <div className="space-y-3 animate-pop-micro">
                  <input
                    type="text"
                    placeholder={copy.requestLab.newMachineNamePlaceholder}
                    value={form.new_machine_name}
                    onChange={(e) => setForm(prev => ({ ...prev, new_machine_name: e.target.value }))}
                    className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 transition-all outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={copy.requestLab.modelPlaceholder}
                      value={form.new_machine_model}
                      onChange={(e) => setForm(prev => ({ ...prev, new_machine_model: e.target.value }))}
                      className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-gray-400 transition-all outline-none"
                    />
                    <input
                      type="text"
                      placeholder={copy.requestLab.locationPlaceholder}
                      value={form.new_machine_location}
                      onChange={(e) => setForm(prev => ({ ...prev, new_machine_location: e.target.value }))}
                      className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 transition-all outline-none"
                    />
                  </div>
                  <select
                    value={form.assigned_to_profile_id}
                    onChange={(e) => setForm(prev => ({ ...prev, assigned_to_profile_id: e.target.value }))}
                    className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 transition-all outline-none"
                  >
                    <option value="">{language === 'id' ? 'Pilih Sales (Opsional)' : 'Select Sales (Optional)'}</option>
                    {initialSalesTeam.map((sales) => (
                      <option key={sales.id} value={sales.id}>{sales.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Priority Selection Section */}
            <div className="space-y-3 select-none">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.requestLab.priorityLabel}</span>
              <div className="flex gap-3">
                {[
                  { key: 'low', label: language === 'id' ? 'Rendah' : 'Low' },
                  { key: 'medium', label: language === 'id' ? 'Sedang' : 'Medium' },
                  { key: 'high', label: language === 'id' ? 'Tinggi' : 'High' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority: key }))}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 active:scale-95 ${
                      form.priority === key 
                        ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Running Oil Hours */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {language === 'id' ? 'Durasi Pemakaian Oli (Running Hours)' : 'Oil Operating Duration'}
                </span>
                <span className="text-[9px] font-bold text-slate-400">
                  {language === 'id' ? 'Total waktu pakai sejak ganti terakhir' : 'Total operation since last change'}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={
                    form.running_hours_unit === 'months'
                      ? (language === 'id' ? 'Contoh: 6 (Bulan)' : 'e.g. 6 (Months)')
                      : form.running_hours_unit === 'years'
                      ? (language === 'id' ? 'Contoh: 2 (Tahun)' : 'e.g. 2 (Years)')
                      : (language === 'id' ? 'Contoh: 1500 (Jam)' : 'e.g. 1500 (Hours)')
                  }
                  value={form.running_hours ?? ''}
                  onChange={(e) => setForm(prev => ({ ...prev, running_hours: e.target.value }))}
                  className="flex-1 bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                />
                <select
                  value={form.running_hours_unit || 'hours'}
                  onChange={(e) => setForm(prev => ({ ...prev, running_hours_unit: e.target.value }))}
                  className="w-36 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-3 py-3 text-xs font-bold text-slate-700 transition-all outline-none cursor-pointer"
                >
                  <option value="hours">{language === 'id' ? 'Hours (Jam)' : 'Hours'}</option>
                  <option value="months">{language === 'id' ? 'Bulan (Mos)' : 'Months'}</option>
                  <option value="years">{language === 'id' ? 'Tahun (Yrs)' : 'Years'}</option>
                </select>
              </div>
            </div>

            {/* Date & Notes Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.requestLab.preferredDateLabel}</span>
                <input
                  type="date"
                  value={form.requested_date}
                  onChange={(e) => setForm(prev => ({ ...prev, requested_date: e.target.value }))}
                  className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                />
              </div>
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.requestLab.notesLabel}</span>
                <textarea
                  placeholder={copy.requestLab.notesPlaceholder}
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 placeholder:text-gray-400 transition-all outline-none h-[46px] resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
            >
              {language === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {isSaving ? copy.requestLab.sending : copy.requestLab.submit}
            </button>
          </div>
        </div>
      </div>
      </div>
    </Portal>
  )
}
