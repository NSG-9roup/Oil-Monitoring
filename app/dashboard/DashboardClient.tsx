'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { getOilTypeWaterThresholds, getOilTypeThresholds, classifyOilType, type OilType } from '@/lib/constants/oilTypeThresholds'
import type { FleetReportRow } from '@/lib/pdf/exportFleetReport'
import { useChartHeight } from '@/lib/hooks/useWindowSize'
import { logger } from '@/lib/logger'
import { ShortcutNavigator } from '@/app/dashboard/components/ShortcutNavigator'
import { TrendSection } from '@/app/dashboard/components/TrendSection'
import { LabReportsSection } from '@/app/dashboard/components/LabReportsSection'
import { createLabRequest } from '@/app/actions/dashboardActions'
import type { LabRequest } from '@/app/dashboard/components/types'
import { useTabAutoLogout, signOutIfTabWasClosed } from '@/lib/hooks/useTabAutoLogout'
import OrdersSection from '@/app/dashboard/components/OrdersSection'
import { toast } from 'react-hot-toast'

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
  water_content_unit?: 'PPM' | 'PERCENT'
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
  initialLabTests: any[]
  initialLabRequests: LabRequest[]
  initialSalesTeam: any[]
  products: any[]
  initialOrders: any[]
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
    oilTrend: 'Riwayat Oli',
    analysis: 'Analisis Lab',
    labResults: 'Hasil Lab',
    smartAlertTitle: 'Peringatan Cerdas Berdasarkan Riwayat',
    latestReport: 'Laporan Terbaru',
    activeAlerts: 'peringatan riwayat aktif',
    viewAll: 'Lihat Semua Laporan',
    actionCenter: 'Tindak Lanjuti di Action Center',
    exportFleetPdf: 'Ekspor Laporan Armada (PDF)',
    exportFleetDesc: 'Unduh ringkasan eksekutif dan daftar prioritas mesin dalam format laporan resmi.',
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
    performanceTitle: 'Riwayat Performa',
    lastTestDate: 'Tanggal Uji Terakhir',
    machineStatus: 'Status Mesin',
    overallCondition: 'Kondisi Keseluruhan',
    performanceDesc: 'Visualisasi metrik utama dan indikator kondisi pelumas dalam rentang waktu yang dipilih.',
    noSampleData: 'Data sampel tidak ditemukan',
    checkConsole: 'Periksa konsol browser untuk rincian debug.',
    noDataAvailable: 'Data tidak tersedia',
    trendAlertsTitle: 'Peringatan Cerdas Berdasarkan Riwayat',
    trendAlertsDesc: 'Deteksi pola anomali dan kondisi yang mendekati batas kritis secara otomatis.',
    noTrendAlerts: 'Tidak ditemukan anomali riwayat pada rentang waktu ini.',
    activeTrendAlerts: (count: number) => `${count} peringatan riwayat aktif`,
    labReportsTitle: 'Laporan Laboratorium',
    labReportsEmpty: 'Belum ada laporan laboratorium pada rentang waktu ini.',
    reportCountSuffix: (count: number) => `${count} laporan ditemukan`,
    viscosityTrend: 'Riwayat Viskositas',
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
    oilTrend: 'Oil History',
    analysis: 'Lab Analysis',
    labResults: 'Lab Results',
    smartAlertTitle: 'History-Based Smart Alerts',
    latestReport: 'Latest Report',
    activeAlerts: 'active history alerts',
    viewAll: 'View All Reports',
    actionCenter: 'Follow up in Action Center',
    exportFleetPdf: 'Export Fleet Report (PDF)',
    exportFleetDesc: 'Download executive summary and machine priority list in a professional report format.',
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
    performanceTitle: 'Performance History',
    lastTestDate: 'Last Test Date',
    machineStatus: 'Machine Status',
    overallCondition: 'Overall Condition',
    performanceDesc: 'Key metrics visualization and lubricant condition indicators within the selected time range.',
    noSampleData: 'No sample data available',
    checkConsole: 'Check the browser console for debug details.',
    noDataAvailable: 'No data available',
    trendAlertsTitle: 'History-Based Smart Alerts',
    trendAlertsDesc: 'Detect rising patterns, abnormal changes, and values approaching critical limits.',
    noTrendAlerts: 'No history anomalies were detected in the selected time range.',
    activeTrendAlerts: (count: number) => `${count} active history alert${count === 1 ? '' : 's'}`,
    labReportsTitle: 'Lab Reports',
    labReportsEmpty: 'No lab reports available for the selected time range',
    reportCountSuffix: (count: number) => `${count} report${count === 1 ? '' : 's'} in the selected time range`,
    viscosityTrend: 'Viscosity History',
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
      viscosityTitle: 'Viscosity shows a trend outside normal limits',
      viscosityAction: 'Check operating temperature, dilution risk, and oil stability.',
      waterTitle: 'Water content shows a consistent increase',
      waterAction: 'Inspect seals, breathers, and contamination sources. Retest after corrective action.',
      tanTitle: 'TAN value is rising faster than normal',
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
  initialLabTests,
  initialLabRequests = [],
  initialSalesTeam = [],
  products = [],
  initialOrders = [],
}: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()
  useTabAutoLogout()
  useEffect(() => { signOutIfTabWasClosed() }, [])
  const [language, setLanguage] = useState<Language>('id')
  const [labRequests, setLabRequests] = useState<LabRequest[]>(initialLabRequests)
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
      
      // Normalisasi Kandungan Air ke Persen (%)
      let water_content = test.water_content || 0;
      const isPPM = test.water_content_unit === 'PPM' || (!test.water_content_unit && test.water_content > 5);
      if (isPPM) {
        water_content = test.water_content / 10000; // 198 PPM -> 0.0198%
      }

      return { 
        ...test, 
        product, 
        water_content,
        water_content_unit: 'PERCENT' as const
      }
    }) as Array<OilSample & { machine_id: string }>
  }, [initialLabTests])

  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(() => preferredMachine)
  const chartMachine = useMemo(() => {
    if (selectedMachine) {
      return selectedMachine
    }
    return preferredMachine
  }, [preferredMachine, selectedMachine])

  // Derive oilSamples from server-prefetched lab tests (no client fetch needed)
  const oilSamples = useMemo(() => {
    const allSorted = [...normalizedLabTests].sort((a, b) => new Date(a.test_date).getTime() - new Date(b.test_date).getTime())
    if (!chartMachine) return []

    return allSorted.filter((t) => t.machine_id === chartMachine.id)
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
  const [customDateRange, setCustomDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null })
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | undefined>()

  // Derive fleet maps from server-prefetched lab tests (no client fetch needed)
  const { latestTestByMachineId } = useMemo(() => {
    const latestMap: Record<string, OilSample> = {}
    normalizedLabTests.forEach((t) => {
      if (!latestMap[t.machine_id]) latestMap[t.machine_id] = t
    })
    return { latestTestByMachineId: latestMap }
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
    assigned_to_profile_id: '',
    requested_date: '',
    priority: 'medium',
    notes: ''
  })
  const [requestSaving, setRequestSaving] = useState(false)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)

  const [expandedRequestIds, setExpandedRequestIds] = useState<Set<string>>(new Set())
  const toggleRequestExpand = (id: string) => {
    setExpandedRequestIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const [activeTab, setActiveTab] = useState<'trend' | 'analysis' | 'lab' | 'requests' | 'orders'>('trend')

  const handleShortcutClick = (shortcutId: string) => {
    if (shortcutId.startsWith('trend') || shortcutId === 'trend') setActiveTab('trend')
    else if (shortcutId === 'analysis') setActiveTab('analysis')
    else if (shortcutId === 'lab') setActiveTab('lab')
    else if (shortcutId === 'requests') setActiveTab('requests')
    else if (shortcutId === 'orders') setActiveTab('orders')
  }

  const handleSendRequest = async () => {
    if (!requestForm.is_new_machine && !requestForm.machine_id) {
      toast.error('Silakan pilih mesin atau centang mesin baru.')
      return
    }
    if (requestForm.is_new_machine && !requestForm.new_machine_name) {
      toast.error('Silakan masukkan nama mesin baru.')
      return
    }

    setRequestSaving(true)
    try {
      const machineName = requestForm.is_new_machine 
        ? requestForm.new_machine_name 
        : initialMachines.find(m => m.id === requestForm.machine_id)?.machine_name || 'Unknown'

      await createLabRequest({
        machine_id: requestForm.is_new_machine ? undefined : requestForm.machine_id,
        title: `Lab Test Request: ${machineName}`,
        description: requestForm.notes,
        due_date: requestForm.requested_date || undefined,
        priority: requestForm.priority,
        is_new_machine: requestForm.is_new_machine,
        assigned_to_profile_id: requestForm.assigned_to_profile_id || undefined,
        new_machine_data: requestForm.is_new_machine ? {
          machine_name: requestForm.new_machine_name,
          model: requestForm.new_machine_model,
          location: requestForm.new_machine_location
        } : undefined
      })

      // Fetch the latest request from the database to ensure we get the full database record
      try {
        const { data: newRequests, error: fetchErr } = await supabase
          .from('oil_lab_requests')
          .select(`
            *,
            machine:oil_machines(machine_name, location),
            assigned_to:oil_profiles!oil_lab_requests_assigned_to_profile_id_fkey(full_name)
          `)
          .eq('customer_id', profile.customer_id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (!fetchErr && newRequests && newRequests.length > 0) {
          setLabRequests(prev => [newRequests[0], ...prev])
        } else {
          throw new Error('Database fetch delayed')
        }
      } catch {
        // Fallback: manually construct a mock item to prepend
        const mockRequest: LabRequest = {
          id: Math.random().toString(),
          customer_id: profile.customer_id || '',
          requested_by_profile_id: profile.id,
          machine_id: requestForm.is_new_machine ? null : requestForm.machine_id,
          title: `Lab Test Request: ${machineName}`,
          description: requestForm.notes,
          due_date: requestForm.requested_date || null,
          priority: requestForm.priority,
          status: 'pending',
          is_new_machine: requestForm.is_new_machine,
          assigned_to_profile_id: requestForm.assigned_to_profile_id || null,
          new_machine_data: requestForm.is_new_machine ? {
            machine_name: requestForm.new_machine_name,
            model: requestForm.new_machine_model,
            location: requestForm.new_machine_location
          } : null,
          request_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          machine: requestForm.is_new_machine ? null : {
            machine_name: machineName,
            location: initialMachines.find(m => m.id === requestForm.machine_id)?.location || null
          }
        }
        setLabRequests(prev => [mockRequest, ...prev])
      }
      
      setIsRequestModalOpen(false)
      toast.success('Permintaan uji lab berhasil dikirim!')
    } catch (error) {
      console.error('Request failed:', error)
      toast.error('Gagal mengirim permintaan.')
    } finally {
      setRequestSaving(false)
    }
  }

  const handleQuickLabRequest = (
    machineId: string,
    notes: string,
    priority: 'High' | 'Medium' | 'Low' = 'Medium'
  ) => {
    setRequestForm({
      machine_id: machineId,
      is_new_machine: false,
      new_machine_name: '',
      new_machine_model: '',
      new_machine_location: '',
      assigned_to_profile_id: '',
      priority: priority,
      requested_date: formatLocalDateInput(new Date()),
      notes: notes,
    })
    setIsRequestModalOpen(true)
  }

  // SSR-safe chart height (fixes window.innerWidth crash)
  const chartHeight = useChartHeight(200, 250, 300)

  // Set up real-time subscription for lab requests and tests (Saran A)
  useEffect(() => {
    const channel = supabase
      .channel('customer-dashboard-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'oil_lab_requests'
        },
        () => {
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'oil_lab_tests'
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  useEffect(() => {
    setLabRequests(initialLabRequests)
  }, [initialLabRequests])

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
      toast.error('No PDF report available for this test')
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
      toast.error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Calculate Viscosity Index (VI) from ASTM D2270
  const calculateVI = (visc40: number, visc100: number) => {
    if (!visc40 || !visc100 || visc40 <= 0 || visc100 <= 0) return null

    const Y = visc100; // Kinematic viscosity at 100°C
    const U = visc40;  // Kinematic viscosity at 40°C

    if (Y < 2.0) return null; // Below ASTM D2270 range

    let a = 0, b = 0, c = 0, d = 0, e = 0, f = 0;

    // ASTM D2270 Table X2.1 Coefficients of Quadratic Equations
    if (Y >= 2.0 && Y < 3.8) {
      a = 1.14673; b = 1.7576; c = -0.109; d = 0.84155; e = 1.5521; f = -0.077;
    } else if (Y >= 3.8 && Y < 4.4) {
      a = 3.38095; b = -15.4952; c = 33.196; d = 0.78571; e = 1.7929; f = -0.183;
    } else if (Y >= 4.4 && Y < 5.0) {
      a = 2.5000; b = -7.2143; c = 13.812; d = 0.82143; e = 1.5679; f = 0.119;
    } else if (Y >= 5.0 && Y < 6.4) {
      a = 0.10100; b = 16.6350; c = -45.469; d = 0.04985; e = 9.1613; f = -18.557;
    } else if (Y >= 6.4 && Y < 7.0) {
      a = 3.35714; b = -23.5643; c = 78.466; d = 0.22619; e = 7.7369; f = -16.656;
    } else if (Y >= 7.0 && Y < 7.7) {
      a = 0.01191; b = 21.4750; c = -72.870; d = 0.79762; e = -0.7321; f = 14.610;
    } else if (Y >= 7.7 && Y < 9.0) {
      a = 0.41858; b = 16.1558; c = -56.040; d = 0.05794; e = 10.5156; f = -28.240;
    } else if (Y >= 9.0 && Y < 12.0) {
      a = 0.88779; b = 7.5527; c = -16.600; d = 0.26665; e = 6.7015; f = -12.564;
    } else if (Y >= 12.0 && Y < 15.0) {
      a = 0.76720; b = 10.7972; c = -38.180; d = 0.20073; e = 8.4658; f = -22.490;
    } else if (Y >= 15.0 && Y < 18.0) {
      a = 0.97305; b = 5.3135; c = -2.200; d = 0.28889; e = 5.9741; f = -4.930;
    } else if (Y >= 18.0 && Y < 22.0) {
      a = 0.97256; b = 5.2500; c = -0.980; d = 0.24504; e = 7.4160; f = -16.730;
    } else if (Y >= 22.0 && Y < 28.0) {
      a = 0.91413; b = 7.4759; c = -21.820; d = 0.20323; e = 9.1267; f = -34.230;
    } else if (Y >= 28.0 && Y < 40.0) {
      a = 0.87031; b = 9.7157; c = -50.770; d = 0.18411; e = 10.1015; f = -46.750;
    } else if (Y >= 40.0 && Y < 55.0) {
      a = 0.84703; b = 12.6752; c = -133.310; d = 0.17029; e = 11.4866; f = -80.620;
    } else if (Y >= 55.0 && Y <= 70.0) {
      a = 0.85921; b = 11.1009; c = -83.19; d = 0.17130; e = 11.3680; f = -76.940;
    } else {
      // Y > 70.0
      a = 0.8353; b = 14.67; c = -216; d = 0.1684; e = 11.85; f = -97;
    }

    const L = a * Math.pow(Y, 2) + b * Y + c;
    const H = d * Math.pow(Y, 2) + e * Y + f;

    if (U >= H) {
      // Linear formula for VI <= 100
      const VI = ((L - U) / (L - H)) * 100;
      return Math.round(Math.max(0, Math.min(200, VI)));
    } else {
      // Logarithmic formula for VI > 100
      const N = (Math.log10(H) - Math.log10(U)) / Math.log10(Y);
      const VI = ((Math.pow(10, N) - 1) / 0.00715) + 100;
      return Math.round(Math.max(0, Math.min(200, VI)));
    }
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
        values: recentTests.map((test) => (test.water_content || 0)),
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
      if (values.length < 2) return // Not enough data for trend analysis

      const latest = values[values.length - 1]
      const baseline = values[0]
      const increasing = values.length > 2 && values[values.length - 3] < values[values.length - 2] && values[values.length - 2] < values[values.length - 1]
      
      const latestTestObj = recentTests[recentTests.length - 1]
      const oilType = getOilType(latestTestObj.product?.product_type || '')

      let abnormalChange = false
      let nearCritical = false
      let percentChange = 0

      if (baseline > 0) {
        percentChange = ((latest - baseline) / baseline) * 100
        const absChange = Math.abs(percentChange)
        
        if (series.key === 'Viscosity') {
           const viscThresholds = getOilTypeThresholds(oilType).viscosityChange
           if (absChange > viscThresholds.warning) abnormalChange = true
           if (absChange > viscThresholds.critical * 0.8) nearCritical = true
        } else if (series.key === 'TAN') {
           const tanThresholds = getOilTypeThresholds(oilType).tanIncrease
           const tanIncrease = latest - baseline
           if (tanIncrease > tanThresholds.warning) abnormalChange = true
           if (tanIncrease > tanThresholds.critical * 0.8) nearCritical = true
        } else if (series.key === 'Water content') {
           const waterThresholds = getWaterThresholds(oilType)
           if (latest > waterThresholds.warning) abnormalChange = true
           if (latest > waterThresholds.critical * 0.8) nearCritical = true
        }
      }

      if (increasing || abnormalChange || nearCritical) {
        const severity: TrendSeverity = abnormalChange && nearCritical ? 'High' : increasing && abnormalChange ? 'Medium' : 'Low'
        
        const paramName = language === 'id'
          ? (series.key === 'Water content' ? 'Kandungan air' : series.key === 'Viscosity' ? 'Viskositas' : 'Total Acid Number (TAN)')
          : (series.key === 'Water content' ? 'Water content' : series.key === 'Viscosity' ? 'Viscosity' : 'Total Acid Number (TAN)')

        const message = language === 'id'
          ? (increasing
            ? `${paramName} menunjukkan kenaikan konsisten dalam ${values.length} pengujian terakhir.`
            : abnormalChange
            ? `${paramName} berubah secara anomali sebesar ${percentChange.toFixed(1)}% dibandingkan dengan sampel paling awal dalam periode ini.`
            : `${paramName} mendekati batas kritis untuk mesin ini.`)
          : (increasing
            ? `${paramName} shows a consistent increase over the last ${values.length} tests.`
            : abnormalChange
            ? `${paramName} changed abnormally by ${percentChange.toFixed(1)}% compared with the earliest sample in this window.`
            : `${paramName} is approaching the critical limit for this machine.`)

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
    router.replace('/login')
    router.refresh()
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





  const [exporting, setExporting] = useState(false)

  const handleExportFleetReport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/reports/fleet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta: {
            companyName: profile?.customer?.company_name || 'Customer',
            customerEmail: profile?.email || user.email || '-',
            generatedBy: profile?.full_name || profile?.email || 'Customer User',
            generatedAt: new Date().toISOString(),
            criticalCount,
            warningCount,
            healthyCount,
            avgHealthScore,
          },
          rows: fleetReportRows,
          language
        })
      })

      if (!response.ok) throw new Error('Failed to generate report')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeCompany = (profile?.customer?.company_name || 'Customer').replace(/[^a-z0-9]+/gi, '_')
      a.download = `Fleet_Report_${safeCompany}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export PDF failed:', err)
      toast.error('Gagal mengekspor laporan PDF.')
    } finally {
      setExporting(false)
    }
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
      water: Number(sample.water_content ?? 0),
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
            <div className="flex items-center gap-3 min-w-0 select-none">
              <Image
                src="https://i.imgur.com/8nqsjFz.png"
                alt="Nabel Sakha Gemilang"
                width={90}
                height={28}
                className="h-7 w-auto object-contain flex-shrink-0"
                unoptimized
              />
              <div className="hidden md:flex items-center border-l border-gray-200 pl-3 shrink-0">
                <Image
                  src="/teks logo.webp"
                  alt="OilTrack"
                  width={3186}
                  height={881}
                  className="h-5 w-auto object-contain shrink-0"
                />
              </div>
            </div>

            {/* Middle: Customer Logo */}
            <div className="hidden md:flex flex-1 justify-center min-w-0">
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
                className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] transition-all shadow-lg shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/20 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                {copy.requestLab.openButton}
              </button>

              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Fleet</span>
                  <span className="text-xs font-black">{initialMachines.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl bg-gray-100 p-0.5 text-[10px] font-bold">
                    <button onClick={() => setLanguage('id')} className={`px-2 py-1 rounded-lg transition-all ${language === 'id' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>ID</button>
                    <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-lg transition-all ${language === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>EN</button>
                  </div>

                <button onClick={handleSignOut} className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-xl transition-all" title={language === 'id' ? 'Keluar' : 'Sign Out'}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
                </div>{/* flex items-center gap-2 */}
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
                    { id: 'requests', label: language === 'id' ? 'Status Lab Request' : 'Lab Request Status' },
                    { id: 'orders', label: language === 'id' ? 'Pesanan Oli' : 'Oil Orders' },
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
                {['7d', '30d', '90d', '6m', 'custom', 'all'].map((range) => (
                  <button 
                    key={range}
                    onClick={() => setTimeRange(range as any)} 
                    className={`px-3 py-1.5 rounded-lg font-black text-[9px] tracking-wide transition-all ${timeRange === range ? 'bg-slate-900 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {range === 'custom' ? copy.customRange.toUpperCase() : range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom Date Range Picker UI */}
            {timeRange === 'custom' && (
              <div className="bg-white/50 border-t border-gray-100 px-4 py-3 flex flex-wrap items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{copy.startDate}</span>
                  <input 
                    type="date" 
                    value={customDateRange.start || ''} 
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{copy.endDate}</span>
                  <input 
                    type="date" 
                    value={customDateRange.end || ''} 
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
                {(!customDateRange.start || !customDateRange.end) && (
                  <p className="text-[10px] font-bold text-amber-600 animate-pulse">
                    {language === 'id' ? 'Silakan pilih rentang tanggal' : 'Please select a date range'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col relative gap-8" style={{ scrollbarGutter: 'stable' }}>
        {/* Welcome Section with Dynamic Time-Aware Greeting Banner */}
        <div className="animate-in fade-in slide-in-from-left-4 duration-700 w-full">
          <div className="bg-white rounded-[2rem] border border-slate-105 p-6 sm:p-8 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
            {/* Soft accent background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-orange-400 to-red-500 opacity-5 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
              {/* Left Side: Logo + Divider + Welcome Text */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                {/* Logo Frame */}
                <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm flex items-center justify-center p-2">
                  {profile?.customer?.logo_url ? (
                    <Image
                      src={profile.customer.logo_url}
                      alt="Customer logo"
                      width={80}
                      height={80}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black text-xl uppercase rounded-xl">
                      {profile?.customer?.company_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || 'C'}
                    </div>
                  )}
                </div>

                {/* Responsive Divider Line */}
                <div className="hidden sm:block w-px h-14 bg-slate-200/80 self-center"></div>
                <div className="block sm:hidden w-full h-px bg-slate-100 my-1"></div>

                {/* Welcome Text */}
                <div className="flex-1 text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {language === 'id' ? 'KONTROL PANEL ARMADA' : 'FLEET CONTROL BOARD'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mt-1">
                    {(() => {
                      const hour = new Date().getHours();
                      let timeGreeting = '';
                      if (hour < 11) {
                        timeGreeting = language === 'id' ? 'Selamat Pagi' : 'Good Morning';
                      } else if (hour < 15) {
                        timeGreeting = language === 'id' ? 'Selamat Siang' : 'Good Afternoon';
                      } else if (hour < 19) {
                        timeGreeting = language === 'id' ? 'Selamat Sore' : 'Good Evening';
                      } else {
                        timeGreeting = language === 'id' ? 'Selamat Malam' : 'Good Night';
                      }
                      return `${timeGreeting}, ${profile?.full_name?.split(' ')[0] || 'User'}`;
                    })()} 🌟
                  </h2>
                  <p className="text-slate-500 font-semibold text-xs sm:text-sm mt-2">
                    {language === 'id' 
                      ? `Sistem monitoring oli pelumas untuk ${profile?.customer?.company_name || 'perusahaan Anda'} terpantau stabil hari ini.` 
                      : `Lubricant oil monitoring system for ${profile?.customer?.company_name || 'your company'} is running stable today.`}
                  </p>
                </div>
              </div>

              {/* Right Side: Active Status Badge */}
              <div className="flex-shrink-0 self-center lg:self-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50/80 to-red-50/80 border border-orange-100/50 rounded-2xl shrink-0 select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-850">
                    {language === 'id' ? 'SISTEM AKTIF' : 'SYSTEM LIVE'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Machine Health Overview */}
        <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
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
        <div className="flex-1 w-full relative min-h-[600px] space-y-8">
          {/* Trend Tab */}
          <div className={`w-full ${activeTab === 'trend' ? 'block animate-pop-micro' : 'hidden'}`}>
            <div key="trend" className="w-full">
              <TrendSection
                language={language}
                chartData={chartData}
                selectedMachineTrendAlerts={selectedMachineTrendAlerts}
                chartHeight={chartHeight}
                performanceTitle={copy.performanceTitle}
                performanceDesc={copy.performanceDesc}
                noSampleData={copy.noSampleData}
                checkConsole={copy.checkConsole}

                totalAnalysisCount={filteredReports.length}
                fleetHealthIndex={avgHealthScore}
                baselineViscosity40={activeBaselines?.viscosity40}
                baselineViscosity100={activeBaselines?.viscosity100}
                baselineTan={activeBaselines?.tan}
                onOpenLabDetails={() => setActiveTab('lab')}
              />
            </div>
          </div>

          {/* Analysis Tab */}
          <div className={`w-full ${activeTab === 'analysis' ? 'block animate-pop-micro' : 'hidden'}`}>
            {(() => {
            const selectedMachineInsight = selectedMachine
              ? machineInsights.find((item) => item.machine.id === selectedMachine.id)
              : null
            const selectedMachineHealth = selectedMachineInsight?.healthScore ?? null
            const selectedMachineStatus = selectedMachineInsight?.status

            const snapshotTitles = {
              executiveSummary: language === 'id' ? 'Ringkasan Eksekutif' : 'Executive Summary',
              executiveDesc: language === 'id' ? 'Status kesehatan real-time armada.' : 'Real-time fleet health metrics.',
              activeMachine: language === 'id' ? 'Mesin Terpilih' : 'Active Machine',
              model: language === 'id' ? 'Model' : 'Model',
              serialNumber: language === 'id' ? 'S/N' : 'S/N',
              location: language === 'id' ? 'Lokasi' : 'Location',
              healthStatus: language === 'id' ? 'Status Kesehatan' : 'Health Status',
              fleetOverview: language === 'id' ? 'Kesehatan Armada' : 'Fleet Overview',
              fleetDesc: language === 'id' ? 'Analisis kondisi pelumas seluruh mesin.' : 'Lubricant conditions across all assets.',
              avgHealth: language === 'id' ? 'Skor Rata-Rata Kesehatan' : 'Average Health Score',
              statusBreakdown: language === 'id' ? 'Distribusi Kondisi' : 'Status Distribution',
              normal: language === 'id' ? 'Normal' : 'Normal',
              warning: language === 'id' ? 'Warning' : 'Warning',
              critical: language === 'id' ? 'Critical' : 'Critical',
              quickUtilities: language === 'id' ? 'Aksi & Utilitas' : 'Quick Actions Hub',
              goToLabHub: language === 'id' ? 'Buka Hub & Tracker Lab' : 'Open Lab Hub & Tracker',
              goToLabHubDesc: language === 'id' ? 'Lihat dokumen PDF & progres sampel.' : 'View PDF reports & sample tracking.',
            }

            const getParameterIcon = (parameter: 'Viscosity' | 'Water content' | 'TAN' | string) => {
              switch (parameter) {
                case 'Water content':
                  return (
                    <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-500 shadow-sm flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 2a1 1 0 00-.7.3L4.6 7.5A6.5 6.5 0 1010 19a6.5 6.5 0 005.4-11.5L10.7 2.3A1 1 0 0010 2zm0 2.4l4.2 4.4a4.5 4.5 0 11-8.4 0L10 4.4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )
                case 'TAN':
                  return (
                    <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 shadow-sm flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 3h6m-3 0v11.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 14.172V3z" />
                      </svg>
                    </div>
                  )
                case 'Viscosity':
                default:
                  return (
                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 shadow-sm flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeWidth={2.5} />
                        <path d="M12 12l3-3" strokeWidth="3" strokeLinecap="round" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                      </svg>
                    </div>
                  )
              }
            }

            const getSeverityBadge = (severity: 'High' | 'Medium' | 'Low' | string) => {
              switch (severity) {
                case 'High':
                  return (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                      </span>
                      CRITICAL
                    </div>
                  )
                case 'Medium':
                  return (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                      </span>
                      WARNING
                    </div>
                  )
                case 'Low':
                default:
                  return (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <span className="relative flex h-1.5 w-1.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                      </span>
                      MONITOR
                    </div>
                  )
              }
            }

            return (
              <div key="analysis" className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
                  
                  {/* Left Column: Smart Trend Alerts (2/3 width) */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="w-full bg-white rounded-[2.5rem] shadow-[0_15px_50px_-20px_rgba(0,0,0,0.05)] border border-slate-100 p-6 sm:p-8 relative overflow-hidden">
                      {/* Decorative top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-rose-500 to-red-600 rounded-t-[2.5rem]"></div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                          <div className="flex items-center gap-2.5">
                            {selectedMachineTrendAlerts.length > 0 ? (
                              <span className="relative flex h-3 w-3 shrink-0">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                  selectedMachineTrendAlerts.some(a => a.severity === 'High') 
                                    ? 'bg-red-400' 
                                    : 'bg-amber-400'
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                                  selectedMachineTrendAlerts.some(a => a.severity === 'High') 
                                    ? 'bg-red-500 animate-pulse' 
                                    : 'bg-amber-500 animate-pulse'
                                }`}></span>
                              </span>
                            ) : (
                              <span className="relative flex h-3 w-3 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                              </span>
                            )}
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{copy.smartAlertTitle}</h2>
                          </div>
                          <p className="text-slate-400 font-medium text-sm mt-1">{copy.trendAlertsDesc}</p>
                        </div>
                        <span className="self-start sm:self-center bg-slate-50 border border-slate-100 text-slate-600 px-4.5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shrink-0">
                          {selectedMachineTrendAlerts.length} {language === 'id' ? 'peringatan riwayat aktif' : 'active history alerts'}
                        </span>
                      </div>

                      {selectedMachineTrendAlerts.length === 0 ? (
                        <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/20 p-8 text-emerald-850 flex items-center gap-4 shadow-sm">
                          <div className="h-12 w-12 rounded-2xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-base font-black text-emerald-950 mb-0.5">{language === 'id' ? 'Kondisi Pelumas Optimal' : 'Lubricant Condition Optimal'}</h4>
                            <p className="text-sm font-medium text-emerald-700/90 leading-relaxed">{copy.noTrendAlerts}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                          {selectedMachineTrendAlerts.map((alert) => (
                            <div
                              key={alert.id}
                              className={`group rounded-[2rem] border border-slate-100 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.08)] flex flex-col justify-between relative overflow-hidden bg-gradient-to-b from-white to-slate-50/10 ${
                                alert.severity === 'High'
                                  ? 'border-l-4 border-l-red-500'
                                  : alert.severity === 'Medium'
                                  ? 'border-l-4 border-l-amber-500'
                                  : 'border-l-4 border-l-blue-500'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-5">
                                  {getSeverityBadge(alert.severity)}
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                      {alert.parameter === 'Water content' ? (language === 'id' ? 'Kandungan air' : 'Water Content') : alert.parameter}
                                    </span>
                                    {getParameterIcon(alert.parameter)}
                                  </div>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 leading-snug mb-3 tracking-tight group-hover:text-indigo-950 transition-colors">
                                  {alert.title}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                                  {alert.message}
                                </p>
                              </div>

                              <div className="space-y-4 pt-4 border-t border-slate-100">
                                <div className="bg-slate-50 border border-slate-100/75 rounded-2xl p-4">
                                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1.5">
                                    {copy.trend.recommendedAction}
                                  </p>
                                  <p className="text-xs font-bold text-slate-800 leading-relaxed flex items-start gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {alert.recommendedAction}
                                  </p>
                                </div>

                                {(() => {
                                  const hasActiveRequest = labRequests.some(
                                    (req) => req.machine_id === selectedMachine?.id && ['pending', 'assigned', 'sampling'].includes(req.status)
                                  )

                                  if (hasActiveRequest) {
                                    return (
                                      <div className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-1.5 inline-flex items-center gap-1.5 mt-4 w-fit select-none">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                        {language === 'id' ? 'Sampel Sedang Diproses di Lab' : 'Sample Currently in Lab'}
                                      </div>
                                    )
                                  }

                                  return (
                                    <button
                                      onClick={() => {
                                        handleQuickLabRequest(
                                          selectedMachine?.id || '',
                                          language === 'id'
                                            ? `Memicu permintaan uji sampel secara otomatis akibat alarm tren: ${alert.title}.\nTindakan: ${alert.recommendedAction}`
                                            : `Automatically triggered lab request due to trend alert: ${alert.title}.\nAction: ${alert.recommendedAction}`,
                                          alert.severity === 'High' ? 'High' : 'Medium'
                                        )
                                      }}
                                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-850 transition-colors flex items-center gap-0.5 mt-4 w-fit transform active:scale-95"
                                    >
                                      {language === 'id' ? 'Butuh verifikasi? Minta Uji Ulang →' : 'Need verification? Request Re-Test →'}
                                    </button>
                                  )
                                })()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Executive Snapshot & Actions (1/3 width) */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Card 1: Snapshot Kesehatan */}
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
                      {/* High-end glow design lines */}
                      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"></div>
                      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl"></div>

                      <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-6">
                        <div>
                          <h3 className="text-xl font-black tracking-tight">{snapshotTitles.executiveSummary}</h3>
                          <p className="text-white/50 text-xs font-semibold mt-0.5">{snapshotTitles.executiveDesc}</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/80 shrink-0">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>

                      {selectedMachine ? (
                        /* Selected Machine View */
                        <div className="space-y-6">
                          <div>
                            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">
                              {snapshotTitles.activeMachine}
                            </span>
                            <h4 className="text-2xl font-black tracking-tight mt-1 truncate">
                              {selectedMachine.machine_name}
                            </h4>
                          </div>

                          {/* Selected Machine Metadata (Temuan UI/UX refinement) */}
                          {(selectedMachine.model || selectedMachine.serial_number || selectedMachine.location) && (
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3.5 text-sm">
                              {selectedMachine.model && (
                                <div className="flex justify-between">
                                  <span className="text-white/60 font-semibold">{snapshotTitles.model}</span>
                                  <span className="font-bold text-white/95">{selectedMachine.model}</span>
                                </div>
                              )}
                              {selectedMachine.serial_number && (
                                <div className={`flex justify-between ${selectedMachine.model ? 'border-t border-white/5 pt-3' : ''}`}>
                                  <span className="text-white/60 font-semibold">{snapshotTitles.serialNumber}</span>
                                  <span className="font-mono font-bold text-white/95">{selectedMachine.serial_number}</span>
                                </div>
                              )}
                              {selectedMachine.location && (
                                <div className={`flex justify-between ${(selectedMachine.model || selectedMachine.serial_number) ? 'border-t border-white/5 pt-3' : ''}`}>
                                  <span className="text-white/60 font-semibold">{snapshotTitles.location}</span>
                                  <span className="font-bold text-white/95 truncate max-w-[15ch]">{selectedMachine.location}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Selected Machine Health Gauge */}
                          <div className="pt-4 border-t border-white/10">
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="text-xs text-white/60 font-black uppercase tracking-wider">{snapshotTitles.healthStatus}</span>
                              <span className={`text-base font-black ${selectedMachineHealth !== null && selectedMachineHealth >= 80 ? 'text-emerald-400' : selectedMachineHealth !== null && selectedMachineHealth >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                {selectedMachineHealth !== null ? `${selectedMachineHealth}%` : '-'}
                              </span>
                            </div>
                            {selectedMachineHealth !== null ? (
                              <div>
                                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      selectedMachineHealth >= 80 ? 'bg-emerald-500' : selectedMachineHealth >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${selectedMachineHealth}%` }}
                                  ></div>
                                </div>
                                <p className="text-[11px] text-white/40 font-semibold leading-relaxed mt-2.5 flex items-center gap-1.5">
                                  <span className={`h-1.5 w-1.5 rounded-full ${selectedMachineHealth >= 80 ? 'bg-emerald-400' : selectedMachineHealth >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                                  {language === 'id' ? selectedMachineStatus?.text || 'Kondisi Normal' : selectedMachineStatus?.text || 'Stable Condition'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-white/40 font-bold">{language === 'id' ? 'Data pengujian belum tersedia.' : 'No sample metrics available.'}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Fleet Overview View */
                        <div className="space-y-6">
                          <div>
                            <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                              {snapshotTitles.fleetOverview}
                            </span>
                            <p className="text-white/60 text-xs font-semibold mt-1 leading-relaxed">{snapshotTitles.fleetDesc}</p>
                          </div>

                          <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-3xl p-4.5">
                            <div className={`relative flex items-center justify-center h-16 w-16 rounded-full border-4 shrink-0 font-black text-xl shadow-md shadow-orange-500/10 ${avgHealthScore !== null && avgHealthScore >= 80 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : avgHealthScore !== null && avgHealthScore >= 60 ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-red-500 bg-red-500/10 text-red-400'}`}>
                              {avgHealthScore ?? '-'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-white/95 uppercase tracking-wide truncate">{snapshotTitles.avgHealth}</h4>
                              <p className="text-[10px] text-white/50 leading-relaxed mt-0.5">{language === 'id' ? 'Rata-rata kesehatan oli armada.' : 'Average health across all fleet.'}</p>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-white/10">
                            <span className="text-[10px] text-white/60 font-black uppercase tracking-wider block mb-3.5">{snapshotTitles.statusBreakdown}</span>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                                <span className="text-[9px] text-white/40 block font-bold uppercase tracking-widest">{snapshotTitles.normal}</span>
                                <span className="text-base font-black text-emerald-400 block mt-0.5">{healthyCount}</span>
                              </div>
                              <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                                <span className="text-[9px] text-white/40 block font-bold uppercase tracking-widest">{snapshotTitles.warning}</span>
                                <span className="text-base font-black text-amber-400 block mt-0.5">{warningCount}</span>
                              </div>
                              <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5">
                                <span className="text-[9px] text-white/40 block font-bold uppercase tracking-widest">{snapshotTitles.critical}</span>
                                <span className="text-base font-black text-red-400 block mt-0.5">{criticalCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card 2: Aksi & Utilitas Laporan */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-8 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.04)] space-y-5">
                      <div className="flex items-center gap-2 pb-4.5 border-b border-slate-100">
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                          </svg>
                        </div>
                        <h4 className="text-base font-black text-slate-900 tracking-tight">{snapshotTitles.quickUtilities}</h4>
                      </div>

                      {/* PDF Export Button */}
                      <button
                        onClick={handleExportFleetReport}
                        disabled={exporting}
                        className={`group w-full rounded-2xl px-5 py-4 text-left text-white shadow-md transition-all duration-300 flex items-center gap-4 ${
                          exporting 
                            ? 'bg-slate-700 cursor-not-allowed opacity-80' 
                            : 'bg-slate-900 hover:bg-slate-800 hover:-translate-y-0.5 shadow-slate-900/10'
                        }`}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                          {exporting ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-black leading-tight uppercase tracking-wider text-white truncate">
                              {exporting ? 'Generating PDF...' : copy.exportFleetPdf}
                            </h3>
                            <span className="text-white/60 text-sm leading-none transition-transform duration-300 group-hover:translate-x-0.5 shrink-0">→</span>
                          </div>
                          <p className="text-[10px] text-white/50 font-medium truncate mt-0.5">
                            {copy.exportFleetDesc}
                          </p>
                        </div>
                      </button>

                      {/* Quick Navigation Button to Lab Tab */}
                      <button
                        onClick={() => setActiveTab('lab')}
                        className="group w-full rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 px-5 py-4 text-left text-slate-800 transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-4"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200/50 text-slate-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xs font-black leading-tight uppercase tracking-wider text-slate-800 truncate">
                              {snapshotTitles.goToLabHub}
                            </h3>
                            <span className="text-slate-500 text-sm leading-none transition-transform duration-300 group-hover:translate-x-0.5 shrink-0">→</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            {snapshotTitles.goToLabHubDesc}
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

          {/* Lab Tab */}
          <div className={`w-full ${activeTab === 'lab' ? 'block animate-pop-micro' : 'hidden'}`}>
            <div key="lab" className="w-full">
              <LabReportsSection
                title={copy.labReportsTitle}
                description={copy.reportCountSuffix(filteredReports.length)}
                reports={filteredReports}
                requests={labRequests}
                language={language}
                expandedReports={expandedReports}
                onQuickRequest={handleQuickLabRequest}
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
          </div>

          {/* Requests Tab */}
          <div className={`w-full ${activeTab === 'requests' ? 'block animate-pop-micro' : 'hidden'}`}>
            {(() => {
              const activeRequests = labRequests.filter((req) =>
                ['pending', 'assigned', 'sampling'].includes(req.status)
              )
              return (
                <div key="requests" className="w-full">
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm shadow-orange-200">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">
                          {language === 'id' ? 'Status Lab Request' : 'Lab Request Status'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {language === 'id' ? 'Lacak perjalanan sampel Anda' : 'Track your sample journey'}
                        </p>
                      </div>
                    </div>

                    {activeRequests.length === 0 ? (
                      <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200">
                          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <p className="text-sm font-bold text-slate-400">
                          {language === 'id' ? 'Belum ada lab request' : 'No lab requests yet'}
                        </p>
                        <p className="text-xs text-slate-300 mt-1">
                          {language === 'id' ? 'Klik tombol "Request Lab" untuk memulai' : 'Click "Request Lab" to get started'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeRequests.map((req) => {
                      // Map existing statuses to timeline steps
                      const steps = [
                        { key: 'pending', label: language === 'id' ? 'Permintaan Diterima' : 'Request Received', icon: '📋', desc: language === 'id' ? 'Tim sales akan segera menghubungi Anda' : 'Sales team will contact you soon' },
                        { key: 'assigned', label: language === 'id' ? 'Sales Ditugaskan' : 'Sales Assigned', icon: '👤', desc: language === 'id' ? 'Sales sedang dalam perjalanan ke lokasi Anda' : 'Sales is heading to your location' },
                        { key: 'sampling', label: language === 'id' ? 'Pengambilan Sampel' : 'Sample Collection', icon: '🧪', desc: language === 'id' ? 'Sampel sedang diambil dari mesin Anda' : 'Sample being collected from your machine' },
                        { key: 'completed', label: language === 'id' ? 'Hasil Lab Selesai' : 'Lab Results Ready', icon: '✅', desc: language === 'id' ? 'Laporan hasil uji lab siap diunduh' : 'Lab test report is ready for download' },
                      ]

                      const currentStepIdx = steps.findIndex(s => s.key === req.status)
                      const statusStep = currentStepIdx >= 0 ? currentStepIdx : 0

                      const statusColors: Record<string, string> = {
                        pending: 'bg-slate-100 text-slate-600 border-slate-200',
                        assigned: 'bg-blue-50 text-blue-700 border-blue-100',
                        sampling: 'bg-amber-50 text-amber-700 border-amber-100',
                        completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                        cancelled: 'bg-red-50 text-red-700 border-red-100',
                      }

                      const statusLabel: Record<string, string> = {
                        pending: language === 'id' ? 'Menunggu' : 'Pending',
                        assigned: language === 'id' ? 'Ditugaskan' : 'Assigned',
                        sampling: language === 'id' ? 'Pengambilan Sampel' : 'Sampling',
                        completed: language === 'id' ? 'Selesai' : 'Completed',
                        cancelled: language === 'id' ? 'Dibatalkan' : 'Cancelled',
                      }

                      return (
                        <div
                          key={req.id}
                          onClick={() => toggleRequestExpand(req.id)}
                          className="bg-white rounded-[1.5rem] border border-slate-100 p-5 hover:shadow-md hover:border-orange-200 transition-all duration-300 cursor-pointer relative overflow-hidden group"
                        >
                          {/* Card Header (Collapsed view contents) */}
                          <div className="flex items-start justify-between pb-3">
                            <div className="min-w-0 pr-4">
                              <h3 className="text-sm font-black text-slate-900 truncate group-hover:text-orange-600 transition-colors">
                                {req.is_new_machine
                                  ? (req.new_machine_data?.machine_name || 'Mesin Baru')
                                  : (req.machine?.machine_name || 'Mesin')}
                              </h3>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {language === 'id' ? 'Diminta' : 'Requested'}: {new Date(req.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0 ml-3">
                              <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${statusColors[req.status] || statusColors['pending']}`}>
                                {statusLabel[req.status] || req.status}
                              </span>
                              <svg
                                className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${expandedRequestIds.has(req.id) ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {/* Micro Progress Bar (stretching 100% width of the card below header) */}
                          <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-slate-100/60 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-700 ${req.status === 'cancelled' ? 'bg-red-500' : 'bg-gradient-to-r from-orange-400 to-emerald-500'}`}
                              style={{ width: `${Math.min((statusStep / (steps.length - 1)) * 100, 100)}%` }}
                            />
                          </div>

                          {/* Accordion Expanded Content */}
                          <div
                            className={`overflow-hidden transition-all duration-500 ease-in-out ${
                              expandedRequestIds.has(req.id)
                                ? 'max-h-[800px] opacity-100 mt-4 pt-5 border-t border-slate-100'
                                : 'max-h-0 opacity-0 pointer-events-none'
                            }`}
                          >
                            {/* Vertical Stepper Tracker */}
                            <div className="relative pl-12 space-y-6 py-2">
                              {/* Vertical timeline line */}
                              <div className="absolute top-4 bottom-4 left-[15px] w-[2px] bg-slate-100">
                                <div
                                  className={`absolute top-0 left-0 w-full transition-all duration-700 ${req.status === 'cancelled' ? 'bg-red-400' : 'bg-emerald-400'}`}
                                  style={{ height: `${Math.min((statusStep / (steps.length - 1)) * 100, 100)}%` }}
                                />
                              </div>

                              {steps.map((step, idx) => {
                                const isCompleted = idx <= statusStep
                                const isCurrent = idx === statusStep

                                return (
                                  <div key={step.key} className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                    {/* Circle indicator */}
                                    <div className="absolute -left-12 top-0.5 flex items-center justify-center">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 z-10 ${
                                        isCompleted
                                          ? isCurrent
                                            ? req.status === 'cancelled'
                                              ? 'bg-red-500 shadow-md shadow-red-200 ring-4 ring-red-50 scale-105'
                                              : 'bg-orange-500 shadow-md shadow-orange-200 ring-4 ring-orange-50 scale-105 animate-pulse'
                                            : 'bg-emerald-500 shadow-sm shadow-emerald-100'
                                          : 'bg-white border-2 border-slate-200'
                                      }`}>
                                        {isCompleted ? (
                                          isCurrent ? (
                                            <span className="text-xs">{step.icon}</span>
                                          ) : (
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                          )
                                        ) : (
                                          <span className="w-2 h-2 rounded-full bg-slate-200" />
                                        )}
                                      </div>
                                    </div>

                                    {/* Step text content */}
                                    <div className="flex-1 min-w-0 pr-2">
                                      <h4 className={`text-xs font-black uppercase tracking-wider ${
                                        isCurrent
                                          ? req.status === 'cancelled' ? 'text-red-600' : 'text-orange-600'
                                          : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                                      }`}>
                                        {step.label}
                                      </h4>
                                      <p className="text-[11px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                                        {step.desc}
                                      </p>
                                    </div>

                                    {/* Additional details (PIC or update timestamp) */}
                                    {isCompleted && (
                                      <div className="text-[10px] text-slate-400 font-semibold sm:text-right shrink-0 mt-1 sm:mt-0">
                                        {step.key === 'pending' && (
                                          <span>
                                            {new Date(req.created_at).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                          </span>
                                        )}
                                        {(step.key === 'assigned' || step.key === 'sampling') && req.assigned_to && (
                                          <div className="flex flex-col sm:items-end">
                                            <span className="text-slate-600 font-bold">
                                              PIC: {req.assigned_to.full_name}
                                            </span>
                                            <span className="text-[9px] text-slate-400">
                                              {language === 'id' ? 'Sales NSG' : 'NSG Sales'}
                                            </span>
                                          </div>
                                        )}
                                        {step.key === 'completed' && req.updated_at && (
                                          <span>
                                            {new Date(req.updated_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'short' })}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            {/* Request Notes / Description */}
                            {(req.description || (req as any).notes) && (
                              <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                  {language === 'id' ? 'Catatan Permintaan' : 'Request Notes'}
                                </h5>
                                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                                  {req.description || (req as any).notes}
                                </p>
                              </div>
                            )}

                            {/* Additional metadata info (priority, location etc.) */}
                            <div className="mt-4 flex flex-wrap gap-3 items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-4 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span>{language === 'id' ? 'Prioritas:' : 'Priority:'}</span>
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                                  req.priority === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                                  req.priority === 'medium' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                  'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}>
                                  {req.priority}
                                </span>
                              </div>
                              {req.sample_photo_path && (
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>{language === 'id' ? 'Foto Sampel Tersedia' : 'Sample Photo Available'}</span>
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
              )
            })()}
          </div>
          {/* Orders Tab */}
          <div className={`w-full ${activeTab === 'orders' ? 'block animate-pop-micro' : 'hidden'}`}>
            <div key="orders" className="w-full">
              <OrdersSection
                customerId={profile.customer_id || ''}
                products={products}
                initialOrders={initialOrders}
                initialComplaints={[]}
                language={language}
              />
            </div>
          </div>

        </div>
      </main>

      {/* Floating Action Button (FAB) - Premium Glassmorphism & Orange-Red Gradient */}
      <div className="fixed bottom-8 right-8 z-[100] group">
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="flex items-center gap-3 bg-gradient-to-r from-orange-500/95 to-red-600/95 hover:from-orange-500 hover:to-red-600 backdrop-blur-md text-white px-7 py-4.5 rounded-[2rem] shadow-[0_20px_50px_rgba(234,88,12,0.35)] transition-all hover:scale-105 hover:-translate-y-0.5 active:scale-95 group"
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-fade-fast" onClick={() => setPdfViewerOpen(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-100 overflow-hidden animate-pop-micro" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between text-slate-900 select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">{language === 'id' ? 'Penampil PDF' : 'PDF Viewer'}</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{language === 'id' ? 'Analisis Laporan Uji Lab' : 'Lab Test Report Analysis'}</p>
                </div>
              </div>
              <button 
                onClick={() => setPdfViewerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
              >
                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-900">
              <iframe
                src={currentPdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Request Lab Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-fade-fast" onClick={() => setIsRequestModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-100 overflow-hidden animate-pop-micro" onClick={(e) => e.stopPropagation()}>
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
                onClick={() => setIsRequestModalOpen(false)} 
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
                        checked={requestForm.is_new_machine}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, is_new_machine: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-350 text-orange-500 focus:ring-orange-200 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-orange-600 transition-colors">{copy.requestLab.unregisteredMachine}</span>
                    </label>
                  </div>

                  {!requestForm.is_new_machine ? (
                    <select
                      value={requestForm.machine_id}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, machine_id: e.target.value }))}
                      className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 transition-all outline-none"
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
                        className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 transition-all outline-none"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder={copy.requestLab.modelPlaceholder}
                          value={requestForm.new_machine_model}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, new_machine_model: e.target.value }))}
                          className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 placeholder:text-gray-400 transition-all outline-none"
                        />
                        <input
                          type="text"
                          placeholder={copy.requestLab.locationPlaceholder}
                          value={requestForm.new_machine_location}
                          onChange={(e) => setRequestForm(prev => ({ ...prev, new_machine_location: e.target.value }))}
                          className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 transition-all outline-none"
                        />
                      </div>
                      <select
                        value={requestForm.assigned_to_profile_id}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, assigned_to_profile_id: e.target.value }))}
                        className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 transition-all outline-none"
                      >
                        <option value="">Pilih Sales (Opsional)</option>
                        {initialSalesTeam.map((sales: any) => (
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
                    {['low', 'medium', 'high'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setRequestForm(prev => ({ ...prev, priority: p }))}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest border transition-all duration-200 active:scale-95 ${
                          requestForm.priority === p 
                            ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Notes Input Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.requestLab.preferredDateLabel}</span>
                    <input
                      type="date"
                      value={requestForm.requested_date}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, requested_date: e.target.value }))}
                      className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{copy.requestLab.notesLabel}</span>
                    <textarea
                      placeholder={copy.requestLab.notesPlaceholder}
                      value={requestForm.notes}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 placeholder:text-gray-400 transition-all outline-none h-[46px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  disabled={requestSaving}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  {language === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button
                  onClick={handleSendRequest}
                  disabled={requestSaving}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requestSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {requestSaving ? copy.requestLab.sending : copy.requestLab.submit}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
