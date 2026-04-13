'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from 'recharts'
import Image from 'next/image'
import { getOilTypeWaterThresholds, getOilTypeThresholds, classifyOilType, type OilType } from '@/lib/constants/oilTypeThresholds'
import OilDropLoader from '@/app/components/OilDropLoader'
import { exportFleetReportPdf, exportTrustRoiSnapshotPdf, type FleetReportRow, type TrustRoiAuditRow } from '@/lib/pdf/exportFleetReport'
import { buildDashboardAlerts, type DashboardAlert } from '@/lib/alerts/engine'
import type { MaintenanceAction, MaintenanceActionLog, MaintenanceActionPriority, MaintenanceActionStatus, MaintenanceVerificationStatus } from '@/lib/types'

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

interface TeamMember {
  id: string
  full_name: string
  email: string | null
  phone_number: string | null
  created_at: string
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
  initialTeamMembers: TeamMember[]
  initialMaintenanceActions: MaintenanceAction[]
  initialMaintenanceActionLogs: MaintenanceActionLog[]
  initialPurchaseHistory: PurchaseHistoryRecord[]
}

interface PurchaseHistoryRecord {
  id: string
  quantity: number
  unit_price: number
  total_price?: number | null
  status: 'completed' | 'pending' | 'cancelled'
  purchase_date: string
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

const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const dashboardCopy = {
  id: {
    languageLabel: 'Bahasa Indonesia',
    languageShort: 'ID',
    languageSelector: 'Bahasa',
    welcomeBack: 'Selamat datang kembali',
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
    dashboardAlerts: 'Alert dashboard',
    signOut: 'Keluar',
    alertManagementTitle: 'Manajemen Alert',
    alertManagementDesc: 'Manajemen alert membantu tim memantau perubahan kondisi oli yang penting dan mengambil tindakan sebelum masalah menjadi kritis.',
    alertEmpty: 'Belum ada alert aktif. Kondisi monitoring saat ini stabil.',
    resetInbox: 'Reset Inbox',
    alertSeverity: 'tingkat alert',
    alertMachine: 'Mesin',
    alertNextAction: 'Langkah berikutnya',
    exportPdfTitle: 'Ekspor Laporan Fleet (PDF)',
    exportPdfDesc: 'Unduh ringkasan eksekutif dan daftar prioritas mesin dalam format premium.',
    purchaseHistoryTitle: 'Riwayat Pembelian',
    purchaseHistoryDesc: 'Lihat catatan pembelian dan histori transaksi secara detail.',
    teamManagementTitle: 'Manajemen User Perusahaan',
    teamManagementDesc: 'Tambahkan anggota tim untuk perusahaan yang sama agar mereka bisa ikut mengakses dashboard dan data monitoring.',
    teamMembersTitle: 'Daftar User Perusahaan',
    teamMembersEmpty: 'Belum ada user lain pada perusahaan ini.',
    teamRoleCustomer: 'Customer User',
    teamAddFormTitle: 'Tambah User Baru',
    teamAddFormDesc: 'User baru akan otomatis terhubung ke perusahaan yang sama dengan akun ini.',
    teamFullName: 'Nama Lengkap',
    teamEmail: 'Email',
    teamPhone: 'No. Telepon',
    teamPin: 'PIN Otorisasi',
    teamPinHint: 'Hanya user yang punya PIN yang bisa menambah user baru.',
    teamPassword: 'Password',
    teamPasswordHint: 'Minimal 8 karakter, huruf besar, huruf kecil, dan angka.',
    teamCreateButton: 'Tambah User',
    teamCreatingButton: 'Menambahkan...',
    teamCreateSuccess: 'User perusahaan berhasil ditambahkan.',
    teamCreateError: 'Gagal menambahkan user perusahaan',
    insightTitle: 'Mesin Prioritas & Insight Operasional',
    insightDesc: 'Intelijen tahap awal untuk penilaian kesehatan, peringkat prioritas, dan tindakan maintenance.',
    refreshInsights: 'Segarkan Insight',
    criticalMachines: 'Mesin Kritis',
    warningMachines: 'Mesin Waspada',
    healthyMachines: 'Mesin Sehat',
    averageHealth: 'Rata-rata Kesehatan',
    focusCritical: (count: number) => `Butuh perhatian segera: ${count} mesin berada dalam kondisi kritis. Prioritaskan pemeriksaan sumber kontaminasi dan sampling ulang dalam 72 jam.`,
    focusWarning: (count: number) => `Kondisi sistem masih terkendali tetapi waspada: ${count} mesin perlu pemantauan lebih dekat. Jadwalkan sampling verifikasi dalam 14 hari ke depan.`,
    focusHealthy: 'Kondisi sistem sehat secara keseluruhan. Lanjutkan sampling rutin bulanan dan jaga kontrol pencegahan kontaminasi tetap aktif.',
    maintenanceTitle: 'Tracker Tindakan Maintenance',
    maintenanceDesc: 'Ubah insight dashboard menjadi pekerjaan yang bisa ditugaskan dan ditrack oleh engineer atau tim maintenance.',
    pending: 'Pending',
    completed: 'Selesai',
    overdue: 'Terlambat',
    actionCompletion: 'Penyelesaian action',
    pic: 'PIC',
    dueDate: 'Tanggal selesai',
    notes: 'Catatan',
    picPlaceholder: 'Engineer / teknisi',
    notesPlaceholder: 'Komentar atau observasi teknisi',
    samplingCompliance: 'Kepatuhan Sampling',
    onTime: 'tepat waktu',
    overdueSampling: 'terlambat',
    maintenancePending: 'Action Pending',
    maintenanceCompleted: 'Action Completed',
    maintenanceOverdue: 'Overdue Actions',
    maintenanceSummaryPending: 'Pekerjaan maintenance yang masih menunggu assignment atau penyelesaian.',
    maintenanceSummaryCompleted: 'Pekerjaan yang sudah diselesaikan oleh tim maintenance.',
    maintenanceSummaryOverdue: 'Pekerjaan yang melewati due date dan perlu tindak lanjut segera.',
    machineHealthTitle: 'Ringkasan Kesehatan Mesin',
    machineHealthDesc: 'Monitoring kondisi peralatan secara real-time.',
    selectMachine: 'Pilih Mesin',
    noMachineSelectedTitle: 'Belum ada mesin dipilih',
    noMachineSelectedDesc: 'Silakan pilih mesin dari daftar di atas untuk melihat datanya.',
    lastTest: 'Tes terakhir',
    lastTestLabel: 'Tes terakhir',
    statusLabel: 'Status',
    notAvailable: 'Tidak tersedia',
    daysAgo: 'hari lalu',
    unknownStatus: 'Tidak diketahui',
    noDataStatus: 'Belum ada data',
    initialSamplingAction: 'Jadwalkan sampling awal sekarang',
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
    performanceTitle: 'Tren Kinerja',
    performanceDesc: 'Pantau perubahan parameter kondisi oli dari waktu ke waktu.',
    noSampleData: 'Tidak ada data sampel',
    checkConsole: 'Periksa console browser untuk detail debug.',
    noDataAvailable: 'Tidak ada data tersedia',
    trendAlertsTitle: 'Alert Cerdas Berbasis Tren',
    trendAlertsDesc: 'Deteksi pola kenaikan, perubahan abnormal, dan kondisi mendekati batas kritis.',
    noTrendAlerts: 'Tidak ada anomali tren pada rentang waktu yang dipilih.',
    activeTrendAlerts: (count: number) => `${count} alert tren aktif`,
    labReportsTitle: 'Laporan Laboratorium',
    labReportsEmpty: 'Belum ada laporan laboratorium pada rentang waktu yang dipilih',
    reportCountSuffix: (count: number) => `${count} ${count === 1 ? 'laporan' : 'laporan'} pada rentang waktu ini`,
    viscosityTrend: 'Tren Viskositas',
    waterContent: 'Kandungan Air',
    tanTrend: 'Total Acid Number (TAN)',
    noMachineActions: 'Belum ada action mesin yang tersedia.',
    maintenanceQueue: 'Antrian Prioritas Maintenance',
    samplingOverdue: (days: number) => `Sampling terlambat ${days} hari`,
    nextSamplingIn: (days: number) => `Sampling berikutnya dalam ${days} hari`,
    onSchedule: (days: number) => `Sesuai jadwal, berikutnya ${days} hari lagi`,
    samplingInitialRequired: 'Sampling terlambat - test awal diperlukan',
    completeAnalysis: 'Analisis Lengkap',
    evaluationBasedOnIndustryStandard: 'Evaluasi berdasarkan praktik standar industri oli',
    machineLabel: 'Mesin',
    productLabel: 'Produk',
    viscosityLabel: 'Viskositas',
    waterContentLabel: 'Kandungan Air',
    tanValueLabel: 'Nilai TAN',
    actionTemplates: {
      critical: ['Uji ulang oil', 'Periksa kebocoran seal', 'Inspeksi kondisi filter'],
      warning: ['Uji ulang oil', 'Periksa breather / sumber kontaminasi', 'Verifikasi kebersihan sampel'],
      normal: ['Jadwalkan sampling rutin', 'Inspeksi kondisi filter', 'Catat follow-up'],
    },
    trend: {
      viscosityTitle: 'Viscosity menunjukkan tren yang bergerak dari band normal',
      viscosityAction: 'Periksa temperatur operasi, risiko dilution, dan stabilitas kondisi oil.',
      waterTitle: 'Water content menunjukkan kenaikan yang konsisten',
      waterAction: 'Periksa seal, breather, dan sumber kontaminasi. Lakukan retest setelah tindakan korektif.',
      tanTitle: 'TAN naik lebih cepat dari laju normal',
      tanAction: 'Tinjau faktor oksidasi dan jadwalkan sampling verifikasi.',
      increasingTrend: 'menunjukkan kenaikan konsisten',
      abnormalChange: 'berubah secara abnormal',
      approachingCritical: 'mendekati batas kritis',
      recommendedAction: 'Tindakan yang disarankan',
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
    alertManagementDesc: 'Alert management helps the team monitor important oil condition changes and act before issues become critical.',
    alertEmpty: 'No active alerts. Monitoring status is currently stable.',
    resetInbox: 'Reset Inbox',
    alertSeverity: 'alert level',
    alertMachine: 'Machine',
    alertNextAction: 'Next action',
    exportPdfTitle: 'Export Fleet Report (PDF)',
    exportPdfDesc: 'Download the executive summary and machine priority queue in a premium layout.',
    purchaseHistoryTitle: 'Purchase History',
    purchaseHistoryDesc: 'View detailed purchase records and transaction history.',
    teamManagementTitle: 'Company User Management',
    teamManagementDesc: 'Add team members for the same company so they can access the dashboard and monitoring data.',
    teamMembersTitle: 'Company Users',
    teamMembersEmpty: 'There are no additional users for this company yet.',
    teamRoleCustomer: 'Customer User',
    teamAddFormTitle: 'Add New User',
    teamAddFormDesc: 'The new user will automatically be linked to the same company as this account.',
    teamFullName: 'Full Name',
    teamEmail: 'Email',
    teamPhone: 'Phone Number',
    teamPin: 'Authorization PIN',
    teamPinHint: 'Only users with the PIN can add new users.',
    teamPassword: 'Password',
    teamPasswordHint: 'At least 8 characters with uppercase, lowercase, and a number.',
    teamCreateButton: 'Add User',
    teamCreatingButton: 'Adding...',
    teamCreateSuccess: 'Company user added successfully.',
    teamCreateError: 'Failed to add company user',
    insightTitle: 'Machine Priority & Operational Insights',
    insightDesc: 'Early-stage intelligence for health scoring, priority ranking, and maintenance actions.',
    refreshInsights: 'Refresh Insights',
    criticalMachines: 'Critical Machines',
    warningMachines: 'Warning Machines',
    healthyMachines: 'Healthy Machines',
    averageHealth: 'Average Health',
    focusCritical: (count: number) => `Immediate attention required: ${count} machine${count > 1 ? 's are' : ' is'} in critical condition. Prioritize contamination checks and repeat sampling within 72 hours.`,
    focusWarning: (count: number) => `The system is stable but caution is needed: ${count} machine${count > 1 ? 's need' : ' needs'} closer monitoring. Schedule verification sampling within the next 14 days.`,
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
    performanceDesc: 'Monitor how oil condition parameters change over time.',
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
  initialTeamMembers,
  initialMaintenanceActions,
  initialMaintenanceActionLogs,
  initialPurchaseHistory,
}: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const detailsRef = useRef<HTMLDivElement>(null)
  const [language, setLanguage] = useState<Language>('id')
  const copy = dashboardCopy[language]
  
  const [loading, setLoading] = useState(false)
  const [machines] = useState<Machine[]>(initialMachines)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(initialMachines[0] || null)
  const [oilSamples, setOilSamples] = useState<OilSample[]>([])
  const [labReports, setLabReports] = useState<LabReport[]>([])
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<TimeRange>('all')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | undefined>()
  const [latestTestByMachineId, setLatestTestByMachineId] = useState<Record<string, OilSample>>({})
  const [fleetHistoryByMachineId, setFleetHistoryByMachineId] = useState<Record<string, OilSample[]>>({})
  const [fleetInsightsLoading, setFleetInsightsLoading] = useState(false)
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialTeamMembers)
  const [teamForm, setTeamForm] = useState({ full_name: '', email: '', phone_number: '', admin_pin: '', password: '' })
  const [teamSaving, setTeamSaving] = useState(false)
  const [maintenanceActions, setMaintenanceActions] = useState<MaintenanceAction[]>(initialMaintenanceActions)
  const [maintenanceActionLogs] = useState<MaintenanceActionLog[]>(initialMaintenanceActionLogs)
  const [purchaseHistory] = useState<PurchaseHistoryRecord[]>(initialPurchaseHistory)
  const [actionSaving, setActionSaving] = useState(false)
  const [actionFilter, setActionFilter] = useState<'all' | MaintenanceActionStatus>('open')
  const [actionForm, setActionForm] = useState({
    machine_id: initialMachines[0]?.id || '',
    title: '',
    description: '',
    priority: 'medium' as MaintenanceActionPriority,
    due_date: '',
    owner_profile_id: '',
    alert_key: '',
  })

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem('dashboard-language') as Language | null
    if (savedLanguage === 'id' || savedLanguage === 'en') {
      setLanguage(savedLanguage)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('dashboard-language', language)
  }, [language])

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
      console.error('Error downloading PDF:', error)
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

  const handleCreateTeamUser = async () => {
    if (!teamForm.full_name.trim() || !teamForm.email.trim() || !teamForm.password.trim() || !teamForm.admin_pin.trim()) {
      alert(language === 'id' ? 'Nama, email, PIN, dan password wajib diisi.' : 'Name, email, PIN, and password are required.')
      return
    }

    setTeamSaving(true)
    try {
      const response = await fetch('/api/customer/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          full_name: teamForm.full_name.trim(),
          email: teamForm.email.trim(),
          phone_number: teamForm.phone_number.trim() || null,
          admin_pin: teamForm.admin_pin.trim(),
          password: teamForm.password,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || copy.teamCreateError)
      }

      if (payload.profile) {
        setTeamMembers((prev) => [payload.profile, ...prev])
      }
      setTeamForm({ full_name: '', email: '', phone_number: '', admin_pin: '', password: '' })
      alert(copy.teamCreateSuccess)
    } catch (error: unknown) {
      alert(`${copy.teamCreateError}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setTeamSaving(false)
    }
  }

  const refreshMaintenanceAction = async (actionId: string) => {
    const response = await fetch('/api/customer/actions')
    const payload = await response.json()

    if (!response.ok) {
      throw new Error(payload.error || 'Failed to refresh maintenance actions')
    }

    const updatedAction = (payload.actions || []).find((action: MaintenanceAction) => action.id === actionId)
    if (updatedAction) {
      setMaintenanceActions((prev) => prev.map((action) => (action.id === actionId ? updatedAction : action)))
    }
  }

  const handleUpdateMaintenanceAction = async (
    actionId: string,
    payload: {
      status?: MaintenanceActionStatus
      owner_profile_id?: string | null
      verification_status?: MaintenanceVerificationStatus
      due_date?: string | null
      evidence_notes?: string | null
    }
  ) => {
    setActionSaving(true)
    try {
      const response = await fetch('/api/customer/actions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          action_id: actionId,
          ...payload,
        }),
      })

      const responsePayload = await response.json()
      if (!response.ok) {
        throw new Error(responsePayload.error || 'Failed to update maintenance action')
      }

      if (responsePayload.action) {
        setMaintenanceActions((prev) => prev.map((action) => (action.id === actionId ? responsePayload.action : action)))
      } else {
        await refreshMaintenanceAction(actionId)
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to update maintenance action')
    } finally {
      setActionSaving(false)
    }
  }

  const handleCreateMaintenanceAction = async (overrides?: Partial<typeof actionForm> & { source_payload?: Record<string, unknown> }) => {
    const machineId = overrides?.machine_id || actionForm.machine_id
    const title = (overrides?.title || actionForm.title).trim()
    const description = (overrides?.description ?? actionForm.description).trim()
    const priority = overrides?.priority || actionForm.priority
    const dueDate = overrides?.due_date || actionForm.due_date || null
    const ownerProfileId = overrides?.owner_profile_id || actionForm.owner_profile_id || null
    const alertKey = overrides?.alert_key || actionForm.alert_key || null

    if (!machineId || !title) {
      alert(language === 'id' ? 'Pilih machine dan isi judul action.' : 'Select a machine and enter an action title.')
      return
    }

    setActionSaving(true)
    try {
      const response = await fetch('/api/customer/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          machine_id: machineId,
          title,
          description: description || null,
          priority,
          due_date: dueDate,
          owner_profile_id: ownerProfileId,
          alert_key: alertKey,
          source_payload: overrides?.source_payload || {
            created_from: 'dashboard_action_board',
          },
        }),
      })

      const responsePayload = await response.json()
      if (!response.ok) {
        throw new Error(responsePayload.error || 'Failed to create maintenance action')
      }

      if (responsePayload.action) {
        setMaintenanceActions((prev) => [responsePayload.action, ...prev.filter((action) => action.id !== responsePayload.action.id)])
      }

      setActionForm({
        machine_id: initialMachines[0]?.id || '',
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        owner_profile_id: '',
        alert_key: '',
      })
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to create maintenance action')
    } finally {
      setActionSaving(false)
    }
  }

  const handleCreateActionFromAlert = async (alertItem: DashboardAlert) => {
    const dueDate = alertItem.severity === 'critical'
      ? formatLocalDateInput(addDays(new Date(), 3))
      : alertItem.severity === 'warning'
      ? formatLocalDateInput(addDays(new Date(), 7))
      : formatLocalDateInput(addDays(new Date(), 14))

    await handleCreateMaintenanceAction({
      machine_id: alertItem.machineId,
      title: alertItem.title,
      description: `${alertItem.message}\n\n${alertItem.recommendedAction}`,
      priority: alertItem.severity === 'critical' ? 'high' : 'medium',
      due_date: dueDate,
      alert_key: alertItem.id,
      source_payload: {
        alert_id: alertItem.id,
        severity: alertItem.severity,
        machine_name: alertItem.machineName,
        next_action: alertItem.recommendedAction,
      },
    })
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

  const loadFleetInsights = useCallback(async () => {
    const machineIds = machines.map((machine) => machine.id)
    if (machineIds.length === 0) {
      setLatestTestByMachineId({})
      setFleetHistoryByMachineId({})
      return
    }

    setFleetInsightsLoading(true)
    try {
      const { data, error } = await supabase
        .from('oil_lab_tests')
        .select('id, machine_id, test_date, viscosity_40c, viscosity_100c, water_content, tan_value, evaluation_mode, product:oil_products(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)')
        .in('machine_id', machineIds)
        .order('test_date', { ascending: false })

      if (error) {
        console.error('Failed to load fleet insights:', error.message)
        setLatestTestByMachineId({})
        return
      }

      const latestMap: Record<string, OilSample> = {}
      const historyMap: Record<string, OilSample[]> = {}
      ;(data || []).forEach((test) => {
        const product = Array.isArray(test.product) ? test.product[0] : test.product
        const normalizedTest = {
          ...test,
          product,
        } as OilSample & { machine_id: string }

        if (!historyMap[normalizedTest.machine_id]) {
          historyMap[normalizedTest.machine_id] = []
        }
        historyMap[normalizedTest.machine_id].push(normalizedTest)

        if (!latestMap[normalizedTest.machine_id]) {
          latestMap[normalizedTest.machine_id] = normalizedTest
        }
      })

      setLatestTestByMachineId(latestMap)
      setFleetHistoryByMachineId(historyMap)
    } catch (error) {
      console.error('Fleet insight error:', error)
      setLatestTestByMachineId({})
      setFleetHistoryByMachineId({})
    } finally {
      setFleetInsightsLoading(false)
    }
  }, [machines, supabase])

  const loadMachineData = useCallback(async (machineId: string) => {
    setLoading(true)
    try {
      // Get lab tests (these contain the sample data for charts)
      const testsRes = await supabase
        .from('oil_lab_tests')
        .select('*, product:oil_products(product_name, product_type)')
        .eq('machine_id', machineId)
        .order('test_date', { ascending: true })

      const tests = testsRes.data || []
      setOilSamples(tests) // Lab tests ARE the samples
      setLabReports(tests) // Also use for lab reports
    } catch (error) {
      console.error('Error loading machine data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (selectedMachine) {
      loadMachineData(selectedMachine.id)
    }
  }, [loadMachineData, selectedMachine])

  useEffect(() => {
    if (machines.length > 0) {
      loadFleetInsights()
    }
  }, [loadFleetInsights, machines])

  useEffect(() => {
    router.prefetch('/purchases')
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

  const machineInsights = machines
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

  const dashboardAlerts = buildDashboardAlerts(
    machineInsights.map((item) => ({
      machineId: item.machine.id,
      customerId: profile?.customer?.id || null,
      machineName: item.machine.machine_name,
      customerName: profile?.customer?.company_name || 'Customer',
      customerEmail: profile?.email || user.email || '-',
      statusLevel: item.status.level,
      statusText: item.status.text,
      nextAction: item.nextAction,
      testDate: item.latestTest?.test_date || null,
      daysSinceTest: item.daysSinceTest,
      healthScore: item.healthScore,
    }))
  )

  const visibleAlerts = dashboardAlerts.filter((alertItem) => !dismissedAlertIds.includes(alertItem.id))

  const teamMemberCount = teamMembers.length
  const selectedMachineTrendAlerts = buildTrendAlerts(filteredReports)
  const todayIso = formatLocalDateInput(new Date())
  const maintenanceActionStats = maintenanceActions.reduce(
    (accumulator, action) => {
      const isOverdue = Boolean(action.due_date && action.due_date < todayIso && action.status !== 'completed' && action.status !== 'verified')
      if (isOverdue) accumulator.overdue += 1
      if (action.status === 'completed' || action.status === 'verified') accumulator.completed += 1
      if (action.status === 'in_progress') accumulator.inProgress += 1
      if (action.status === 'open' || action.status === 'assigned') accumulator.open += 1
      return accumulator
    },
    { open: 0, inProgress: 0, completed: 0, overdue: 0 }
  )

  const visibleMaintenanceActions = maintenanceActions.filter((action) => {
    if (actionFilter === 'all') return true
    if (actionFilter === 'open') return action.status === 'open' || action.status === 'assigned'
    if (actionFilter === 'overdue') {
      return Boolean(action.due_date && action.due_date < todayIso && action.status !== 'completed' && action.status !== 'verified')
    }
    return action.status === actionFilter
  })

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
  const fragileReliabilityCount = reliabilityInsights.filter((item) => item.riskBand === 'fragile').length
  const watchlistReliabilityCount = reliabilityInsights.filter((item) => item.riskBand === 'watchlist').length
  const deteriorationCount = reliabilityInsights.filter((item) => item.deteriorationSignal).length
  const topReliabilityRisks = reliabilityInsights
    .slice()
    .sort((a, b) => a.reliabilityScore - b.reliabilityScore)
    .slice(0, 5)

  const completedPurchases = purchaseHistory.filter((item) => item.status === 'completed')
  const totalSpend = completedPurchases.reduce(
    (sum, item) => sum + (item.total_price ?? ((item.quantity || 0) * (item.unit_price || 0))),
    0
  )

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

  const dismissAlert = (alertId: string) => {
    const found = dashboardAlerts.find((item) => item.id === alertId)
    if (!found) return

    void (async () => {
      const { error } = await supabase.from('oil_alert_actions').upsert(
        {
          alert_key: found.id,
          action_type: 'customer_read',
          actor_id: profile?.id || user.id,
          customer_id: found.customerId,
          machine_id: found.machineId,
          payload: {
            machine_name: found.machineName,
            severity: found.severity,
          },
        },
        { onConflict: 'alert_key,action_type' }
      )

      if (error) {
        alert(`Failed to save alert read status: ${error.message}`)
        return
      }

      setDismissedAlertIds((prev) => (prev.includes(alertId) ? prev : [...prev, alertId]))
    })()
  }

  const resetAlertInbox = () => {
    void (async () => {
      const { error } = await supabase
        .from('oil_alert_actions')
        .delete()
        .eq('action_type', 'customer_read')
        .eq('actor_id', profile?.id || user.id)

      if (error) {
        alert(`Failed to reset inbox: ${error.message}`)
        return
      }

      setDismissedAlertIds([])
    })()
  }

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('oil_alert_actions')
        .select('alert_key')
        .eq('action_type', 'customer_read')
        .eq('actor_id', profile?.id || user.id)

      if (error) {
        console.error('Failed to load customer alert read states:', error.message)
        return
      }

      setDismissedAlertIds((data || []).map((row) => row.alert_key))
    })()
  }, [profile?.id, supabase, user.id])

  const chartData = filteredSamples.map(sample => ({
    date: new Date(sample.test_date).toLocaleDateString(),
    viscosity_40c: sample.viscosity_40c || 0,
    viscosity_100c: sample.viscosity_100c || 0,
    water: sample.water_content ? sample.water_content * 100 : 0,
    tan: sample.tan_value || 0
  }))

  return (
    <div className="clean-ui customer-panel min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 bg-grid-pattern flex flex-col" style={{ backgroundSize: '40px 40px' }}>
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Left: NSG Logo + Brand */}
            <div className="flex items-center gap-3">
              <Image
                src="https://i.imgur.com/8nqsjFz.png"
                alt="Nabel Sakha Gemilang"
                width={132}
                height={40}
                className="h-10 w-auto object-contain"
                unoptimized
              />
              <div className="border-l-2 border-gray-300 pl-3">
                <h1 className="text-xl font-bold text-gray-800">OilTrack™</h1>
              </div>
            </div>
            
            {/* Right: User Info + Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-gray-500 text-xs">{profile?.customer?.company_name}</p>
                <p className="text-gray-800 font-medium text-sm">{profile?.email || user.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{copy.languageSelector}</span>
                <div className="flex items-center rounded-lg bg-white border border-gray-200 p-0.5 text-xs font-semibold shadow-sm">
                  <button
                    type="button"
                    onClick={() => setLanguage('id')}
                    aria-label="Bahasa Indonesia"
                    title="Bahasa Indonesia"
                    className={`px-3 py-1.5 rounded-md transition-colors text-sm ${language === 'id' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    🇮🇩
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    aria-label="English"
                    title="English"
                    className={`px-3 py-1.5 rounded-md transition-colors text-sm ${language === 'en' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    🇬🇧
                  </button>
                </div>
              </div>

              <div className="sm:hidden">
                <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  {copy.languageSelector}
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800"
                  >
                    <option value="id">🇮🇩 {copy.languageLabel}</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </label>
              </div>
              <div className="relative" title={copy.dashboardAlerts}>
                <div className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                {visibleAlerts.length > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                    {visibleAlerts.length}
                  </span>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                title={copy.signOut}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Customer Detail Card - Neuros Style */}
        <div className="mb-8 bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl shadow-xl p-8 border-2 border-gray-100 overflow-hidden relative">
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
          
          <div className="relative z-10">
            {/* Welcome Header */}
            <div className="mb-6">
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">{copy.welcomeBack}</p>
              <h1 className="text-4xl font-black text-gray-900">
                {profile?.customer?.company_name?.split(' ').map((word: string, i: number) => (
                  <span key={`${word}-${i}`} className={i > 0 && i % 2 === 0 ? 'text-red-600' : i > 0 ? 'text-orange-600' : ''}>
                    {i > 0 ? ' ' : ''}
                    {word}
                  </span>
                ))}
              </h1>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-40 h-32 rounded-2xl overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center shadow-xl p-4 hover:scale-105 transition-transform duration-300">
                  {profile?.customer?.logo_url ? (
                    <Image
                      src={profile.customer.logo_url}
                      alt={profile.customer.company_name || 'Customer logo'}
                      width={140}
                      height={96}
                      className="max-w-full max-h-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-500 to-secondary-600 rounded-xl flex items-center justify-center">
                      <span className="text-white font-black text-4xl">
                        {profile?.customer?.company_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'NA'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Status */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">{copy.status}</p>
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border-2 ${
                    profile?.customer?.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-300' 
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {profile?.customer?.status === 'active' && (
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    )}
                    {profile?.customer?.status === 'active' ? copy.active : copy.inactive}
                  </div>
                </div>

                {/* Total Machines */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">{copy.machines}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900">{machines.length}</span>
                    <span className="text-sm text-gray-500 font-semibold">{copy.totalLabel}</span>
                  </div>
                </div>

                {/* User Name */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 col-span-2 md:col-span-1">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">{copy.user}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-gray-900 truncate">{profile?.full_name || profile?.email || 'User'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                {language === 'id' ? 'Reliability Intelligence' : 'Reliability Intelligence'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'id'
                  ? 'Pantau keandalan dari kualitas sampling, kestabilan tren, dan efektivitas eksekusi maintenance.'
                  : 'Track reliability from sampling quality, trend stability, and maintenance execution effectiveness.'}
              </p>
            </div>
            <div className={`px-4 py-3 rounded-2xl border ${fleetReliabilityScore >= 80 ? 'bg-emerald-50 border-emerald-200' : fleetReliabilityScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{language === 'id' ? 'Fleet Reliability Pulse' : 'Fleet Reliability Pulse'}</p>
              <p className={`text-3xl font-black ${fleetReliabilityScore >= 80 ? 'text-emerald-700' : fleetReliabilityScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                {fleetReliabilityScore}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5 text-xs font-semibold">
            <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-center">
              <div className="text-red-700 uppercase tracking-wide">{language === 'id' ? 'Fragile' : 'Fragile'}</div>
              <div className="text-lg font-black text-red-900">{fragileReliabilityCount}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-center">
              <div className="text-amber-700 uppercase tracking-wide">{language === 'id' ? 'Watchlist' : 'Watchlist'}</div>
              <div className="text-lg font-black text-amber-900">{watchlistReliabilityCount}</div>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-200 px-3 py-2 text-center">
              <div className="text-blue-700 uppercase tracking-wide">{language === 'id' ? 'Signal Deteriorating' : 'Deteriorating Signal'}</div>
              <div className="text-lg font-black text-blue-900">{deteriorationCount}</div>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
              <div className="text-gray-700 uppercase tracking-wide">{language === 'id' ? 'Machines Scored' : 'Machines Scored'}</div>
              <div className="text-lg font-black text-gray-900">{reliabilityInsights.length}</div>
            </div>
          </div>

          {topReliabilityRisks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-gray-600">
              {language === 'id' ? 'Belum ada data cukup untuk reliability intelligence.' : 'Not enough data yet for reliability intelligence.'}
            </div>
          ) : (
            <div className="space-y-3">
              {topReliabilityRisks.map((insight) => (
                <div key={insight.machineId} className={`rounded-2xl border px-4 py-4 ${insight.riskBand === 'fragile' ? 'border-red-200 bg-red-50/70' : insight.riskBand === 'watchlist' ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900">{insight.machineName}</p>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${insight.riskBand === 'fragile' ? 'bg-red-100 text-red-700' : insight.riskBand === 'watchlist' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {insight.riskBand}
                        </span>
                        {insight.deteriorationSignal && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">
                            {language === 'id' ? 'Trend menurun' : 'Trend deteriorating'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{insight.recommendation}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                        <span>{language === 'id' ? 'Data completeness' : 'Data completeness'}: {insight.dataCompleteness}</span>
                        <span>{language === 'id' ? 'Sampling discipline' : 'Sampling discipline'}: {insight.samplingDiscipline}</span>
                        <span>{language === 'id' ? 'Execution reliability' : 'Execution reliability'}: {insight.executionReliability}</span>
                        <span>{language === 'id' ? 'Trend stability' : 'Trend stability'}: {insight.trendStability}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{language === 'id' ? 'Reliability Score' : 'Reliability Score'}</p>
                      <p className={`text-3xl font-black ${insight.reliabilityScore >= 80 ? 'text-emerald-700' : insight.reliabilityScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                        {insight.reliabilityScore}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">{copy.alertManagementTitle}</h2>
              <p className="text-sm text-gray-600 mt-1">{copy.alertManagementDesc}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetAlertInbox}
                className="px-3 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                {copy.resetInbox}
              </button>
            </div>
          </div>

          {visibleAlerts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 font-medium">
              {copy.alertEmpty}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAlerts.slice(0, 6).map((alertItem) => (
                <div
                  key={alertItem.id}
                  className={`rounded-2xl border px-4 py-4 ${
                    alertItem.severity === 'critical'
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-amber-200 bg-amber-50/70'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-black uppercase tracking-wide ${alertItem.severity === 'critical' ? 'text-red-700' : 'text-amber-700'}`}>
                          {alertItem.severity === 'critical'
                            ? copy.criticalLabel
                            : alertItem.severity === 'warning'
                            ? copy.warningLabel
                            : alertItem.severity === 'normal'
                            ? copy.normalLabel
                            : copy.unknownLabel}
                        </span>
                        <span className="text-xs text-gray-500">{copy.alertMachine}: {alertItem.machineName}</span>
                      </div>
                      <p className="font-bold text-gray-900">{alertItem.title}</p>
                      <p className="text-sm text-gray-700 mt-1">{alertItem.message}</p>
                      <p className="text-sm text-gray-800 mt-2"><span className="font-semibold">{copy.alertNextAction}:</span> {alertItem.recommendedAction}</p>
                    </div>
                    <div className="flex flex-col gap-2 self-start">
                      <button
                        onClick={() => handleCreateActionFromAlert(alertItem)}
                        disabled={actionSaving}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 border border-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                      >
                        {language === 'id' ? 'Buat action' : 'Create action'}
                      </button>
                      <button
                        onClick={() => dismissAlert(alertItem.id)}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        {copy.markAsRead}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">{language === 'id' ? 'Action Board Maintenance' : 'Maintenance Action Board'}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'id'
                  ? 'Kelola pekerjaan maintenance dari insight, due date, dan penanggung jawab dalam satu alur.'
                  : 'Manage maintenance work from insights, due dates, and owners in one workflow.'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
              <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">{language === 'id' ? 'Open' : 'Open'}</div>
                <div className="text-lg font-black text-gray-900">{maintenanceActionStats.open}</div>
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-200 px-3 py-2 text-center">
                <div className="text-blue-700 uppercase tracking-wide">{language === 'id' ? 'Active' : 'Active'}</div>
                <div className="text-lg font-black text-blue-900">{maintenanceActionStats.inProgress}</div>
              </div>
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
                <div className="text-emerald-700 uppercase tracking-wide">{language === 'id' ? 'Done' : 'Done'}</div>
                <div className="text-lg font-black text-emerald-900">{maintenanceActionStats.completed}</div>
              </div>
              <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-center">
                <div className="text-red-700 uppercase tracking-wide">{language === 'id' ? 'Overdue' : 'Overdue'}</div>
                <div className="text-lg font-black text-red-900">{maintenanceActionStats.overdue}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {(['all', 'open', 'assigned', 'in_progress', 'completed', 'verified', 'overdue'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActionFilter(status)}
                className={`px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                  actionFilter === status ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-gray-900">{language === 'id' ? 'Buat Action Baru' : 'Create New Action'}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'id'
                  ? 'Action bisa dibuat dari alert atau diinput manual oleh tim customer.'
                  : 'Actions can be created from alerts or entered manually by the customer team.'}
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Machine</span>
                  <select
                    value={actionForm.machine_id}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, machine_id: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{language === 'id' ? 'Pilih machine' : 'Select machine'}</option>
                    {machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.machine_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Title</span>
                  <input
                    type="text"
                    value={actionForm.title}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Description</span>
                  <textarea
                    value={actionForm.description}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Priority</span>
                    <select
                      value={actionForm.priority}
                      onChange={(e) => setActionForm((prev) => ({ ...prev, priority: e.target.value as MaintenanceActionPriority }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Due date</span>
                    <input
                      type="date"
                      value={actionForm.due_date}
                      onChange={(e) => setActionForm((prev) => ({ ...prev, due_date: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Owner</span>
                  <select
                    value={actionForm.owner_profile_id}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, owner_profile_id: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">{language === 'id' ? 'Belum ditugaskan' : 'Unassigned'}</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => handleCreateMaintenanceAction()}
                  disabled={actionSaving}
                  className="w-full rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 px-4 py-3 text-white font-bold shadow-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {actionSaving ? (language === 'id' ? 'Menyimpan...' : 'Saving...') : (language === 'id' ? 'Simpan Action' : 'Save Action')}
                </button>
              </div>
            </div>

            <div className="xl:col-span-3 space-y-3">
              {visibleMaintenanceActions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center text-gray-600">
                  {language === 'id' ? 'Belum ada maintenance action untuk filter ini.' : 'No maintenance actions match this filter yet.'}
                </div>
              ) : (
                visibleMaintenanceActions.map((action) => {
                  const isOverdue = Boolean(action.due_date && action.due_date < todayIso && action.status !== 'completed' && action.status !== 'verified')
                  return (
                    <div key={action.id} className={`rounded-2xl border px-4 py-4 ${isOverdue ? 'border-red-200 bg-red-50/70' : 'border-gray-200 bg-white'}`}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-xs font-black uppercase tracking-wide text-gray-500">{action.machine?.machine_name || '-'}</span>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${action.priority === 'high' ? 'bg-red-100 text-red-700' : action.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {action.priority}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${action.status === 'completed' || action.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : action.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {action.status.replace('_', ' ')}
                            </span>
                            {isOverdue && <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-red-100 text-red-700">Overdue</span>}
                          </div>
                          <p className="font-bold text-gray-900">{action.title}</p>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{action.description || (language === 'id' ? 'Tidak ada deskripsi.' : 'No description provided.')}</p>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>{language === 'id' ? 'Due' : 'Due'}: {action.due_date || '-'}</span>
                            <span>{language === 'id' ? 'Owner' : 'Owner'}: {action.owner?.full_name || (language === 'id' ? 'Belum ditugaskan' : 'Unassigned')}</span>
                            <span>{language === 'id' ? 'Alert' : 'Alert'}: {action.alert_key || '-'}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            onClick={() => handleUpdateMaintenanceAction(action.id, { status: 'in_progress' })}
                            disabled={actionSaving}
                            className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold disabled:opacity-60"
                          >
                            {language === 'id' ? 'Mulai' : 'Start'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMaintenanceAction(action.id, { status: 'completed' })}
                            disabled={actionSaving}
                            className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold disabled:opacity-60"
                          >
                            {language === 'id' ? 'Selesai' : 'Complete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMaintenanceAction(action.id, { status: 'verified', verification_status: 'passed' })}
                            disabled={actionSaving}
                            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-semibold disabled:opacity-60"
                          >
                            {language === 'id' ? 'Verify OK' : 'Verify OK'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateMaintenanceAction(action.id, { status: 'open', verification_status: 'failed' })}
                            disabled={actionSaving}
                            className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold disabled:opacity-60"
                          >
                            {language === 'id' ? 'Verify Fail' : 'Verify Fail'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
          <button
            onClick={handleExportFleetReport}
            className="w-full bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 rounded-2xl shadow-xl p-6 text-white transition-all transform hover:scale-[1.02] flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2h-5.586a1 1 0 01-.707-.293l-1.414-1.414A1 1 0 0010.586 2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black">{copy.exportPdfTitle}</h3>
                <p className="text-white/90 text-sm font-medium mt-1">{copy.exportPdfDesc}</p>
              </div>
            </div>
            <svg className="w-6 h-6 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <button
            onClick={handleExportTrustRoiSnapshot}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-2xl shadow-xl p-6 text-white transition-all transform hover:scale-[1.02] flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black">{language === 'id' ? 'Export Trust & ROI Snapshot' : 'Export Trust & ROI Snapshot'}</h3>
                <p className="text-white/90 text-sm font-medium mt-1">
                  {language === 'id'
                    ? 'Unduh ringkasan trust enterprise, audit event, dan estimasi ROI.'
                    : 'Download the enterprise trust, audit event, and ROI snapshot.'}
                </p>
              </div>
            </div>
            <svg className="w-6 h-6 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>

          <button
            onClick={() => router.push('/purchases')}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 rounded-2xl shadow-xl p-6 text-white transition-all transform hover:scale-[1.02] flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black">{copy.purchaseHistoryTitle}</h3>
                <p className="text-white/90 text-sm font-medium mt-1">{copy.purchaseHistoryDesc}</p>
              </div>
            </div>
            <svg className="w-6 h-6 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Phase 1: Rule-Based Insight Engine */}
        <section className="mb-8 bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900">{copy.insightTitle}</h2>
              <p className="text-gray-600 font-medium mt-1">{copy.insightDesc}</p>
            </div>
            <button
              onClick={loadFleetInsights}
              disabled={fleetInsightsLoading}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors disabled:opacity-60"
            >
              {fleetInsightsLoading ? (language === 'id' ? 'Memuat...' : 'Loading...') : copy.refreshInsights}
            </button>
          </div>

        </section>

        <section className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900">{copy.teamManagementTitle}</h2>
              <p className="text-gray-600 font-medium mt-1">{copy.teamManagementDesc}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-semibold">
              <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700">{teamMemberCount} {copy.user}</span>
              <span className="px-3 py-1.5 rounded-full bg-primary-100 text-primary-700">{profile?.customer?.company_name}</span>
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
                    onChange={(e) => setTeamForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamEmail}</span>
                  <input
                    type="email"
                    value={teamForm.email}
                    onChange={(e) => setTeamForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamPhone}</span>
                  <input
                    type="tel"
                    value={teamForm.phone_number}
                    onChange={(e) => setTeamForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamPin}</span>
                  <input
                    type="password"
                    value={teamForm.admin_pin}
                    onChange={(e) => setTeamForm((prev) => ({ ...prev, admin_pin: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">{copy.teamPinHint}</p>
                </label>
                <label className="block">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.teamPassword}</span>
                  <input
                    type="password"
                    value={teamForm.password}
                    onChange={(e) => setTeamForm((prev) => ({ ...prev, password: e.target.value }))}
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

        <section className="mb-8 bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
                {language === 'id' ? 'Enterprise Trust & ROI' : 'Enterprise Trust & ROI'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {language === 'id'
                  ? 'Validasi kesiapan enterprise melalui traceability tindakan, kualitas verifikasi, dan dampak finansial yang terukur.'
                  : 'Validate enterprise readiness through action traceability, verification quality, and measurable financial impact.'}
              </p>
            </div>
            <div className={`px-4 py-3 rounded-2xl border ${enterpriseTrustScore >= 80 ? 'bg-emerald-50 border-emerald-200' : enterpriseTrustScore >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{language === 'id' ? 'Enterprise Trust Score' : 'Enterprise Trust Score'}</p>
              <p className={`text-3xl font-black ${enterpriseTrustScore >= 80 ? 'text-emerald-700' : enterpriseTrustScore >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                {enterpriseTrustScore}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 mb-5 text-xs font-semibold">
            <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
              <div className="text-gray-600 uppercase tracking-wide">{language === 'id' ? 'Assignment' : 'Assignment'}</div>
              <div className="text-lg font-black text-gray-900">{assignmentCoverageRate}%</div>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-200 px-3 py-2 text-center">
              <div className="text-gray-600 uppercase tracking-wide">{language === 'id' ? 'Due Date' : 'Due Date'}</div>
              <div className="text-lg font-black text-gray-900">{dueDateCoverageRate}%</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-center">
              <div className="text-emerald-700 uppercase tracking-wide">{language === 'id' ? 'Verify Pass' : 'Verify Pass'}</div>
              <div className="text-lg font-black text-emerald-900">{verificationPassRate}%</div>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-200 px-3 py-2 text-center">
              <div className="text-blue-700 uppercase tracking-wide">{language === 'id' ? 'Evidence' : 'Evidence'}</div>
              <div className="text-lg font-black text-blue-900">{evidenceCoverageRate}%</div>
            </div>
            <div className="rounded-2xl bg-purple-50 border border-purple-200 px-3 py-2 text-center">
              <div className="text-purple-700 uppercase tracking-wide">{language === 'id' ? 'Traceability' : 'Traceability'}</div>
              <div className="text-lg font-black text-purple-900">{traceabilityRate}%</div>
            </div>
            <div className="rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-center">
              <div className="text-red-700 uppercase tracking-wide">{language === 'id' ? 'Overdue' : 'Overdue'}</div>
              <div className="text-lg font-black text-red-900">{overdueRate}%</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{language === 'id' ? 'Total Spend (Completed Purchase)' : 'Total Spend (Completed Purchase)'}</p>
              <p className="text-2xl font-black text-gray-900">Rp {Math.round(totalSpend).toLocaleString('id-ID')}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-1">{language === 'id' ? 'Estimated Savings' : 'Estimated Savings'}</p>
              <p className="text-2xl font-black text-emerald-900">Rp {Math.round(estimatedSavings).toLocaleString('id-ID')}</p>
            </div>
            <div className={`rounded-2xl border px-4 py-4 ${netImpact >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${netImpact >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{language === 'id' ? 'ROI Net Impact' : 'ROI Net Impact'}</p>
              <p className={`text-2xl font-black ${netImpact >= 0 ? 'text-blue-900' : 'text-red-900'}`}>Rp {Math.round(netImpact).toLocaleString('id-ID')}</p>
              <p className={`text-sm font-semibold mt-1 ${netImpact >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{roiPercent}% ROI</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
            <h3 className="text-lg font-black text-gray-900 mb-3">{language === 'id' ? 'Audit Event Summary' : 'Audit Event Summary'}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 text-xs font-semibold">
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">created</div>
                <div className="text-base font-black text-gray-900">{logEventBreakdown.created || 0}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">updated</div>
                <div className="text-base font-black text-gray-900">{logEventBreakdown.updated || 0}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">status</div>
                <div className="text-base font-black text-gray-900">{logEventBreakdown.status_changed || 0}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">assigned</div>
                <div className="text-base font-black text-gray-900">{logEventBreakdown.assigned || 0}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">completed</div>
                <div className="text-base font-black text-gray-900">{logEventBreakdown.completed || 0}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">verified</div>
                <div className="text-base font-black text-gray-900">{logEventBreakdown.verified || 0}</div>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-center">
                <div className="text-gray-500 uppercase tracking-wide">reopened</div>
                <div className="text-base font-black text-gray-900">{logEventBreakdown.reopened || 0}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {language === 'id'
                ? 'Catatan: ROI adalah estimasi model berbasis histori purchase, verifikasi action, dan potensi downtime yang dihindari.'
                : 'Note: ROI is a model estimate based on purchase history, action verification, and avoided downtime potential.'}
            </p>
          </div>
        </section>

        {/* Machine Health Overview - Neuros Style with Horizontal Carousel */}
        <div className="mb-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black text-gray-900">{copy.machineHealthTitle}</h2>
              <p className="text-gray-600 font-medium mt-1">{copy.machineHealthDesc}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const container = document.getElementById('machine-carousel')
                  if (container) container.scrollBy({ left: -400, behavior: 'smooth' })
                }}
                className="p-2 rounded-lg bg-white border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all shadow-md hover:shadow-lg"
                aria-label="Scroll left"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const container = document.getElementById('machine-carousel')
                  if (container) container.scrollBy({ left: 400, behavior: 'smooth' })
                }}
                className="p-2 rounded-lg bg-white border-2 border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all shadow-md hover:shadow-lg"
                aria-label="Scroll right"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Horizontal Scrolling Container */}
          <div 
            id="machine-carousel"
            className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#f97316 #f3f4f6',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {machines.map((machine) => {
              // Get latest test for this machine
              const machineTests = labReports.filter((test) => test.machine_id === machine.id)
              const latestTest = machineTests.length > 0 ? machineTests[0] : null
              const healthScore = latestTest ? calculateHealthScore(latestTest) : null
              const status = latestTest ? getStatus(latestTest.viscosity_40c || 0, latestTest.water_content, latestTest.tan_value, latestTest.product) : null
              const daysSinceTest = latestTest ? Math.floor((Date.now() - new Date(latestTest.test_date).getTime()) / (1000 * 60 * 60 * 24)) : null
              const samplingState = daysSinceTest === null
                ? 'overdue'
                : daysSinceTest > 60
                ? 'overdue'
                : daysSinceTest > 30
                ? 'upcoming'
                : 'on-schedule'
              const samplingLabel = daysSinceTest === null
                ? copy.noTestData
                : samplingState === 'overdue'
                ? copy.samplingInitialRequired
                : samplingState === 'upcoming'
                ? copy.nextSamplingIn(Math.max(1, 60 - daysSinceTest))
                : copy.onSchedule(Math.max(1, 90 - daysSinceTest))

              return (
                <div 
                  key={machine.id}
                  onClick={() => {
                    setSelectedMachine(machine)
                    setTimeout(() => {
                      detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 100)
                  }}
                  className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-2 overflow-hidden flex-shrink-0 w-80 snap-start ${
                    samplingState === 'overdue'
                      ? 'border-red-200 hover:border-red-300'
                      : selectedMachine?.id === machine.id 
                      ? 'border-primary-500 ring-4 ring-primary-100' 
                      : 'border-gray-100 hover:border-primary-300'
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div className={`h-1.5 w-full ${
                    !status ? 'bg-gray-300' :
                    status.level === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    status.level === 'warning' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    'bg-gradient-to-r from-green-400 to-green-500'
                  }`}></div>

                  <div className="p-6">
                    {/* Machine Name & Status */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {machine.machine_name}
                        </h3>
                        {status && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            status.level === 'critical' ? 'bg-red-100 text-red-700 border border-red-300' :
                            status.level === 'warning' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                            'bg-green-100 text-green-700 border border-green-300'
                          }`}>
                            {status.level === 'critical' && '🔴'}
                            {status.level === 'warning' && '🟡'}
                            {status.level === 'normal' && '🟢'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-medium">{machine.location || copy.noLocation}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          samplingState === 'overdue'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : samplingState === 'upcoming'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}>
                          {samplingLabel}
                        </span>
                      </div>
                    </div>

                    {/* Health Score */}
                    {healthScore !== null ? (
                      <div className="mb-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{copy.healthScore}</span>
                          <span className={`text-2xl font-black ${
                            healthScore >= 80 ? 'text-green-600' :
                            healthScore >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>{healthScore}<span className="text-sm text-gray-400">/100</span></span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              healthScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                              healthScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                              'bg-gradient-to-r from-red-400 to-red-600'
                            }`}
                            style={{ width: `${healthScore}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 text-center py-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500 font-medium">{copy.noTestData}</p>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-gray-600 font-semibold mb-0.5">{copy.lastTest}</p>
                        <p className="font-bold text-gray-900">
                          {daysSinceTest !== null ? (
                            daysSinceTest === 0 ? copy.today :
                            daysSinceTest === 1 ? copy.yesterday :
                            `${daysSinceTest} ${copy.daysAgo}`
                          ) : copy.never}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-gray-600 font-semibold mb-0.5">{copy.statusLabel}</p>
                        <p className="font-bold text-gray-900">
                          {status?.text || copy.unknownStatus}
                        </p>
                      </div>
                    </div>

                    {/* Hover Indicator */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center text-primary-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      {copy.viewDetails} →
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Scroll Indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {machines.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  const container = document.getElementById('machine-carousel')
                  if (container) {
                    const cardWidth = 320 + 24 // width + gap
                    container.scrollTo({ left: cardWidth * index, behavior: 'smooth' })
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  selectedMachine?.id === machines[index]?.id
                    ? 'w-8 bg-gradient-to-r from-primary-500 to-secondary-600'
                    : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to machine ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Machine Selector & Time Range Filter - Side by Side */}
        <div ref={detailsRef} className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Machine Selector */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-primary-500">
            <div className="flex justify-between items-center mb-4">
              <label htmlFor="machine-select" className="block text-lg font-semibold text-gray-800">
                {copy.selectMachine}
              </label>
              <span className="text-sm text-gray-600 bg-primary-50 px-3 py-1 rounded-full">
                {machines.length} {machines.length === 1 ? 'machine' : 'machines'}
              </span>
            </div>
            <select
              id="machine-select"
              value={selectedMachine?.id || ''}
              onChange={(e) => {
                const machine = machines.find(m => m.id === e.target.value)
                setSelectedMachine(machine || null)
              }}
              className="w-full px-4 py-3 bg-white border-2 border-primary-300 rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
              suppressHydrationWarning
            >
              {machines.map(machine => (
                <option key={machine.id} value={machine.id}>
                  {machine.machine_name} - {machine.model} ({machine.location || copy.noLocation})
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-secondary-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">{copy.timeRangeTitle}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '7d'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {language === 'id' ? '7 Hari' : '7 Days'}
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '30d'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {language === 'id' ? '30 Hari' : '30 Days'}
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '90d'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {language === 'id' ? '90 Hari' : '90 Days'}
              </button>
              <button
                onClick={() => setTimeRange('6m')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '6m'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {language === 'id' ? '6 Bulan' : '6 Months'}
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === 'all'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {language === 'id' ? 'Semua Waktu' : 'All Time'}
              </button>
              <button
                onClick={() => setTimeRange('custom')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === 'custom'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {copy.customRange}
              </button>
            </div>

            {timeRange === 'custom' && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.startDate}</span>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">{copy.endDate}</span>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <OilDropLoader label="Calibrating oil insights..." />
          </div>
        )}

        {/* No Machine Selected State */}
        {!loading && !selectedMachine && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">{copy.noMachineSelectedTitle}</h3>
            <p className="text-gray-600">{copy.noMachineSelectedDesc}</p>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && selectedMachine && (
          <div className="space-y-8 motion-soft-enter">
            {/* Charts Section */}
            <div className="bg-gray-50 rounded-3xl p-8 -mx-4 sm:mx-0">
              <div className="mb-6">
                  <h2 className="text-3xl font-black text-gray-900">{copy.performanceTitle}</h2>
                  <p className="text-gray-600 font-medium mt-1">{copy.performanceDesc}</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-primary-500 rounded-full mr-3"></span>
                  Viscosity Trend
                </h3>
                {chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] lg:h-[300px] text-gray-400">
                    <svg className="w-16 h-16 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="font-semibold">{copy.noSampleData}</p>
                    <p className="text-sm text-gray-400 mt-1">{copy.checkConsole}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : window.innerWidth < 1024 ? 250 : 300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '0',
                          borderRadius: '12px'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="viscosity_40c" name="Viscosity @40°C" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 5 }} />
                      <Line type="monotone" dataKey="viscosity_100c" name="Viscosity @100°C" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} />
                      {selectedMachineTrendAlerts
                        .filter((alert) => alert.parameter === 'Viscosity')
                        .map((alert) => (
                          <ReferenceDot
                            key={alert.id}
                            x={new Date(alert.chartDate).toLocaleDateString()}
                            y={alert.chartValue}
                            r={7}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Water Content Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-secondary-500 rounded-full mr-3"></span>
                  {language === 'id' ? 'Kandungan Air' : 'Water Content'}
                </h3>
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <p>{copy.noDataAvailable}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="water" stroke="#dc2626" strokeWidth={3} dot={{ fill: '#dc2626', r: 5 }} />
                      {selectedMachineTrendAlerts
                        .filter((alert) => alert.parameter === 'Water content')
                        .map((alert) => (
                          <ReferenceDot
                            key={alert.id}
                            x={new Date(alert.chartDate).toLocaleDateString()}
                            y={alert.chartValue}
                            r={7}
                            fill="#f59e0b"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* TAN Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-industrial-500 rounded-full mr-3"></span>
                  {language === 'id' ? 'Total Acid Number (TAN)' : 'Total Acid Number (TAN)'}
                </h3>
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <p>{copy.noDataAvailable}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="tan" stroke="#b91c1c" strokeWidth={3} dot={{ fill: '#b91c1c', r: 5 }} />
                      {selectedMachineTrendAlerts
                        .filter((alert) => alert.parameter === 'TAN')
                        .map((alert) => (
                          <ReferenceDot
                            key={alert.id}
                            x={new Date(alert.chartDate).toLocaleDateString()}
                            y={alert.chartValue}
                            r={7}
                            fill="#8b5cf6"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              </div>
            </div>

            <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">{copy.trendAlertsTitle}</h2>
                  <p className="text-gray-600 font-medium mt-1">{copy.trendAlertsDesc}</p>
                </div>
                <div className="text-sm text-gray-600 font-semibold">
                  {copy.activeTrendAlerts(selectedMachineTrendAlerts.length)}
                </div>
              </div>

              {selectedMachineTrendAlerts.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 font-medium">
                  {copy.noTrendAlerts}
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  {selectedMachineTrendAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`rounded-2xl border p-5 ${
                        alert.severity === 'High'
                          ? 'border-red-200 bg-red-50/70'
                          : alert.severity === 'Medium'
                          ? 'border-amber-200 bg-amber-50/70'
                          : 'border-sky-200 bg-sky-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide ${
                          alert.severity === 'High'
                            ? 'bg-red-100 text-red-700'
                            : alert.severity === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}>
                          {alert.severity === 'High' ? copy.trend.severityHigh : alert.severity === 'Medium' ? copy.trend.severityMedium : copy.trend.severityLow}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">{alert.parameter}</span>
                      </div>
                      <h3 className="text-lg font-black text-gray-900">{alert.title}</h3>
                      <p className="text-sm text-gray-700 mt-2">{alert.message}</p>
                      <p className="text-sm text-gray-800 mt-3"><span className="font-semibold">{copy.trend.recommendedAction}:</span> {alert.recommendedAction}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Lab Reports */}
            <div className="bg-gray-50 rounded-3xl p-8 -mx-4 sm:mx-0">
              <div className="mb-6">
                <h2 className="text-3xl font-black text-gray-900">{copy.labReportsTitle}</h2>
                <p className="text-gray-600 font-medium mt-1">{copy.reportCountSuffix(filteredReports.length)}</p>
              </div>
              {filteredReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{copy.labReportsEmpty}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredReports.map((report, index) => {
                    const previousReport = index > 0 ? filteredReports[index - 1] : null
                    const status = getStatus(
                      report.viscosity_40c || 0,
                      report.water_content || 0,
                      report.tan_value || 0,
                      report.product
                    )
                    const viscosity40Trend = getTrend(report.viscosity_40c || 0, previousReport?.viscosity_40c ?? null)
                    const viscosity100Trend = getTrend(report.viscosity_100c || 0, previousReport?.viscosity_100c ?? null)
                    const waterTrend = getTrend(report.water_content ? report.water_content * 100 : 0, previousReport?.water_content ? previousReport.water_content * 100 : null)
                    const tanTrend = getTrend(report.tan_value || 0, previousReport?.tan_value ?? null)
                    const recommendations = getRecommendations(
                      report.viscosity_40c || 0,
                      report.water_content || 0,
                      report.tan_value || 0,
                      report.product,
                      previousReport,
                      report.evaluation_mode
                    )
                    const isExpanded = expandedReports.has(report.id)

                    return (
                      <div key={report.id} className="bg-white rounded-2xl shadow-lg border-2 border-primary-100 overflow-hidden hover:shadow-xl transition-all">
                        {/* Compact Header - Always Visible */}
                        <div 
                          onClick={() => toggleReport(report.id)}
                          className="cursor-pointer hover:bg-primary-50 transition-colors duration-200"
                        >
                          <div className="px-6 py-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="font-bold text-gray-900 text-lg">
                                  {new Date(report.test_date).toLocaleDateString('id-ID', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}
                                </p>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  status.level === 'critical' ? 'bg-red-100 text-red-800' :
                                  status.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {status.level === 'critical'
                                    ? copy.criticalLabel
                                    : status.level === 'warning'
                                    ? copy.warningLabel
                                    : status.level === 'normal'
                                    ? copy.normalLabel
                                    : copy.unknownLabel}
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <span className="text-gray-600">
                                  <span className="font-semibold text-blue-900">{copy.viscosityLabel}:</span> {report.viscosity_40c?.toFixed(1) || copy.notAvailable} / {report.viscosity_100c?.toFixed(1) || copy.notAvailable} cSt
                                </span>
                                <span className="text-gray-600">
                                  <span className="font-semibold text-cyan-900">{copy.waterContentLabel}:</span> {report.water_content ? (report.water_content * 100).toFixed(2) : '0.00'}%
                                </span>
                                <span className="text-gray-600">
                                  <span className="font-semibold text-purple-900">{copy.tanValueLabel}:</span> {report.tan_value?.toFixed(2) || copy.notAvailable} mg KOH/g
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {report.pdf_path && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const pdfPath = report.pdf_path
                                    if (!pdfPath) return
                                    const { data } = supabase.storage.from('lab-reports').getPublicUrl(pdfPath)
                                    if (data?.publicUrl) {
                                      setCurrentPdfUrl(data.publicUrl)
                                      setPdfViewerOpen(true)
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {copy.viewReport}
                                </button>
                              )}
                              <svg 
                                className={`w-6 h-6 text-primary-600 transition-transform duration-300 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content - Slide Down Animation */}
                        <div 
                          className={`transition-all duration-500 ease-in-out ${
                            isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                          } overflow-hidden`}
                        >
                          {/* Status Header */}
                          <div className={`px-6 py-4 bg-gradient-to-r border-t-2 border-gray-200 ${
                            status.level === 'critical' ? 'from-red-500 to-red-600' :
                            status.level === 'warning' ? 'from-yellow-500 to-orange-500' :
                            'from-green-500 to-green-600'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-3">
                                  <h4 className="text-xl font-black text-white">{copy.completeAnalysis}</h4>
                                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                                    {status.text.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-white/80 text-xs mt-2 font-medium">
                                  {copy.evaluationBasedOnIndustryStandard}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-6">
                            {/* Machine & Product Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b-2 border-gray-100">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{copy.machineLabel}</p>
                                  <p className="text-sm font-bold text-gray-900 mt-1">{selectedMachine?.machine_name}</p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{copy.productLabel}</p>
                                  <p className="text-sm font-bold text-gray-900 mt-1">{report.product?.product_name || copy.notAvailable}</p>
                                  {report.product?.product_type && (
                                    <p className="text-xs text-gray-600 mt-0.5">{report.product.product_type}</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Test Results with Trends */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border-2 border-blue-200">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">{copy.viscosityLabel} 40°C</p>
                                  <span className={`text-lg font-black ${
                                    viscosity40Trend.direction === 'up' ? 'text-red-600' :
                                    viscosity40Trend.direction === 'down' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{viscosity40Trend.icon}</span>
                                </div>
                                <p className="text-3xl font-black text-blue-900">{report.viscosity_40c?.toFixed(1) || copy.notAvailable}</p>
                                <p className="text-xs text-blue-700 mt-1 font-semibold">cSt</p>
                              </div>

                              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border-2 border-indigo-200">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">{copy.viscosityLabel} 100°C</p>
                                  <span className={`text-lg font-black ${
                                    viscosity100Trend.direction === 'up' ? 'text-red-600' :
                                    viscosity100Trend.direction === 'down' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{viscosity100Trend.icon}</span>
                                </div>
                                <p className="text-3xl font-black text-indigo-900">{report.viscosity_100c?.toFixed(1) || copy.notAvailable}</p>
                                <p className="text-xs text-indigo-700 mt-1 font-semibold">cSt</p>
                              </div>
                              
                              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl p-4 border-2 border-cyan-200">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs font-bold text-cyan-800 uppercase tracking-wide">{copy.waterContentLabel}</p>
                                  <span className={`text-lg font-black ${
                                    waterTrend.direction === 'up' ? 'text-red-600' :
                                    waterTrend.direction === 'down' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{waterTrend.icon}</span>
                                </div>
                                <p className="text-3xl font-black text-cyan-900">
                                  {report.water_content ? (report.water_content * 100).toFixed(2) : '0.00'}%
                                </p>
                                <p className="text-xs text-cyan-700 mt-1 font-semibold">by volume</p>
                                <p className="text-xs text-cyan-600 mt-2 font-medium">
                                  ≈ {report.water_content ? (report.water_content * 10000).toFixed(0) : '0'} ppm
                                </p>
                              </div>
                              
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border-2 border-purple-200">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">{copy.tanValueLabel}</p>
                                  <span className={`text-lg font-black ${
                                    tanTrend.direction === 'up' ? 'text-red-600' :
                                    tanTrend.direction === 'down' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{tanTrend.icon}</span>
                                </div>
                                <p className="text-3xl font-black text-purple-900">{report.tan_value?.toFixed(2) || copy.notAvailable}</p>
                                <p className="text-xs text-purple-700 mt-1 font-semibold">mg KOH/g</p>
                              </div>
                            </div>

                            {/* Recommendations */}
                            <div className={`rounded-xl p-4 border-2 mb-4 ${
                              status.level === 'critical' ? 'bg-red-50 border-red-200' :
                              status.level === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                              'bg-green-50 border-green-200'
                            }`}>
                              <h5 className={`text-sm font-black uppercase tracking-wide mb-3 flex items-center ${
                                status.level === 'critical' ? 'text-red-800' :
                                status.level === 'warning' ? 'text-yellow-800' :
                                'text-green-800'
                              }`}>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                Recommendations
                              </h5>
                              <ul className="space-y-3">
                                {recommendations.map((rec, idx) => {
                                  const actionPriority = rec.severity === 'critical' ? 'Immediate Action' :
                                                       rec.severity === 'warning' ? 'Plan Maintenance' :
                                                       'Monitor';
                                  return (
                                    <li key={idx} className={`p-4 rounded-lg border-l-4 ${
                                      rec.severity === 'critical' ? 'bg-red-50 border-red-500' :
                                      rec.severity === 'warning' ? 'bg-yellow-50 border-yellow-500' :
                                      'bg-green-50 border-green-500'
                                    }`}>
                                      <div className="flex items-start gap-2">
                                        <span className="text-xl flex-shrink-0">{rec.icon}</span>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <p className={`text-sm font-bold ${
                                              rec.severity === 'critical' ? 'text-red-800' :
                                              rec.severity === 'warning' ? 'text-yellow-800' :
                                              'text-green-800'
                                            }`}>{rec.text}</p>
                                            <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${
                                              rec.severity === 'critical' ? 'bg-red-200 text-red-800' :
                                              rec.severity === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                                              'bg-green-200 text-green-800'
                                            }`}>
                                              {actionPriority}
                                            </span>
                                          </div>
                                          <p className={`text-xs mt-2 ${
                                            rec.severity === 'critical' ? 'text-red-600' :
                                            rec.severity === 'warning' ? 'text-yellow-600' :
                                            'text-green-600'
                                          }`}>→ {rec.action}</p>
                                        </div>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>

                            {/* View & Download Buttons */}
                            {report.pdf_path && (
                              <div className="flex gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const pdfPath = report.pdf_path
                                    if (!pdfPath) return
                                    const { data } = supabase.storage.from('lab-reports').getPublicUrl(pdfPath)
                                    if (data?.publicUrl) {
                                      setCurrentPdfUrl(data.publicUrl)
                                      setPdfViewerOpen(true)
                                    }
                                  }}
                                  className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  View Report
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const pdfPath = report.pdf_path
                                    if (!pdfPath) return
                                    handleDownloadPDF(pdfPath, report.test_date)
                                  }}
                                  className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-3 rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-300 flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-xl hover:scale-105 transform"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Download PDF
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t-2 border-gray-200 sticky bottom-0 z-40" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            {/* Left: Copyright */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <svg className="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">© 2026 <span className="font-bold text-gray-800">PT Nabel Sakha Gemilang</span></span>
            </div>
            
            {/* Right: TotalEnergies Logo with Label */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Authorized Distributor</span>
              <Image
                src="/logos/total-energies.png"
                alt="TotalEnergies"
                width={150}
                height={44}
                className="h-11 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </footer>

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && currentPdfUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPdfViewerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">Lab Test Report</h2>
                  <p className="text-xs text-gray-500">Oil Analysis Results</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={currentPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
                <button
                  onClick={() => setPdfViewerOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* PDF Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={currentPdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
