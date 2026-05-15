'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { getOilTypeWaterThresholds, getOilTypeThresholds, classifyOilType, type OilType } from '@/lib/constants/oilTypeThresholds'
import { exportFleetReportPdf, exportTrustRoiSnapshotPdf, type FleetReportRow, type TrustRoiAuditRow } from '@/lib/pdf/exportFleetReport'
import type { MaintenanceAction, MaintenanceActionLog } from '@/lib/types'
import { useChartHeight } from '@/lib/hooks/useWindowSize'
import { logger } from '@/lib/logger'
import { ShortcutNavigator } from '@/app/dashboard/components/ShortcutNavigator'
import { TrendSection } from '@/app/dashboard/components/TrendSection'
import { LabReportsSection } from '@/app/dashboard/components/LabReportsSection'
import { requestLabTest } from '@/app/actions/dashboardActions'

interface Machine {
  id: string
  machine_name: string
  serial_number: string
  model: string
  location: string
  status: string
  customer_id: string
}

interface OilSample {
  id: string
  test_date: string
  viscosity_40c: number
  viscosity_100c: number
  water_content: number
  tan_value: number
  evaluation_mode?: 'oil_type_based' | 'product_specific' | 'new_oil_verification'
  product?: {
    product_name: string
    product_type: string
    baseline_viscosity_40c?: number
    baseline_viscosity_100c?: number
    baseline_tan?: number
  }
}

interface DashboardProfile {
  id: string
  full_name: string
  email: string
  role: string
  customer_id: string | null
  customer?: {
    id?: string
    company_name?: string
    status?: string
    logo_url?: string | null
  } | null
}

interface LabReport {
  id: string
  test_date: string
  test_type: string
  viscosity_40c: number
  viscosity_100c: number
  water_content: number
  tan_value: number
  notes: string
  machine_id?: string
  pdf_path?: string
  evaluation_mode?: 'oil_type_based' | 'product_specific' | 'new_oil_verification'
  product?: {
    product_name: string
    product_type: string
    baseline_viscosity_40c?: number
    baseline_viscosity_100c?: number
    baseline_tan?: number
  }
}

interface DashboardClientProps {
  user: { id: string; email?: string }
  profile: DashboardProfile
  initialMachines: Machine[]
  initialMaintenanceActions: MaintenanceAction[]
  initialLabTests: any[]
}

type TimeRange = '7d' | '30d' | '90d' | '6m' | 'custom' | 'all'
type TrendSeverity = 'Low' | 'Medium' | 'High'
type Language = 'id' | 'en'

interface TrendAlertItem {
  id: string
  parameter: 'Viscosity' | 'Water content' | 'TAN'
  severity: TrendSeverity
  title: string
  message: string
  recommendedAction: string
  chartValue: number
  chartDate: string
}

interface ReliabilityInsight {
  machineId: string
  machineName: string
  reliabilityScore: number
  riskBand: 'stable' | 'watchlist' | 'fragile'
  dataCompleteness: number
  samplingDiscipline: number
  executionReliability: number
  trendStability: number
  deteriorationSignal: boolean
  recommendation: string
}


const formatLocalDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const dashboardCopy = {
  id: {
    languageLabel: 'Bahasa Indonesia',
    languageShort: 'ID',
    languageSelector: 'Bahasa',
    welcomeBack: 'Selamat datang kembali',
    welcomeSubtitle: 'Pantau dan analisis indeks kesehatan oli armada Anda secara real-time.',
    status: 'Status',
    machines: 'Mesin',
    user: 'Pengguna',
    active: 'Aktif',
    inactive: 'Tidak aktif',
    totalLabel: 'total',
    noLocation: 'Tanpa lokasi',
    noTestData: 'Belum ada data uji',
    healthScore: 'Skor Kesehatan',
    today: 'Hari ini',
    yesterday: 'Kemarin',
    never: 'Belum pernah',
    markAsRead: 'Tandai dibaca',
    actionOverdueLabel: 'Terlambat',
    actionDuePrefix: 'Jatuh tempo',
    tbd: 'Belum ditentukan',
    dashboardAlerts: 'Peringatan dashboard',
    signOut: 'Keluar',
    alertManagementTitle: 'Manajemen Peringatan',
    alertManagementDesc: 'Fitur ini membantu tim memantau perubahan penting pada kondisi oli dan mengambil langkah pencegahan sebelum masalah menjadi kritis.',
    alertEmpty: 'Belum ada peringatan aktif. Kondisi pemantauan saat ini stabil.',
    resetInbox: 'Reset Kotak Masuk',
    alertSeverity: 'tingkat peringatan',
    alertMachine: 'Mesin',
    alertNextAction: 'Langkah berikutnya',
    exportPdfTitle: 'Ekspor Laporan Armada (PDF)',
    exportPdfDesc: 'Unduh ringkasan eksekutif dan daftar prioritas mesin dalam format premium.',
    analysisAndReports: 'Analisis & Laporan',
    oilTrend: 'Tren Oli',
    labResults: 'Hasil Lab',
    smartAlertTitle: 'Peringatan Cerdas Berbasis Tren',
    smartAlertDesc: 'Deteksi pola kenaikan, perubahan abnormal, dan kondisi yang mendekati batas kritis.',
    activeAlerts: 'peringatan tren aktif',
    actionCenter: 'Tindak Lanjuti di Action Center',
    exportFleetPdf: 'Ekspor Laporan Armada (PDF)',
    exportFleetDesc: 'Unduh ringkasan eksekutif dan daftar prioritas mesin dalam format laporan resmi.',
    exportRoiPdf: 'Ekspor Trust & ROI Snapshot',
    exportRoiDesc: 'Unduh ringkasan kepercayaan perusahaan, catatan audit, dan estimasi ROI.',
    teamManagementTitle: 'Manajemen Pengguna Perusahaan',
    teamManagementDesc: 'Kelola anggota tim perusahaan agar mereka dapat mengakses dashboard dan data pemantauan secara bersamaan.',
    teamMembersTitle: 'Daftar Pengguna Perusahaan',
    teamMembersEmpty: 'Belum ada pengguna lain yang terdaftar di perusahaan ini.',
    teamRoleCustomer: 'Pengguna Pelanggan',
    teamAddFormTitle: 'Tambah Pengguna Baru',
    teamAddFormDesc: 'Pengguna baru akan otomatis terhubung dengan profil perusahaan akun ini.',
    teamFullName: 'Nama Lengkap',
    teamEmail: 'Email',
    teamPhone: 'No. Telepon',
    teamPin: 'PIN Otorisasi',
    teamPinHint: 'Hanya pengguna dengan hak akses PIN yang dapat menambahkan anggota baru.',
    teamPassword: 'Kata Sandi',
    teamPasswordHint: 'Minimal 8 karakter, gunakan kombinasi huruf besar, kecil, dan angka.',
    teamCreateButton: 'Tambah Pengguna',
    teamCreatingButton: 'Menambahkan...',
    teamCreateSuccess: 'Pengguna perusahaan berhasil ditambahkan.',
    teamCreateError: 'Gagal menambahkan pengguna perusahaan',
    requestLab: {
      openButton: 'Ajukan Uji Lab',
      title: 'Permintaan Uji Laboratorium',
      subtitle: 'Jadwalkan pengambilan sampel oli oleh tim field sales kami di lokasi Anda.',
      machineInfo: 'Informasi Mesin',
      unregisteredMachine: 'Mesin tidak terdaftar?',
      registeredMachinePlaceholder: 'Pilih Mesin Terdaftar',
      noLocation: 'Tanpa Lokasi',
      newMachineNamePlaceholder: 'Nama Mesin Baru (Contoh: Pompa Hidrolik A)',
      modelPlaceholder: 'Model / Tipe',
      locationPlaceholder: 'Lokasi / Area',
      priorityLabel: 'Prioritas',
      preferredDateLabel: 'Rencana Tanggal Pengambilan Sampel (Opsional)',
      preferredDateHint: 'Tanggal ini akan menjadi target batas waktu (due date) pengajuan.',
      notesLabel: 'Catatan Tambahan',
      notesPlaceholder: 'Contoh: Mesin terdengar kasar, oli berbusa, atau kendala teknis lainnya.',
      sending: 'Mengirim...',
      submit: 'Kirim Permintaan',
    },
    insightTitle: 'Prioritas Mesin & Wawasan Operasional',
    insightDesc: 'Analisis cerdas untuk penilaian kesehatan, peringkat prioritas, dan rekomendasi tindakan perawatan.',
    refreshInsights: 'Perbarui Wawasan',
    criticalMachines: 'Mesin Kritis',
    warningMachines: 'Mesin Waspada',
    healthyMachines: 'Mesin Sehat',
    averageHealth: 'Rata-rata Kesehatan',
    focusCritical: (count: number) => `Perhatian segera: ${count} mesin dalam kondisi kritis. Prioritaskan pemeriksaan sumber kontaminasi dan uji ulang dalam 72 jam.`,
    focusWarning: (count: number) => `Sistem stabil namun perlu waspada: ${count} mesin membutuhkan pemantauan intensif. Jadwalkan uji verifikasi dalam 14 hari ke depan.`,
    focusHealthy: 'Kondisi sistem secara keseluruhan sehat. Lanjutkan pengambilan sampel rutin bulanan dan pastikan kontrol kontaminasi tetap terjaga.',
    maintenanceTitle: 'Pelacak Tindakan Perawatan',
    maintenanceDesc: 'Ubah wawasan dashboard menjadi tugas yang dapat didelegasikan dan dipantau oleh tim teknisi.',
    pending: 'Menunggu',
    completed: 'Selesai',
    overdue: 'Terlambat',
    actionCompletion: 'Penyelesaian Tindakan',
    pic: 'Penanggung Jawab (PIC)',
    dueDate: 'Batas Waktu',
    notes: 'Catatan',
    picPlaceholder: 'Teknisi / Engineer',
    notesPlaceholder: 'Catatan hasil observasi teknisi',
    samplingCompliance: 'Kepatuhan Sampling',
    onTime: 'tepat waktu',
    overdueSampling: 'terlambat',
    maintenancePending: 'Tindakan Menunggu',
    maintenanceCompleted: 'Tindakan Selesai',
    maintenanceOverdue: 'Tindakan Terlambat',
    maintenanceSummaryPending: 'Tugas perawatan yang masih menunggu penugasan atau penyelesaian.',
    maintenanceSummaryCompleted: 'Tugas yang telah berhasil diselesaikan oleh tim teknisi.',
    maintenanceSummaryOverdue: 'Tugas yang telah melewati batas waktu dan butuh tindak lanjut segera.',
    machineHealthTitle: 'Ringkasan Kesehatan Mesin',
    machineHealthDesc: 'Pemantauan kondisi peralatan secara real-time.',
    selectMachine: 'Pilih Mesin',
    noMachineSelectedTitle: 'Belum Ada Mesin Terpilih',
    noMachineSelectedDesc: 'Silakan pilih mesin dari daftar untuk melihat analisis data selengkapnya.',
    lastTest: 'Uji terakhir',
    lastTestLabel: 'Uji terakhir',
    statusLabel: 'Status',
    notAvailable: 'Tidak tersedia',
    daysAgo: 'hari lalu',
    unknownStatus: 'Tidak diketahui',
    noDataStatus: 'Belum ada data',
    initialSamplingAction: 'Jadwalkan pengambilan sampel awal sekarang',
    criticalLabel: 'Kritis',
    warningLabel: 'Waspada',
    normalLabel: 'Normal',
    unknownLabel: 'Tidak diketahui',
    viewDetails: 'Lihat detail',
    viewReport: 'Lihat laporan',
    timeRangeTitle: 'Rentang Waktu',
    customRange: 'Kustom',
    startDate: 'Tanggal Mulai',
    endDate: 'Tanggal Selesai',
    performanceTitle: 'Tren Performa',
    performanceDesc: 'Visualisasi metrik utama dan indikator kondisi pelumas dalam rentang waktu yang dipilih.',
    noSampleData: 'Data sampel tidak ditemukan',
    checkConsole: 'Periksa konsol browser untuk rincian debug.',
    noDataAvailable: 'Data tidak tersedia',
    trendAlertsTitle: 'Peringatan Cerdas Berbasis Tren',
    trendAlertsDesc: 'Deteksi pola anomali dan kondisi yang mendekati batas kritis secara otomatis.',
    noTrendAlerts: 'Tidak ditemukan anomali tren pada rentang waktu ini.',
    activeTrendAlerts: (count: number) => `${count} peringatan tren aktif`,
    labReportsTitle: 'Laporan Laboratorium',
    labReportsEmpty: 'Belum ada laporan laboratorium pada rentang waktu ini.',
    reportCountSuffix: (count: number) => `${count} laporan ditemukan`,
    viscosityTrend: 'Tren Viskositas',
    waterContent: 'Kandungan Air',
    tanTrend: 'Total Acid Number (TAN)',
    noMachineActions: 'Belum ada daftar tindakan untuk mesin ini.',
    maintenanceQueue: 'Antrean Prioritas Perawatan',
    samplingOverdue: (days: number) => `Sampling terlambat ${days} hari`,
    nextSamplingIn: (days: number) => `Sampling berikutnya dalam ${days} hari`,
    onSchedule: (days: number) => `Sesuai jadwal, sampling lagi dalam ${days} hari`,
    samplingInitialRequired: 'Sampling terlambat - diperlukan pengujian awal',
    completeAnalysis: 'Analisis Lengkap',
    evaluationBasedOnIndustryStandard: 'Evaluasi berdasarkan praktik standar industri pelumas',
    machineLabel: 'Mesin',
    productLabel: 'Produk',
    viscosityLabel: 'Viskositas',
    waterContentLabel: 'Kandungan Air',
    tanValueLabel: 'Nilai TAN',
    actionTemplates: {
      critical: ['Lakukan uji ulang oli', 'Periksa kebocoran seal', 'Inspeksi kondisi filter'],
      warning: ['Lakukan uji ulang oli', 'Periksa breather / sumber kontaminasi', 'Verifikasi kebersihan sampel'],
      normal: ['Jadwalkan pengambilan sampel rutin', 'Inspeksi kondisi filter', 'Catat tindak lanjut'],
    },
    trend: {
      viscosityTitle: 'Viskositas menunjukkan tren di luar batas normal',
      viscosityAction: 'Periksa temperatur operasi, risiko pengenceran (dilution), dan stabilitas kondisi oli.',
      waterTitle: 'Kandungan air menunjukkan kenaikan yang konsisten',
      waterAction: 'Periksa seal, breather, dan sumber kontaminasi. Uji ulang setelah tindakan korektif.',
      tanTitle: 'Nilai TAN naik lebih cepat dari laju normal',
      tanAction: 'Tinjau faktor oksidasi dan jadwalkan pengambilan sampel verifikasi.',
      increasingTrend: 'menunjukkan kenaikan konsisten',
      abnormalChange: 'berubah secara anomali',
      approachingCritical: 'mendekati batas kritis',
      recommendedAction: 'Tindakan yang Disarankan',
      severityLow: 'Rendah',
      severityMedium: 'Sedang',
      severityHigh: 'Tinggi',
    },
  },
  en: {
    languageLabel: 'English',
    languageShort: 'EN',
    languageSelector: 'Language',
    welcomeBack: 'Welcome back',
    welcomeSubtitle: "Monitor and analyze your fleet's oil health index in real-time.",
    status: 'Status',
    machines: 'Machines',
    user: 'User',
    active: 'Active',
    inactive: 'Inactive',
    totalLabel: 'total',
    noLocation: 'No location',
    noTestData: 'No test data',
    healthScore: 'Health Score',
    today: 'Today',
    yesterday: 'Yesterday',
    never: 'Never',
    markAsRead: 'Mark as Read',
    actionOverdueLabel: 'Overdue',
    actionDuePrefix: 'Due',
    tbd: 'TBD',
    dashboardAlerts: 'Dashboard alerts',
    signOut: 'Sign Out',
    alertManagementTitle: 'Alert Management',
    alertManagementDesc: 'Monitor critical changes in oil condition and take proactive measures before issues escalate.',
    alertEmpty: 'No active alerts. Monitoring status is currently stable.',
    resetInbox: 'Reset Inbox',
    alertSeverity: 'alert level',
    alertMachine: 'Machine',
    alertNextAction: 'Next action',
    exportPdfTitle: 'Export Fleet Report (PDF)',
    exportPdfDesc: 'Download the executive summary and machine priority queue in a premium layout.',
    analysisAndReports: 'Analysis & Reports',
    oilTrend: 'Oil Trend',
    labResults: 'Lab Results',
    smartAlertTitle: 'Trend-Based Smart Alerts',
    smartAlertDesc: 'Detect increasing patterns, abnormal changes, and values approaching critical limits.',
    activeAlerts: 'active trend alerts',
    actionCenter: 'Follow up in Action Center',
    exportFleetPdf: 'Export Fleet Report (PDF)',
    exportFleetDesc: 'Download executive summary and machine priority list in a professional report format.',
    exportRoiPdf: 'Export Trust & ROI Snapshot',
    exportRoiDesc: 'Download enterprise trust summary, audit logs, and ROI estimates.',
    teamManagementTitle: 'Company User Management',
    teamManagementDesc: 'Manage team members so they can collaborate on the dashboard and monitoring data.',
    teamMembersTitle: 'Company Users',
    teamMembersEmpty: 'No other users have been added to this company yet.',
    teamRoleCustomer: 'Customer User',
    teamAddFormTitle: 'Add New User',
    teamAddFormDesc: 'The new user will be automatically linked to this company profile.',
    teamFullName: 'Full Name',
    teamEmail: 'Email',
    teamPhone: 'Phone Number',
    teamPin: 'Authorization PIN',
    teamPinHint: 'Only users with PIN authorization can add new members.',
    teamPassword: 'Password',
    teamPasswordHint: 'At least 8 characters with a mix of uppercase, lowercase, and numbers.',
    teamCreateButton: 'Add User',
    teamCreatingButton: 'Adding...',
    teamCreateSuccess: 'Company user added successfully.',
    teamCreateError: 'Failed to add company user',
    requestLab: {
      openButton: 'Request Test Lab',
      title: 'Lab Test Request',
      subtitle: 'Schedule oil sampling pickup by our field sales team at your location.',
      machineInfo: 'Machine Information',
      unregisteredMachine: 'Unregistered machine?',
      registeredMachinePlaceholder: 'Select Registered Machine',
      noLocation: 'No Location',
      newMachineNamePlaceholder: 'New Machine Name (Example: Hydraulic Pump A)',
      modelPlaceholder: 'Model / Type',
      locationPlaceholder: 'Location / Area',
      priorityLabel: 'Priority',
      preferredDateLabel: 'Preferred Sampling Date (Optional)',
      preferredDateHint: 'This date will be saved as the request due date target.',
      notesLabel: 'Additional Notes',
      notesPlaceholder: 'Example: Machine makes rough noise, oil appears foamy, etc.',
      sending: 'Sending...',
      submit: 'Submit Request',
    },
    insightTitle: 'Machine Priority & Operational Insights',
    insightDesc: 'Early-stage intelligence for health scoring, priority ranking, and maintenance actions.',
    refreshInsights: 'Refresh Insights',
    criticalMachines: 'Critical Machines',
    warningMachines: 'Warning Machines',
    healthyMachines: 'Healthy Machines',
    averageHealth: 'Average Health',
    focusCritical: (count: number) => `Immediate attention required: ${count} machine${count === 1 ? ' is' : 's are'} in critical condition. Prioritize contamination checks and repeat sampling within 72 hours.`,
    focusWarning: (count: number) => `The system is stable but caution is needed: ${count} machine${count === 1 ? ' needs' : 's need'} closer monitoring. Schedule verification sampling within the next 14 days.`,
    focusHealthy: 'System condition is healthy overall. Continue routine monthly sampling and keep contamination prevention controls active.',
    maintenanceTitle: 'Maintenance Action Tracker',
    maintenanceDesc: 'Turn dashboard insights into assignable work items that engineers and maintenance teams can track.',
    pending: 'Pending',
    completed: 'Completed',
    overdue: 'Overdue',
    actionCompletion: 'Action completion',
    pic: 'PIC',
    dueDate: 'Due date',
    notes: 'Notes',
    picPlaceholder: 'Engineer / technician',
    notesPlaceholder: 'Technician comments or observations',
    samplingCompliance: 'Sampling Compliance',
    onTime: 'on time',
    overdueSampling: 'overdue',
    maintenancePending: 'Action Pending',
    maintenanceCompleted: 'Action Completed',
    maintenanceOverdue: 'Overdue Actions',
    maintenanceSummaryPending: 'Open maintenance tasks waiting for assignment or completion.',
    maintenanceSummaryCompleted: 'Completed actions recorded by the maintenance team.',
    maintenanceSummaryOverdue: 'Tasks that passed the due date and need immediate follow-up.',
    machineHealthTitle: 'Machine Health Overview',
    machineHealthDesc: 'Real-time monitoring of equipment condition.',
    selectMachine: 'Select Machine',
    noMachineSelectedTitle: 'No Machine Selected',
    noMachineSelectedDesc: 'Please select a machine from the list above to view its data.',
    lastTest: 'Last Test',
    lastTestLabel: 'Last test',
    statusLabel: 'Status',
    notAvailable: 'Not available',
    daysAgo: 'days ago',
    unknownStatus: 'Unknown',
    noDataStatus: 'No Data',
    initialSamplingAction: 'Schedule initial sampling now',
    criticalLabel: 'Critical',
    warningLabel: 'Warning',
    normalLabel: 'Normal',
    unknownLabel: 'Unknown',
    viewDetails: 'View Details',
    viewReport: 'View Report',
    timeRangeTitle: 'Time Range',
    customRange: 'Custom',
    startDate: 'Start Date',
    endDate: 'End Date',
    performanceTitle: 'Performance Trends',
    performanceDesc: 'Key metrics visualization and lubricant condition indicators within the selected time range.',
    noSampleData: 'No sample data available',
    checkConsole: 'Check the browser console for debug details.',
    noDataAvailable: 'No data available',
    trendAlertsTitle: 'Trend-Based Smart Alerts',
    trendAlertsDesc: 'Detect rising patterns, abnormal changes, and values approaching critical limits.',
    noTrendAlerts: 'No trend anomalies were detected in the selected time range.',
    activeTrendAlerts: (count: number) => `${count} active trend alert${count === 1 ? '' : 's'}`,
    labReportsTitle: 'Lab Reports',
    labReportsEmpty: 'No lab reports available for the selected time range',
    reportCountSuffix: (count: number) => `${count} report${count === 1 ? '' : 's'} in the selected time range`,
    viscosityTrend: 'Viscosity Trend',
    waterContent: 'Water Content',
    tanTrend: 'Total Acid Number (TAN)',
    noMachineActions: 'No machine actions available yet.',
    maintenanceQueue: 'Maintenance Priority Queue',
    samplingOverdue: (days: number) => `Sampling overdue by ${days} days`,
    nextSamplingIn: (days: number) => `Next sampling in ${days} days`,
    onSchedule: (days: number) => `On schedule, next in ${days} days`,
    samplingInitialRequired: 'Sampling overdue - initial test required',
    completeAnalysis: 'Complete Analysis',
    evaluationBasedOnIndustryStandard: 'Evaluation based on industry-standard oil practices',
    machineLabel: 'Machine',
    productLabel: 'Product',
    viscosityLabel: 'Viscosity',
    waterContentLabel: 'Water Content',
    tanValueLabel: 'TAN Value',
    actionTemplates: {
      critical: ['Retest oil', 'Check seal leakage', 'Inspect filter condition'],
      warning: ['Retest oil', 'Inspect breather / contamination source', 'Verify sample cleanliness'],
      normal: ['Schedule routine sampling', 'Inspect filter condition', 'Log follow-up notes'],
    },
    trend: {
      viscosityTitle: 'Viscosity is moving away from the normal band',
      viscosityAction: 'Check operating temperature, dilution risk, and oil stability.',
      waterTitle: 'Water content shows a consistent increase',
      waterAction: 'Inspect seals, breathers, and contamination sources. Retest after corrective action.',
      tanTitle: 'TAN is rising faster than the normal rate',
      tanAction: 'Review oxidation drivers and schedule verification sampling.',
      increasingTrend: 'shows a consistent increase',
      abnormalChange: 'changed abnormally',
      approachingCritical: 'is approaching the critical limit',
      recommendedAction: 'Recommended action',
      severityLow: 'Low',
      severityMedium: 'Medium',
      severityHigh: 'High',
    },
  },
} as const

export default function DashboardClient({
  user,
  profile,
  initialMachines,
  initialMaintenanceActions,
  initialLabTests,
}: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [language, setLanguage] = useState<Language>('id')
  const copy = dashboardCopy[language]
  const preferredMachine = useMemo(() => {
    const machineWithData = initialMachines.find((machine) =>
      (initialLabTests || []).some((test) => test.machine_id === machine.id)
    )
    return machineWithData || initialMachines[0] || null
  }, [initialMachines, initialLabTests])

  const normalizedLabTests = useMemo(() => {
    return (initialLabTests || []).map((test) => {
      const product = Array.isArray(test.product) ? test.product[0] : test.product
      return { ...test, product }
    }) as Array<OilSample & { machine_id: string }>
  }, [initialLabTests])

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(() => preferredMachine)
  const chartMachine = useMemo(() => {
    if (selectedMachine && normalizedLabTests.some((test) => test.machine_id === selectedMachine.id)) {
      return selectedMachine
    }
    return preferredMachine
  }, [normalizedLabTests, preferredMachine, selectedMachine])

  // Derive oilSamples from server-prefetched lab tests (no client fetch needed)
  const oilSamples = useMemo(() => {
    const allSorted = [...normalizedLabTests].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime())
    if (!chartMachine) return allSorted

    const selectedMachineSamples = allSorted.filter((t) => t.machine_id === chartMachine.id)
    return selectedMachineSamples.length > 0 ? selectedMachineSamples : allSorted
  }, [chartMachine, normalizedLabTests]) as OilSample[]

  const labReports = oilSamples as LabReport[]

  const activeBaselines = useMemo(() => {
    if (!chartMachine || oilSamples.length === 0) return null
    const latestWithProduct = [...oilSamples].reverse().find(s => s.product)
    if (!latestWithProduct) return null
    
    return {
      viscosity40: latestWithProduct.product?.baseline_viscosity_40c,
      viscosity100: latestWithProduct.product?.baseline_viscosity_100c,
      tan: latestWithProduct.product?.baseline_tan
    }
  }, [chartMachine, oilSamples])

  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [customDateRange, setCustomDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | undefined>()

  // Derive fleet maps from server-prefetched lab tests (no client fetch needed)
  const { latestTestByMachineId, fleetHistoryByMachineId } = useMemo(() => {
    const latestMap: Record<string, OilSample> = {}
    const historyMap: Record<string, OilSample[]> = {}
    normalizedLabTests.forEach((t) => {
      if (!historyMap[t.machine_id]) historyMap[t.machine_id] = []
      historyMap[t.machine_id].push(t)
      if (!latestMap[t.machine_id]) latestMap[t.machine_id] = t
    })
    return { latestTestByMachineId: latestMap, fleetHistoryByMachineId: historyMap }
  }, [normalizedLabTests])

  useEffect(() => {
    if (initialMachines.length === 0) {
      setSelectedMachine(null)
      return
    }

    setSelectedMachine((prev) => {
      if (prev && initialMachines.some((machine) => machine.id === prev.id) && normalizedLabTests.some((test) => test.machine_id === prev.id)) {
        return prev
      }
      const machineWithData = initialMachines.find((machine) => Boolean(latestTestByMachineId[machine.id]))
      return machineWithData || initialMachines[0]
    })
  }, [latestTestByMachineId, initialMachines, normalizedLabTests])

  const [requestForm, setRequestForm] = useState({
    machine_id: '',
    is_new_machine: false,
    new_machine_name: '',
    new_machine_model: '',
    new_machine_location: '',
    requested_date: '',
    priority: 'medium',
    notes: ''
  })
  const [requestSaving, setRequestSaving] = useState(false)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [maintenanceActions, setMaintenanceActions] = useState<MaintenanceAction[]>(initialMaintenanceActions)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [maintenanceActionLogs, setMaintenanceActionLogs] = useState<MaintenanceActionLog[]>([])
  const [activeTab, setActiveTab] = useState<'trend' | 'analysis' | 'lab'>('trend')

  const handleShortcutClick = (shortcutId: string) => {
    if (shortcutId.startsWith('trend') || shortcutId === 'trend') setActiveTab('trend')
    else if (shortcutId === 'analysis') setActiveTab('analysis')
    else if (shortcutId === 'lab') setActiveTab('lab')
  }

  const handleSendRequest = async () => {
    if (!requestForm.is_new_machine && !requestForm.machine_id) {
      alert('Silakan pilih mesin atau centang mesin baru.')
      return
    }
    if (requestForm.is_new_machine && !requestForm.new_machine_name) {
      alert('Silakan masukkan nama mesin baru.')
      return
    }

    setRequestSaving(true)
    try {
      const machineName = requestForm.is_new_machine 
        ? requestForm.new_machine_name 
        : initialMachines.find(m => m.id === requestForm.machine_id)?.machine_name || 'Unknown'

      await requestLabTest({
        machine_id: requestForm.is_new_machine ? undefined : requestForm.machine_id,
        title: `Lab Test Request: ${machineName}`,
        description: requestForm.notes,
        due_date: requestForm.requested_date || undefined,
        priority: requestForm.priority,
        is_new_machine: requestForm.is_new_machine,
        new_machine_data: requestForm.is_new_machine ? {
          machine_name: requestForm.new_machine_name,
          model: requestForm.new_machine_model,
          location: requestForm.new_machine_location
        } : undefined
      })
      
      setIsRequestModalOpen(false)
      alert('Permintaan uji lab berhasil dikirim!')
    } catch (error) {
      console.error('Request failed:', error)
      alert('Gagal mengirim permintaan.')
    } finally {
      setRequestSaving(false)
    }
  }

  // SSR-safe chart height (fixes window.innerWidth crash)
  const chartHeight = useChartHeight(200, 250, 300)

  useEffect(() => {
    // Initial maintenance actions are loaded from the server so the board stays persistent.
    setMaintenanceActions(initialMaintenanceActions)
  }, [initialMaintenanceActions])

  const toggleReport = (reportId: string) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reportId)) {
        newSet.delete(reportId)
      } else {
        newSet.add(reportId)
      }
      return newSet
    })
  }

  const handleDownloadPDF = async (pdfPath: string, testDate: string) => {
    if (!pdfPath) {
      alert('No PDF report available for this test')
      return
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('lab-reports')
        .download(pdfPath)
      
      if (error) throw error
      
      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `Lab_Report_${testDate}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error: unknown) {
      logger.error('Error downloading PDF:', error)
      alert(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Calculate Viscosity Index (VI) from ASTM D2270
  const calculateVI = (visc40: number, visc100: number) => {
    if (!visc40 || !visc100 || visc40 <= 0 || visc100 <= 0) return null
    
    // Simplified VI calculation (actual standard uses lookup tables)
    // This is approximate formula for VI 0-100 range
    const L = 0.8353 * Math.pow(visc40, 2) + 14.67 * visc40 - 216
    const H = 0.1684 * Math.pow(visc40, 2) + 11.85 * visc40 - 97
    const VI = ((L - visc100) / (L - H)) * 100
    
    return Math.round(Math.max(0, Math.min(200, VI))) // Clamp between 0-200
  }

  /**
   * Get water content thresholds based on oil type
   * 
   * EVALUATION MODE: oil_type_based
   * Returns industry-standard thresholds for different oil types.
   * These thresholds are used for user communication and status determination.
   * 
   * Logic Flow:
   * 1. Classify product_type string → normalized oil_type (hydraulic, turbine, gear, etc.)
   * 2. Look up thresholds for that oil_type
   * 3. Return thresholds (always the same for same oil_type)
   * 
   * @param productType - Product type from database (e.g., "Hydraulic Oil ISO VG 46")
   * @returns Water threshold object { warning, critical }
   */
  const getWaterThresholds = (productType: string): { warning: number; critical: number } => {
    return getOilTypeWaterThresholds(productType || '')
  }

  /**
   * Get normalized oil type from product type string
   * This centralizes all string->oilType classification logic
   */
  const getOilType = (productType: string): OilType => {
    return classifyOilType(productType || '')
  }

  /**
   * Calculate machine health score (0-100)
   * 
   * EVALUATION MODES:
   * - 'product_specific': Use baseline values if available, fallback to oil_type_based
   * - 'oil_type_based': Use industry-standard thresholds only
   * - 'new_oil_verification': Same as oil_type_based (no baseline expected)
   * - null/undefined: Default to oil_type_based
   * 
   * Score deductions are applied progressively:
   * - Viscosity change: -40 (critical), -20 (warning), -10 (caution)
   * - Viscosity Index: -30 (poor), -15 (fair)
   * - Water content: -30 (critical), -15 (warning), -5 (note)
   * - TAN increase: -30 (critical), -15 (warning), -5 (caution)
   * - Test age penalty: -20 (>90d), -10 (>60d), -5 (>30d)
   */
  const calculateHealthScore = (test: OilSample | LabReport | null) => {
    if (!test) return null
    let score = 100
    
    // ============================================================
    // STEP 1: Determine evaluation mode and thresholds
    // ============================================================
    const evaluationMode = test.evaluation_mode || 'oil_type_based'
    const productType = test.product?.product_type || ''
    const waterThresholds = getWaterThresholds(productType)
    const oilTypeThresholds = getOilTypeThresholds(productType)
    
    // Baseline data (if available)
    const hasBaseline = test.product?.baseline_viscosity_40c != null
    const useProductSpecific = evaluationMode === 'product_specific' && hasBaseline
    
    const baseline40 = test.product?.baseline_viscosity_40c
    const baselineTan = test.product?.baseline_tan || 0.05

    /**
     * CRITICAL: Oil type is classified ONCE at the start via classifyOilType().
     * This ensures consistency throughout the evaluation.
     * No string matching or fallback logic anywhere else in this function.
     * Current evaluation mode: oilType=[${oilType}], mode=[${evaluationMode}]
     */

    // ============================================================
    // VISCOSITY PENALTY
    // ============================================================
    if (useProductSpecific && baseline40 && test.viscosity_40c) {
      // MODE: product_specific
      // Compare current value against product baseline
      const viscChange = ((test.viscosity_40c - baseline40) / baseline40) * 100
      
      if (viscChange > 25 || viscChange < -20) score -= 40
      else if (viscChange > 15 || viscChange < -15) score -= 20
      else if (Math.abs(viscChange) > 10) score -= 10
    } else if ((evaluationMode === 'oil_type_based' || evaluationMode === 'new_oil_verification') && baseline40 && test.viscosity_40c) {
      // MODE: oil_type_based
      // SysLab percent-change thresholds (baseline required)
      const viscChange = Math.abs(((test.viscosity_40c - baseline40) / baseline40) * 100)
      const viscThresholds = oilTypeThresholds.viscosityChange

      if (viscChange > viscThresholds.critical) score -= 40
      else if (viscChange > viscThresholds.warning) score -= 20
      else if (viscChange > viscThresholds.normal) score -= 10
    }

    // ============================================================
    // VISCOSITY INDEX PENALTY (Universal - applies regardless of mode)
    // ============================================================
    if (test.viscosity_40c && test.viscosity_100c) {
      const vi = calculateVI(test.viscosity_40c, test.viscosity_100c)
      if (vi !== null) {
        if (vi < 80) score -= 30
        else if (vi < 95) score -= 15
      }
    }

    // ============================================================
    // WATER CONTENT PENALTY (Always oil_type_based thresholds)
    // ============================================================
    if (test.water_content > waterThresholds.critical) score -= 30
    else if (test.water_content > waterThresholds.warning) score -= 15
    else if (test.water_content > waterThresholds.warning * 0.5) score -= 5

    // ============================================================
    // TAN (TOTAL ACID NUMBER) PENALTY
    // ============================================================
    if (useProductSpecific && baseline40) {
      // MODE: product_specific
      // Compare against product baseline
      const tanIncrease = test.tan_value - baselineTan
      if (tanIncrease > 0.5) score -= 30
      else if (tanIncrease > 0.3) score -= 15
      else if (tanIncrease > 0.2) score -= 5
    } else if (evaluationMode === 'oil_type_based' || evaluationMode === 'new_oil_verification') {
      // MODE: oil_type_based
      // SysLab TAN increase thresholds (baseline or generic baseline)
      const tanIncrease = test.tan_value - baselineTan
      const tanThresholds = oilTypeThresholds.tanIncrease

      if (tanIncrease > tanThresholds.critical) score -= 30
      else if (tanIncrease > tanThresholds.warning) score -= 15
      else if (tanIncrease > tanThresholds.normal) score -= 5
    }

    // ============================================================
    // DAYS SINCE TEST PENALTY (Universal - applies regardless of mode)
    // ============================================================
    const daysSinceTest = Math.floor((Date.now() - new Date(test.test_date).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceTest > 90) score -= 20
    else if (daysSinceTest > 60) score -= 10
    else if (daysSinceTest > 30) score -= 5
    
    return Math.max(0, score)
  }

  /**
   * Calculate status badge for user communication (Critical/Warning/Normal)
   * 
   * EVALUATION MODE: ALWAYS oil_type_based
   * ====================================
   * This function ONLY uses industry-standard thresholds based on oil TYPE.
   * NEVER uses product-specific baselines.
   * Status is for user communication and must be consistent regardless of evaluation mode.
   * 
   * Logic Flow:
   * 1. Extract oil_type from product_type string via classifyOilType()
   * 2. Get water thresholds for that oil_type
   * 3. Evaluate test results against OIL-TYPE thresholds ONLY
   * 4. Return status badge (critical/warning/normal)
   * 
   * No fallback logic. No string matching. Deterministic.
   */
  const getStatus = (
    viscosity40c: number,
    waterContent: number,
    tanValue: number,
    product?: { product_type?: string; baseline_viscosity_40c?: number }
  ): { level: FleetReportRow['statusLevel']; color: string; text: string } => {
    // ============================================================
    // SETUP: Oil-type-based thresholds
    // ============================================================
    const productType = product?.product_type || ''
    const waterThresholds = getWaterThresholds(productType)
    const oilTypeThresholds = getOilTypeThresholds(productType)
    
    // Generic TAN baseline for all oils (not product-specific)
    const baselineTan = 0.05
    
    // ============================================================
    // CRITICAL STATUS CHECKS
    // ============================================================
    // Water content exceeds critical threshold
    if (waterContent > waterThresholds.critical) {
      return { level: 'critical', color: 'red', text: 'Critical' }
    }
    
    // TAN increased significantly (SysLab oil-type based thresholds)
    if (tanValue - baselineTan > oilTypeThresholds.tanIncrease.critical) {
      return { level: 'critical', color: 'red', text: 'Critical' }
    }
    
    // Viscosity is abnormal (percent change from baseline)
    if (product?.baseline_viscosity_40c && viscosity40c) {
      const viscChange = Math.abs(((viscosity40c - product.baseline_viscosity_40c) / product.baseline_viscosity_40c) * 100)
      if (viscChange > oilTypeThresholds.viscosityChange.critical) {
        return { level: 'critical', color: 'red', text: 'Critical' }
      }
    }
    
    // ============================================================
    // WARNING STATUS CHECKS
    // ============================================================
    // Water content between warning and critical
    if (waterContent > waterThresholds.warning) {
      return { level: 'warning', color: 'yellow', text: 'Warning' }
    }
    
    // TAN increased moderately (SysLab oil-type based thresholds)
    if (tanValue - baselineTan > oilTypeThresholds.tanIncrease.normal) {
      return { level: 'warning', color: 'yellow', text: 'Warning' }
    }
    
    // Viscosity elevated but not critical (percent change from baseline)
    if (product?.baseline_viscosity_40c && viscosity40c) {
      const viscChange = Math.abs(((viscosity40c - product.baseline_viscosity_40c) / product.baseline_viscosity_40c) * 100)
      if (viscChange > oilTypeThresholds.viscosityChange.normal) {
        return { level: 'warning', color: 'yellow', text: 'Warning' }
      }
    }
    
    // ============================================================
    // NORMAL STATUS
    // ============================================================
    return { level: 'normal', color: 'green', text: 'Normal' }
  }

  // Calculate trend compared to previous test
  const getTrend = (currentValue: number, previousValue: number | null) => {
    if (!previousValue) return { direction: 'stable', icon: '→', color: 'gray' }
    const change = ((currentValue - previousValue) / previousValue) * 100
    if (change > 5) return { direction: 'up', icon: '↑', color: 'red' }
    if (change < -5) return { direction: 'down', icon: '↓', color: 'green' }
    return { direction: 'stable', icon: '→', color: 'gray' }
  }

  /**
   * Generate recommendations based on test results and evaluation mode
   * 
   * EVALUATION MODES:
   * - 'product_specific': Recommendations based on product baseline (if available)
   *   - Wording includes baseline comparisons and product-specific thresholds
   * - 'oil_type_based': Recommendations based on industry-standard thresholds
   *   - Wording is generic and type-specific only
   * - 'new_oil_verification': Same as oil_type_based (no baseline expected)
   * 
   * CRITICAL RULE: Recommendations MUST NOT mix modes.
   * If mode = oil_type_based, NO baseline comparisons should appear in text.
   */
  const getRecommendations = (
    viscosity40c: number,
    waterContent: number,
    tanValue: number,
    product?: {
      product_type?: string
      baseline_viscosity_40c?: number
      baseline_viscosity_100c?: number
      baseline_tan?: number
    },
    previousTest?: LabReport | null,
    evaluationMode?: string
  ) => {
    const recommendations: Array<{ icon: string; severity: 'critical' | 'warning' | 'normal'; text: string; action: string }> = []
    
    // ============================================================
    // SETUP: Determine mode and extract oil_type (ONCE)
    // ============================================================
    const productType = product?.product_type || ''
    const oilType = getOilType(productType)  // Centralized classification
    const waterThresholds = getWaterThresholds(productType)
    const oilTypeThresholds = getOilTypeThresholds(productType)
    const mode = evaluationMode || 'oil_type_based'
    const useProductSpecific = mode === 'product_specific' && product?.baseline_viscosity_40c
    
    const baseline40 = product?.baseline_viscosity_40c
    const baseline100 = product?.baseline_viscosity_100c
    const baselineTan = product?.baseline_tan || 0.05
    const waterPPM = Math.round(waterContent * 10000)

    // ============================================================
    // VISCOSITY ANALYSIS
    // ============================================================
    if (useProductSpecific && baseline40 && viscosity40c) {
      // MODE: product_specific
      // Recommendations based on baseline comparison
      const viscChange = ((viscosity40c - baseline40) / baseline40) * 100
      
      if (viscChange > 25) {
        recommendations.push({
          icon: '⚠️',
          severity: 'critical',
          text: `High viscosity increase: +${viscChange.toFixed(1)}% vs baseline [${baseline40} cSt → ${viscosity40c} cSt] - Oil oxidation or contamination`,
          action: 'Replace oil immediately and check operating temperature'
        })
      } else if (viscChange > 15) {
        recommendations.push({
          icon: '⚡',
          severity: 'warning',
          text: `Viscosity increasing: +${viscChange.toFixed(1)}% vs baseline [${baseline40} cSt → ${viscosity40c} cSt] - Oil aging progressing`,
          action: 'Schedule oil change within 2 weeks'
        })
      } else if (viscChange < -15) {
        recommendations.push({
          icon: '🔥',
          severity: 'critical',
          text: `Low viscosity: ${viscChange.toFixed(1)}% below baseline [${baseline40} cSt → ${viscosity40c} cSt] - Fuel dilution suspected`,
          action: 'Check for fuel leaks immediately - DO NOT operate'
        })
      }
    } else if ((mode === 'oil_type_based' || mode === 'new_oil_verification') && baseline40 && viscosity40c) {
      // MODE: oil_type_based
      // SysLab percent-change thresholds (baseline required)
      const viscChange = ((viscosity40c - baseline40) / baseline40) * 100
      const absChange = Math.abs(viscChange)
      const viscThresholds = oilTypeThresholds.viscosityChange

      if (absChange > viscThresholds.critical) {
        recommendations.push({
          icon: '⚠️',
          severity: 'critical',
          text: `Viscosity change critical: ${viscChange.toFixed(1)}% vs baseline [${baseline40} cSt → ${viscosity40c} cSt] - Oil oxidation or contamination`,
          action: 'Replace oil immediately and check operating temperature'
        })
      } else if (absChange > viscThresholds.warning) {
        recommendations.push({
          icon: '⚡',
          severity: 'warning',
          text: `Viscosity increasing: ${viscChange.toFixed(1)}% vs baseline [${baseline40} cSt → ${viscosity40c} cSt] - Oil aging observed`,
          action: 'Schedule oil change within 2-4 weeks'
        })
      } else if (absChange > viscThresholds.normal && viscChange < 0) {
        recommendations.push({
          icon: '🔥',
          severity: 'critical',
          text: `Viscosity decreased: ${viscChange.toFixed(1)}% vs baseline [${baseline40} cSt → ${viscosity40c} cSt] - Fuel dilution or oil thinning`,
          action: 'Check for fuel leaks immediately - DO NOT operate'
        })
      }
    }

    // ============================================================
    // VISCOSITY INDEX CHECK (Universal - applies all modes)
    // ============================================================
    if (baseline100 && viscosity40c && viscosity40c > 30 && viscosity40c < 100) {
      const currentVI = calculateVI(viscosity40c, baseline100)
      
      if (currentVI && currentVI < 85) {
        const modeNote = useProductSpecific ? ' compared to baseline' : ''
        recommendations.push({
          icon: '📉',
          severity: 'warning',
          text: `Low Viscosity Index (VI=${currentVI})${modeNote} - Oil quality degraded`,
          action: 'Consider premium oil with higher VI for next change'
        })
      }
    }

    // ============================================================
    // WATER CONTENT ANALYSIS (Always oil-type based thresholds)
    // ============================================================
    if (waterContent > waterThresholds.critical) {
      recommendations.push({
        icon: '💧',
        severity: 'critical',
        text: `High water content: ${waterPPM} PPM (critical for ${oilType} oil) - System contamination`,
        action: 'Check for coolant leaks, seal failures, or condensation issues. Drain oil filter cart.'
      })
    } else if (waterContent > waterThresholds.warning) {
      recommendations.push({
        icon: '💧',
        severity: 'warning',
        text: `Elevated water content: ${waterPPM} PPM (warning for ${oilType} oil) - Trending upward`,
        action: 'Inspect breather/vent system and check for external water ingress. Retest in 2 weeks.'
      })
    }

    // ============================================================
    // TAN (TOTAL ACID NUMBER) ANALYSIS
    // ============================================================
    if (useProductSpecific && baseline40) {
      // MODE: product_specific
      // Recommendations based on baseline comparison
      const tanIncrease = tanValue - baselineTan
      
      if (tanIncrease > 0.5) {
        recommendations.push({
          icon: '🔬',
          severity: 'critical',
          text: `High TAN increase: +${tanIncrease.toFixed(2)} mg KOH/g vs baseline [${baselineTan} → ${tanValue}] - Severe oil oxidation`,
          action: 'Replace oil immediately - oxidation accelerating rapidly'
        })
      } else if (tanIncrease > 0.3) {
        recommendations.push({
          icon: '🔬',
          severity: 'warning',
          text: `TAN increasing: +${tanIncrease.toFixed(2)} mg KOH/g vs baseline - Oil aging, oxidation proceeding`,
          action: 'Plan oil change within 1 month'
        })
      }
    } else if (mode === 'oil_type_based' || mode === 'new_oil_verification') {
      // MODE: oil_type_based
      // SysLab TAN increase thresholds (baseline or generic baseline)
      const tanIncrease = tanValue - baselineTan
      const tanThresholds = oilTypeThresholds.tanIncrease

      if (tanIncrease > tanThresholds.critical) {
        recommendations.push({
          icon: '🔬',
          severity: 'critical',
          text: `TAN increase critical: +${tanIncrease.toFixed(2)} mg KOH/g vs baseline [${baselineTan} → ${tanValue}] - Severe oil oxidation`,
          action: 'Replace oil immediately - oxidation is critical'
        })
      } else if (tanIncrease > tanThresholds.warning) {
        recommendations.push({
          icon: '🔬',
          severity: 'warning',
          text: `TAN increasing: +${tanIncrease.toFixed(2)} mg KOH/g vs baseline - Oil oxidation progressing`,
          action: 'Plan oil change within 1 month'
        })
      }
    }

    // ============================================================
    // COMBINED ISSUES (More severe when pair detected)
    // ============================================================
    const tanIncrease = tanValue - baselineTan
    if (waterContent > waterThresholds.warning && tanIncrease > 0.2) {
      recommendations.push({
        icon: '⚠️',
        severity: 'critical',
        text: 'Water + oxidation detected simultaneously - Accelerated degradation risk',
        action: 'Replace oil and fix water source - rust/corrosion risk is high, varnish buildup expected'
      })
    }

    // ============================================================
    // ALL GOOD - No issues detected
    // ============================================================
    if (recommendations.length === 0) {
      recommendations.push({
        icon: '✅',
        severity: 'normal',
        text: 'All parameters within acceptable range',
        action: 'Continue regular monitoring schedule - no action required'
      })
    }
    
    return recommendations
  }







  const buildTrendAlerts = (tests: LabReport[]): TrendAlertItem[] => {
    if (tests.length < 3) return []

    const recentTests = tests.slice(-4)
    const parameterSeries = [
      {
        key: 'Water content' as const,
        values: recentTests.map((test) => (test.water_content || 0) * 100),
        title: copy.trend.waterTitle,
        recommendedAction: copy.trend.waterAction,
      },
      {
        key: 'TAN' as const,
        values: recentTests.map((test) => test.tan_value || 0),
        title: copy.trend.tanTitle,
        recommendedAction: copy.trend.tanAction,
      },
      {
        key: 'Viscosity' as const,
        values: recentTests.map((test) => test.viscosity_40c || 0),
        title: copy.trend.viscosityTitle,
        recommendedAction: copy.trend.viscosityAction,
      },
    ]

    const alerts: TrendAlertItem[] = []

    parameterSeries.forEach((series) => {
      const values = series.values
      if (values.length < 3) return

      const latest = values[values.length - 1]
      const previous = values[values.length - 2]
      const baseline = values[0]
      const increasing = values[values.length - 3] < values[values.length - 2] && values[values.length - 2] < values[values.length - 1]
      const percentChange = baseline !== 0 ? ((latest - baseline) / Math.abs(baseline)) * 100 : 0
      const abnormalChange = Math.abs(percentChange) >= 10
      const nearCritical = series.key === 'Water content'
        ? latest >= 75
        : series.key === 'TAN'
        ? latest >= 0.7
        : latest <= previous * 0.9 || latest >= previous * 1.1

      if (increasing || abnormalChange || nearCritical) {
        const severity: TrendSeverity = abnormalChange && nearCritical ? 'High' : increasing && abnormalChange ? 'Medium' : 'Low'
        const message = increasing
          ? `${series.key} ${copy.trend.increasingTrend} over the last ${values.length} tests.`
          : abnormalChange
          ? `${series.key} ${copy.trend.abnormalChange} by ${percentChange.toFixed(1)}% compared with the earliest sample in this window.`
          : `${series.key} ${copy.trend.approachingCritical} for this machine.`

        alerts.push({
          id: `${series.key}-${tests[tests.length - 1].id}`,
          parameter: series.key,
          severity,
          title: series.title,
          message,
          recommendedAction: series.recommendedAction,
          chartValue: latest,
          chartDate: tests[tests.length - 1].test_date,
        })
      }
    })

    return alerts.slice(0, 3)
  }


  useEffect(() => {
    router.prefetch('/login')
  }, [router])


  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Filter data based on time range
  const filterByTimeRange = <T extends { test_date: string }>(data: T[]) => {
    if (timeRange === 'all') return data

    if (timeRange === 'custom') {
      const startDate = customDateRange.start ? new Date(`${customDateRange.start}T00:00:00`) : null
      const endDate = customDateRange.end ? new Date(`${customDateRange.end}T23:59:59.999`) : null

      if (!startDate && !endDate) return data

      return data.filter((item) => {
        const itemDate = new Date(item.test_date)
        if (startDate && itemDate < startDate) return false
        if (endDate && itemDate > endDate) return false
        return true
      })
    }
    
    const now = new Date()
    const cutoffDate = new Date()
    
    switch (timeRange) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7)
        break
      case '30d':
        cutoffDate.setDate(now.getDate() - 30)
        break
      case '90d':
        cutoffDate.setDate(now.getDate() - 90)
        break
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
    }
    
    return data.filter(item => new Date(item.test_date) >= cutoffDate)
  }

  const filteredSamples = filterByTimeRange(oilSamples)
  const filteredReports = filterByTimeRange(labReports)

  const machineInsights = initialMachines
    .map((machine) => {
      const latestTest = latestTestByMachineId[machine.id]
      if (!latestTest) {
        return {
          machine,
          latestTest: null,
          healthScore: null,
          status: { level: 'unknown' as const, text: copy.noDataStatus },
          daysSinceTest: null as number | null,
          priorityScore: 0,
          nextAction: copy.initialSamplingAction,
        }
      }

      const healthScore = calculateHealthScore(latestTest)
      const status = getStatus(
        latestTest.viscosity_40c || 0,
        latestTest.water_content || 0,
        latestTest.tan_value || 0,
        latestTest.product
      )
      const daysSinceTest = Math.floor((Date.now() - new Date(latestTest.test_date).getTime()) / (1000 * 60 * 60 * 24))

      let priorityScore = 0
      if (status.level === 'critical') priorityScore += 60
      else if (status.level === 'warning') priorityScore += 35
      else priorityScore += 10

      priorityScore += Math.max(0, daysSinceTest - 30)
      priorityScore += healthScore !== null ? (100 - healthScore) * 0.4 : 20

      let nextAction = 'Maintain regular monthly sampling cadence'
      if (status.level === 'critical') nextAction = 'Retest within 3 days and prepare immediate maintenance action'
      else if (status.level === 'warning') nextAction = daysSinceTest > 30 ? 'Retest now and review contamination sources' : 'Retest within 14 days'
      else if (daysSinceTest > 60) nextAction = 'Retest now to keep monitoring interval healthy'

      return {
        machine,
        latestTest,
        healthScore,
        status,
        daysSinceTest,
        priorityScore,
        nextAction,
      }
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)

  const criticalCount = machineInsights.filter((item) => item.status.level === 'critical').length
  const warningCount = machineInsights.filter((item) => item.status.level === 'warning').length
  const healthyCount = machineInsights.filter((item) => item.status.level === 'normal').length
  const avgHealthScore = machineInsights.filter((item) => item.healthScore !== null).length > 0
    ? Math.round(
        machineInsights
          .filter((item) => item.healthScore !== null)
          .reduce((acc, item) => acc + (item.healthScore || 0), 0) /
          machineInsights.filter((item) => item.healthScore !== null).length
      )
    : null

  const fleetReportRows: FleetReportRow[] = machineInsights.map((item) => ({
    machineName: item.machine.machine_name,
    location: item.machine.location || '-',
    lastTestDate: item.latestTest?.test_date || '',
    daysSinceTest: item.daysSinceTest,
    statusLevel: item.status.level,
    statusText: item.status.text,
    healthScore: item.healthScore,
    nextAction: item.nextAction,
  }))

  const selectedMachineTrendAlerts = buildTrendAlerts(filteredReports)
  const todayIso = formatLocalDateInput(new Date())

  const reliabilityInsights: ReliabilityInsight[] = machineInsights.map((item) => {
    const history = (fleetHistoryByMachineId[item.machine.id] || []).slice().sort((a, b) =>
      new Date(a.test_date).getTime() - new Date(b.test_date).getTime()
    )
    const recentHistory = history.slice(-4)
    const actionsForMachine = maintenanceActions.filter((action) => action.machine_id === item.machine.id)

    const completenessChecks = history.flatMap((entry) => [entry.viscosity_40c, entry.viscosity_100c, entry.water_content, entry.tan_value])
    const filledFields = completenessChecks.filter((value) => value !== null && value !== undefined).length
    const dataCompleteness = Math.round(
      Math.min(100, (history.length >= 4 ? 100 : history.length * 25) * 0.6 + (completenessChecks.length > 0 ? (filledFields / completenessChecks.length) * 100 : 0) * 0.4)
    )

    const daysSinceTest = item.daysSinceTest
    let samplingDiscipline = 0
    if (daysSinceTest === null) samplingDiscipline = 10
    else if (daysSinceTest <= 30) samplingDiscipline = 100
    else if (daysSinceTest <= 45) samplingDiscipline = 75
    else if (daysSinceTest <= 60) samplingDiscipline = 45
    else samplingDiscipline = 15

    if (recentHistory.length >= 3) {
      const intervals: number[] = []
      for (let index = 1; index < recentHistory.length; index += 1) {
        const prevDate = new Date(recentHistory[index - 1].test_date).getTime()
        const nextDate = new Date(recentHistory[index].test_date).getTime()
        intervals.push(Math.max(1, Math.round((nextDate - prevDate) / (1000 * 60 * 60 * 24))))
      }
      const minInterval = Math.min(...intervals)
      const maxInterval = Math.max(...intervals)
      const spreadPenalty = Math.min(35, (maxInterval - minInterval) * 1.2)
      samplingDiscipline = Math.max(0, Math.round(samplingDiscipline - spreadPenalty))
    }

    const completedActions = actionsForMachine.filter((action) => action.status === 'completed' || action.status === 'verified').length
    const verifiedActions = actionsForMachine.filter((action) => action.verification_status === 'passed').length
    const failedVerificationActions = actionsForMachine.filter((action) => action.verification_status === 'failed').length
    const executionReliability = actionsForMachine.length === 0
      ? 55
      : Math.max(
          0,
          Math.min(
            100,
            Math.round((completedActions / actionsForMachine.length) * 65 + (verifiedActions / actionsForMachine.length) * 35 - failedVerificationActions * 8)
          )
        )

    const waterSeries = recentHistory.map((entry) => (entry.water_content || 0) * 100)
    const tanSeries = recentHistory.map((entry) => entry.tan_value || 0)
    const viscSeries = recentHistory.map((entry) => entry.viscosity_40c || 0)

    const isStrictlyIncreasing = (series: number[]) => series.length >= 3 && series[0] < series[1] && series[1] < series[2]
    const waterIncreasing = isStrictlyIncreasing(waterSeries.slice(-3))
    const tanIncreasing = isStrictlyIncreasing(tanSeries.slice(-3))

    const viscChange = viscSeries.length >= 2 ? Math.abs(((viscSeries[viscSeries.length - 1] - viscSeries[0]) / Math.max(1, viscSeries[0])) * 100) : 0
    const waterChange = waterSeries.length >= 2 ? waterSeries[waterSeries.length - 1] - waterSeries[0] : 0
    const tanChange = tanSeries.length >= 2 ? tanSeries[tanSeries.length - 1] - tanSeries[0] : 0
    const deteriorationSignal = waterIncreasing || tanIncreasing || waterChange > 20 || tanChange > 0.4 || viscChange > 15

    const trendPenalty = Math.min(60, Math.max(0, Math.round(Math.abs(waterChange) * 0.8 + Math.abs(tanChange) * 30 + viscChange * 0.9)))
    const trendStability = Math.max(0, 100 - trendPenalty)

    const reliabilityScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(dataCompleteness * 0.25 + samplingDiscipline * 0.25 + executionReliability * 0.25 + trendStability * 0.25 - (deteriorationSignal ? 8 : 0))
      )
    )

    const riskBand: ReliabilityInsight['riskBand'] = reliabilityScore >= 80 ? 'stable' : reliabilityScore >= 60 ? 'watchlist' : 'fragile'
    const recommendation = riskBand === 'stable'
      ? language === 'id'
        ? 'Pertahankan ritme sampling saat ini dan lanjutkan verifikasi rutin.'
        : 'Maintain current sampling rhythm and keep routine verification.'
      : riskBand === 'watchlist'
      ? language === 'id'
        ? 'Percepat interval sampling dan pastikan action critical diverifikasi.'
        : 'Tighten sampling intervals and verify critical actions quickly.'
      : language === 'id'
      ? 'Aktifkan mode pemulihan: sampling dipercepat, action owner wajib, dan verifikasi pasca-maintenance.'
      : 'Activate recovery mode: accelerated sampling, mandatory owners, and post-maintenance verification.'

    return {
      machineId: item.machine.id,
      machineName: item.machine.machine_name,
      reliabilityScore,
      riskBand,
      dataCompleteness,
      samplingDiscipline,
      executionReliability,
      trendStability,
      deteriorationSignal,
      recommendation,
    }
  })

  const fleetReliabilityScore = reliabilityInsights.length > 0
    ? Math.round(reliabilityInsights.reduce((acc, item) => acc + item.reliabilityScore, 0) / reliabilityInsights.length)
    : 0
  const totalSpend = 0

  const assignedActionsCount = maintenanceActions.filter((action) => Boolean(action.owner_profile_id)).length
  const actionsWithDueDateCount = maintenanceActions.filter((action) => Boolean(action.due_date)).length
  const verifiedPassedCount = maintenanceActions.filter((action) => action.verification_status === 'passed').length
  const evidenceCoverageCount = maintenanceActions.filter((action) => Boolean(action.evidence_notes && action.evidence_notes.trim().length > 0)).length
  const overdueOpenCount = maintenanceActions.filter(
    (action) => Boolean(action.due_date && action.due_date < todayIso && action.status !== 'completed' && action.status !== 'verified')
  ).length

  const logEventBreakdown = maintenanceActionLogs.reduce(
    (accumulator, item) => {
      accumulator[item.event_type] = (accumulator[item.event_type] || 0) + 1
      return accumulator
    },
    {} as Record<MaintenanceActionLog['event_type'], number>
  )

  const actionCount = Math.max(1, maintenanceActions.length)
  const assignmentCoverageRate = Math.round((assignedActionsCount / actionCount) * 100)
  const dueDateCoverageRate = Math.round((actionsWithDueDateCount / actionCount) * 100)
  const verificationPassRate = Math.round((verifiedPassedCount / actionCount) * 100)
  const evidenceCoverageRate = Math.round((evidenceCoverageCount / actionCount) * 100)
  const traceabilityRate = Math.round(Math.min(100, (maintenanceActionLogs.length / (actionCount * 2)) * 100))
  const overdueRate = Math.round((overdueOpenCount / actionCount) * 100)

  const enterpriseTrustScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        assignmentCoverageRate * 0.2 +
          dueDateCoverageRate * 0.15 +
          verificationPassRate * 0.25 +
          evidenceCoverageRate * 0.15 +
          traceabilityRate * 0.25 -
          overdueRate * 0.2
      )
    )
  )

  const criticalActionsClosed = maintenanceActions.filter(
    (action) => (action.status === 'completed' || action.status === 'verified') && action.source_payload && (action.source_payload as Record<string, unknown>).severity === 'critical'
  ).length
  const warningActionsClosed = maintenanceActions.filter(
    (action) => (action.status === 'completed' || action.status === 'verified') && action.source_payload && (action.source_payload as Record<string, unknown>).severity === 'warning'
  ).length
  const avoidedDowntimeHours = criticalActionsClosed * 8 + warningActionsClosed * 4 + verifiedPassedCount * 2
  const reliabilityProgramCost = maintenanceActions.length * 250000
  const estimatedSavings = Math.round(totalSpend * 0.03 + avoidedDowntimeHours * 350000)
  const netImpact = estimatedSavings - reliabilityProgramCost
  const roiPercent = reliabilityProgramCost > 0 ? Math.round((netImpact / reliabilityProgramCost) * 100) : 0

  const handleExportFleetReport = async () => {
    await exportFleetReportPdf(
      {
        companyName: profile?.customer?.company_name || 'Customer',
        customerEmail: profile?.email || user.email || '-',
        generatedBy: profile?.full_name || profile?.email || 'Customer User',
        generatedAt: new Date(),
        criticalCount,
        warningCount,
        healthyCount,
        avgHealthScore,
      },
      fleetReportRows,
      language
    )
  }

  const handleExportTrustRoiSnapshot = async () => {
    const auditRows: TrustRoiAuditRow[] = [
      { eventType: 'created', count: logEventBreakdown.created || 0 },
      { eventType: 'updated', count: logEventBreakdown.updated || 0 },
      { eventType: 'status_changed', count: logEventBreakdown.status_changed || 0 },
      { eventType: 'assigned', count: logEventBreakdown.assigned || 0 },
      { eventType: 'completed', count: logEventBreakdown.completed || 0 },
      { eventType: 'verified', count: logEventBreakdown.verified || 0 },
      { eventType: 'reopened', count: logEventBreakdown.reopened || 0 },
    ]

    await exportTrustRoiSnapshotPdf(
      {
        companyName: profile?.customer?.company_name || 'Customer',
        customerEmail: profile?.email || user.email || '-',
        generatedBy: profile?.full_name || profile?.email || 'Customer User',
        generatedAt: new Date(),
        trustScore: enterpriseTrustScore,
        reliabilityScore: fleetReliabilityScore,
        roiPercent,
        totalSpend,
        estimatedSavings,
        netImpact,
        assignmentCoverageRate,
        dueDateCoverageRate,
        verificationPassRate,
        evidenceCoverageRate,
        traceabilityRate,
        overdueRate,
        avoidedDowntimeHours,
      },
      auditRows,
      language
    )
  }

  const chartData = filteredSamples.map((sample) => {
    const parsedDate = new Date(sample.test_date)
    const safeDate = Number.isNaN(parsedDate.getTime()) ? sample.test_date : parsedDate.toLocaleDateString()
    const safeIsoDate = Number.isNaN(parsedDate.getTime()) ? sample.test_date : parsedDate.toISOString().slice(0, 10)

    return {
      date: safeDate,
      isoDate: safeIsoDate,
      viscosity_40c: Number(sample.viscosity_40c ?? 0),
      viscosity_100c: Number(sample.viscosity_100c ?? 0),
      water: Number(sample.water_content ?? 0) * 100,
      tan: Number(sample.tan_value ?? 0),
    }
  })

  return (
    <div className="clean-ui customer-panel min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 bg-grid-pattern flex flex-col" style={{ backgroundSize: '40px 40px' }}>
      {/* Paten Header (Sticky) */}
      <div className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center gap-4">
            {/* Left: NSG Logo + Brand */}
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="https://i.imgur.com/8nqsjFz.png"
                alt="Nabel Sakha Gemilang"
                width={90}
                height={28}
                className="h-7 w-auto object-contain flex-shrink-0"
                unoptimized
              />
              <div className="hidden md:block border-l-2 border-gray-100 pl-3">
                <h1 className="text-base font-black text-gray-900 tracking-tighter">OilTrack™</h1>
              </div>
            </div>

            {/* Middle: Customer Logo */}
            <div className="hidden lg:flex flex-1 justify-center min-w-0">
              <div className="bg-gray-50/50 px-4 py-1.5 rounded-2xl border border-gray-100 flex items-center gap-3">
                {profile?.customer?.logo_url && (
                  <Image
                    src={profile.customer.logo_url}
                    alt="Customer logo"
                    width={100}
                    height={30}
                    className="h-6 w-auto object-contain"
                    unoptimized
                  />
                )}
                <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest truncate max-w-[200px]">
                  {profile?.customer?.company_name}
                </span>
              </div>
            </div>
            
            {/* Right: User Info + Actions */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Desktop Request Button */}
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="hidden xl:flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                {copy.requestLab.openButton}
              </button>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Fleet</span>
                  <span className="text-xs font-black">{initialMachines.length}</span>
                </div>

                <div className="flex items-center rounded-xl bg-gray-100 p-0.5 text-[10px] font-bold">
                  <button onClick={() => setLanguage('id')} className={`px-2 py-1 rounded-lg transition-all ${language === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>ID</button>
                  <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-lg transition-all ${language === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>EN</button>
                </div>

                <button onClick={handleSignOut} className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Paten Navigator */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3">
          <div className="bg-gray-50/30 backdrop-blur-md rounded-2xl border border-gray-100/50 shadow-sm overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="flex-1 p-1.5">
                <ShortcutNavigator
                  ariaLabel={language === 'id' ? 'Navigasi dashboard cepat' : 'Quick dashboard navigation'}
                  items={[
                    { id: 'trend', label: copy.oilTrend },
                    { id: 'analysis', label: copy.analysisAndReports },
                    { id: 'lab', label: copy.labResults },
                  ].map((shortcut) => ({
                    id: shortcut.id,
                    label: shortcut.label,
                    isActive: activeTab === shortcut.id,
                  }))}
                  onItemClick={handleShortcutClick}
                />
              </div>
              <div className="hidden md:block w-px h-6 bg-gray-200 mx-1"></div>
              <div className="flex items-center gap-1.5 p-1.5 overflow-x-auto">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mx-2 whitespace-nowrap">{copy.timeRangeTitle}</span>
                {['7d', '30d', '90d', '6m', 'all'].map((range) => (
                  <button 
                    key={range}
                    onClick={() => setTimeRange(range as any)} 
                    className={`px-3 py-1.5 rounded-lg font-black text-[9px] tracking-wide transition-all ${timeRange === range ? 'bg-slate-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col relative gap-8" style={{ scrollbarGutter: 'stable' }}>
        {/* Welcome Section */}
        <div className="animate-in fade-in slide-in-from-left-4 duration-700">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
            {copy.welcomeBack}, <span className="text-primary-600">{profile?.full_name?.split(' ')[0] || 'User'}</span>
          </h2>
          <p className="text-slate-500 font-medium mt-2 text-sm">{copy.welcomeSubtitle}</p>
        </div>

        {/* Global Machine Health Overview */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
          <div className="mb-4 flex items-end justify-between px-2">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Machine Health Overview</h2>
              <p className="text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] mt-0.5 opacity-60">Real-time condition monitoring</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">
              <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500"></div> Normal</div>
              <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-amber-500"></div> Warning</div>
              <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-red-500"></div> Critical</div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            <div className="flex flex-col lg:flex-row items-stretch min-h-[290px]">
              
              {/* LEFT SIDE: Equipment Fleet */}
              <div className="flex-1 p-5 sm:p-8 flex flex-col justify-center min-w-0 border-b lg:border-b-0 lg:border-r border-slate-50 bg-slate-50/20">
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Equipment Fleet</h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => document.getElementById('machine-list')?.scrollBy({ left: -180, behavior: 'smooth' })} className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-90"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
                    <button onClick={() => document.getElementById('machine-list')?.scrollBy({ left: 180, behavior: 'smooth' })} className="w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-90"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
                  </div>
                </div>
                
                <div id="machine-list" className="flex gap-4 overflow-x-auto pt-3 pb-6 scrollbar-hide snap-x scroll-smooth px-1">
                  {initialMachines.map((machine) => {
                    const isActive = selectedMachine?.id === machine.id
                    const latestTest = latestTestByMachineId[machine.id] || null
                    const healthScore = latestTest ? calculateHealthScore(latestTest) : null
                    const statusInfo = latestTest ? getStatus(latestTest.viscosity_40c || 0, latestTest.water_content, latestTest.tan_value, latestTest.product) : { text: 'Unknown', color: 'gray' }
                    
                    return (
                      <div
                        key={machine.id}
                        onClick={() => setSelectedMachine(machine)}
                        className={`flex-shrink-0 w-[190px] snap-start cursor-pointer transition-all duration-700 rounded-[1.5rem] p-5 border relative ${
                          isActive 
                          ? 'bg-slate-900 border-slate-900 shadow-xl scale-[1.05] -translate-y-1.5 z-10' 
                          : 'bg-white border-slate-100 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.text === 'Critical' ? 'bg-red-500' : statusInfo.text === 'Warning' ? 'bg-amber-500' : statusInfo.text === 'Normal' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          <span className={`text-[7px] font-black uppercase tracking-[0.15em] truncate ${isActive ? 'text-slate-400' : 'text-slate-300'}`}>{machine.location || 'AREA 01'}</span>
                        </div>
                        
                        <p className={`font-black text-[13px] tracking-tight leading-tight mb-0.5 whitespace-normal break-words ${isActive ? 'text-white' : 'text-slate-900'}`}>{machine.machine_name}</p>
                        
                        <div className="mt-5 flex items-baseline gap-1">
                          <span className={`text-xl font-black tracking-tighter ${isActive ? 'text-white' : 'text-slate-900'}`}>{healthScore || '--'}</span>
                          <span className={`text-[8px] font-bold opacity-30 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>/100</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* RIGHT SIDE: Detail Panel */}
              <div className="w-full lg:w-[340px] bg-white p-5 sm:p-8 flex items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-slate-50 rounded-full blur-[60px] -mr-24 -mt-24 opacity-60"></div>
                
                {selectedMachine ? (
                  <div key={selectedMachine.id} className="w-full relative z-10 animate-in fade-in slide-in-from-right-6 duration-700">
                    <div className="flex flex-col mb-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] mb-3 w-fit ${
                        latestTestByMachineId[selectedMachine.id] && getStatus(latestTestByMachineId[selectedMachine.id].viscosity_40c, latestTestByMachineId[selectedMachine.id].water_content, latestTestByMachineId[selectedMachine.id].tan_value, latestTestByMachineId[selectedMachine.id].product).text === 'Critical'
                        ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${latestTestByMachineId[selectedMachine.id] && getStatus(latestTestByMachineId[selectedMachine.id].viscosity_40c, latestTestByMachineId[selectedMachine.id].water_content, latestTestByMachineId[selectedMachine.id].tan_value, latestTestByMachineId[selectedMachine.id].product).text === 'Critical' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                        {latestTestByMachineId[selectedMachine.id] && getStatus(latestTestByMachineId[selectedMachine.id].viscosity_40c, latestTestByMachineId[selectedMachine.id].water_content, latestTestByMachineId[selectedMachine.id].tan_value, latestTestByMachineId[selectedMachine.id].product).text === 'Critical' 
                          ? 'Critical' : 'Stable'}
                      </span>
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-black text-slate-900 tracking-tighter leading-tight break-words">{selectedMachine.machine_name}</h4>
                          <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">{selectedMachine.location || 'Factory Floor'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-0.5">Health</p>
                          <div className="flex items-baseline justify-end gap-0.5">
                            <span className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                              {latestTestByMachineId[selectedMachine.id] ? calculateHealthScore(latestTestByMachineId[selectedMachine.id]) : '--'}
                            </span>
                            <span className="text-[9px] font-bold text-slate-300">/100</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50/50 p-4 rounded-[1.25rem] border border-slate-100 transition-all hover:bg-slate-50">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5">Last Analysis</p>
                        <p className="text-xl font-black text-slate-900 tracking-tight">
                          {latestTestByMachineId[selectedMachine.id]
                            ? `${Math.floor((Date.now() - new Date(latestTestByMachineId[selectedMachine.id].test_date).getTime()) / (1000 * 60 * 60 * 24))}d`
                            : '--'}
                          <span className="text-[8px] font-bold text-slate-400 ml-0.5">ago</span>
                        </p>
                      </div>
                      <div className="bg-slate-50/50 p-4 rounded-[1.25rem] border border-slate-100 transition-all hover:bg-slate-50">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5">Overall Status</p>
                        <p className={`text-xl font-black tracking-tight ${
                          latestTestByMachineId[selectedMachine.id] && getStatus(latestTestByMachineId[selectedMachine.id].viscosity_40c, latestTestByMachineId[selectedMachine.id].water_content, latestTestByMachineId[selectedMachine.id].tan_value, latestTestByMachineId[selectedMachine.id].product).text === 'Critical' 
                            ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {latestTestByMachineId[selectedMachine.id] 
                            ? getStatus(latestTestByMachineId[selectedMachine.id].viscosity_40c, latestTestByMachineId[selectedMachine.id].water_content, latestTestByMachineId[selectedMachine.id].tan_value, latestTestByMachineId[selectedMachine.id].product).text 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full text-center py-12">
                    <div className="w-12 h-12 bg-slate-50 rounded-[1.25rem] flex items-center justify-center mx-auto mb-3 border border-slate-100">
                      <svg className="w-6 h-6 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Select equipment</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content Section */}
        <div className="flex-1 relative animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 min-h-[600px]">
          {activeTab === 'trend' && (
            <div key="trend" className="w-full space-y-8">
              <TrendSection
                language={language}
                chartData={chartData}
                selectedMachineTrendAlerts={selectedMachineTrendAlerts}
                chartHeight={chartHeight}
                performanceTitle={copy.performanceTitle}
                performanceDesc={copy.performanceDesc}
                noSampleData={copy.noSampleData}
                checkConsole={copy.checkConsole}
                noDataAvailable={copy.noDataAvailable}
                trendAlertsTitle={copy.trendAlertsTitle}
                trendAlertsDesc={copy.trendAlertsDesc}
                activeTrendAlertsLabel={copy.activeTrendAlerts(selectedMachineTrendAlerts.length)}
                noTrendAlerts={copy.noTrendAlerts}
                severityLowLabel={copy.trend.severityLow}
                severityMediumLabel={copy.trend.severityMedium}
                severityHighLabel={copy.trend.severityHigh}
                recommendedActionLabel={copy.trend.recommendedAction}
                totalAnalysisCount={filteredReports.length}
                fleetHealthIndex={avgHealthScore}
                baselineViscosity40={activeBaselines?.viscosity40}
                baselineViscosity100={activeBaselines?.viscosity100}
                baselineTan={activeBaselines?.tan}
                onOpenLabDetails={() => setActiveTab('lab')}
                onOpenActionCenter={() => {}}
              />
            </div>
          )}

          {activeTab === 'analysis' && (
            <div key="analysis" className="w-full animate-in fade-in slide-in-from-right-4 duration-700 space-y-8">
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-8 sm:p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{copy.smartAlertTitle}</h2>
                    <p className="text-gray-500 font-medium mt-1">{copy.smartAlertDesc}</p>
                  </div>
                  <span className="bg-gray-100 text-gray-600 px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-wider">
                    {selectedMachineTrendAlerts.length} {language === 'id' ? 'alert tren aktif' : 'active trend alerts'}
                  </span>
                </div>

                {selectedMachineTrendAlerts.length === 0 ? (
                  <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-6 text-emerald-800 font-bold flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {copy.noTrendAlerts}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
                    {selectedMachineTrendAlerts.map((alert) => (
                      <div key={alert.id} className={`rounded-3xl border-2 p-6 transition-all hover:shadow-lg ${alert.severity === 'High' ? 'border-red-100 bg-red-50/30' : alert.severity === 'Medium' ? 'border-amber-100 bg-amber-50/30' : 'border-blue-100 bg-blue-50/30'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${alert.severity === 'High' ? 'bg-red-500 text-white' : alert.severity === 'Medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{alert.parameter}</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight mb-3">{alert.title}</h3>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">{alert.message}</p>
                        <div className="mt-6 pt-6 border-t border-gray-100">
                          <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">{copy.trend.recommendedAction}</p>
                          <p className="text-sm font-bold text-slate-800 leading-relaxed">{alert.recommendedAction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
                <button onClick={handleExportFleetReport} className="group w-full min-h-[150px] rounded-[2rem] bg-[#10172A] px-6 py-5 text-left text-white shadow-[0_18px_40px_-18px_rgba(16,23,42,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-18px_rgba(16,23,42,0.7)]">
                  <div className="flex h-full items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-[1.25rem] sm:text-[1.5rem] font-black leading-tight tracking-tight text-white">{language === 'id' ? 'Ekspor Laporan Armada (PDF)' : 'Export Fleet Report (PDF)'}</h3>
                        <span className="text-white/80 text-lg leading-none transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                      </div>
                      <p className="max-w-[28ch] text-sm leading-relaxed text-white/70 font-medium">Unduh ringkasan eksekutif dan daftar prioritas mesin dalam format premium.</p>
                    </div>
                  </div>
                </button>

                <button onClick={handleExportTrustRoiSnapshot} className="group w-full min-h-[150px] rounded-[2rem] bg-[#12A37A] px-6 py-5 text-left text-white shadow-[0_18px_40px_-18px_rgba(18,163,122,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-18px_rgba(18,163,122,0.7)]">
                  <div className="flex h-full items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-[1.25rem] sm:text-[1.5rem] font-black leading-tight tracking-tight text-white">Export Trust & ROI Snapshot</h3>
                        <span className="text-white/80 text-lg leading-none transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                      </div>
                      <p className="max-w-[28ch] text-sm leading-relaxed text-white/75 font-medium">Unduh ringkasan trust enterprise, audit event, dan estimasi ROI.</p>
                    </div>
                  </div>
                </button>

              </div>
            </div>
          )}

          {activeTab === 'lab' && (
            <div key="lab" className="animate-in fade-in slide-in-from-right-4 duration-700">
              <LabReportsSection
                title={copy.labReportsTitle}
                description={copy.reportCountSuffix(filteredReports.length)}
                reports={filteredReports}
                expandedReports={expandedReports}
                selectedMachineName={selectedMachine?.machine_name || (language === 'id' ? 'Semua Mesin' : 'All Machines')}
                criticalLabel={copy.criticalLabel}
                warningLabel={copy.warningLabel}
                normalLabel={copy.normalLabel}
                unknownLabel={copy.unknownLabel}
                viscosityLabel={copy.viscosityLabel}
                waterContentLabel={copy.waterContentLabel}
                tanValueLabel={copy.tanValueLabel}
                notAvailableLabel={copy.notAvailable}
                emptyLabel={copy.labReportsEmpty}
                completeAnalysisLabel={copy.completeAnalysis}
                evaluationLabel={copy.evaluationBasedOnIndustryStandard}
                machineLabel={copy.machineLabel}
                productLabel={copy.productLabel}
                viewReportLabel={copy.viewReport}
                onToggleReport={toggleReport}
                onOpenReportPdf={(pdfPath) => {
                  const { data } = supabase.storage.from('lab-reports').getPublicUrl(pdfPath)
                  if (data?.publicUrl) {
                    setCurrentPdfUrl(data.publicUrl)
                    setPdfViewerOpen(true)
                  }
                }}
                onDownloadReportPdf={handleDownloadPDF}
                getStatus={getStatus}
                getTrend={getTrend}
                getRecommendations={getRecommendations}
              />
            </div>
          )}

        </div>
      </main>

      {/* Floating Action Button (FAB) - Premium Glassmorphism */}
      <div className="fixed bottom-8 right-8 z-[100] group">
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="flex items-center gap-3 bg-primary-600/90 hover:bg-primary-600 backdrop-blur-md text-white px-6 py-4 rounded-[2rem] shadow-2xl shadow-primary-500/40 transition-all hover:scale-105 active:scale-95 group"
        >
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="font-black uppercase tracking-widest text-xs pr-2">{copy.requestLab.openButton}</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center"><svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Authenticated</p>
                <p className="text-xs font-bold text-gray-900">© 2026 PT Nabel Sakha Gemilang</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Authorized Distributor</p>
                <p className="text-xs font-bold text-gray-900">TotalEnergies Indonesia</p>
              </div>
              <Image src="/logos/total-energies.png" alt="TotalEnergies" width={100} height={30} className="h-10 w-auto object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
            </div>
          </div>
        </div>
      </footer>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && currentPdfUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110]" onClick={() => setPdfViewerOpen(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">PDF Report Viewer</h3>
              <button onClick={() => setPdfViewerOpen(false)} className="p-2 hover:bg-gray-200 rounded-xl transition-all"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <iframe src={currentPdfUrl} className="w-full h-full" />
          </div>
        </div>
      )}

      {/* Request Lab Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110]" onClick={() => setIsRequestModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 sm:p-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{copy.requestLab.title}</h3>
                  <p className="text-gray-500 font-medium mt-1">{copy.requestLab.subtitle}</p>
                </div>
                <button onClick={() => setIsRequestModalOpen(false)} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="space-y-6 mb-10">
                <div className="space-y-4 rounded-2xl border-2 border-gray-100 bg-gray-50/50 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{copy.requestLab.machineInfo}</span>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={requestForm.is_new_machine}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, is_new_machine: e.target.checked }))}
                        className="w-4 h-4 rounded-lg border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs font-bold text-gray-600 group-hover:text-primary-600 transition-colors">{copy.requestLab.unregisteredMachine}</span>
                    </label>
                  </div>

                  {!requestForm.is_new_machine ? (
                    <select
                      value={requestForm.machine_id}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, machine_id: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    >
                      <option value="">{copy.requestLab.registeredMachinePlaceholder}</option>
                      {initialMachines.map(m => (
                        <option key={m.id} value={m.id}>{m.machine_name} - {m.location || copy.requestLab.noLocation}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-3 animate-in fade-in duration-300">
                      <input
                        type="text"
                        placeholder={copy.requestLab.newMachineNamePlaceholder}
                        value={requestForm.new_machine_name}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, new_machine_name: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder={copy.requestLab.modelPlaceholder}
                          value={requestForm.new_machine_model}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, new_machine_model: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                        <input
                          type="text"
                          placeholder={copy.requestLab.locationPlaceholder}
                          value={requestForm.new_machine_location}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, new_machine_location: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{copy.requestLab.priorityLabel}</span>
                  <div className="flex gap-3">
                    {['low', 'medium', 'high'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setRequestForm(prev => ({ ...prev, priority: p }))}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all ${
                          requestForm.priority === p 
                            ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{copy.requestLab.preferredDateLabel}</span>
                    <input
                      type="date"
                      value={requestForm.requested_date}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, requested_date: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-500">{copy.requestLab.notesLabel}</span>
                    <textarea
                      placeholder={copy.requestLab.notesPlaceholder}
                      value={requestForm.notes}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 h-[46px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSendRequest}
                disabled={requestSaving}
                className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white py-5 text-sm font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {requestSaving ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                )}
                {requestSaving ? copy.requestLab.sending : copy.requestLab.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
