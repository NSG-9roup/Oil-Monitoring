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
import { AnalysisSection } from '@/app/dashboard/components/AnalysisSection'
import { LabRequestsSection } from '@/app/dashboard/components/LabRequestsSection'
import { RequestLabModal, type RequestFormData } from '@/app/dashboard/components/RequestLabModal'
import { createLabRequest } from '@/app/actions/dashboardActions'
import type { LabRequest, TrendAlertItem } from '@/app/dashboard/components/types'
import { useTabAutoLogout, signOutIfTabWasClosed } from '@/lib/hooks/useTabAutoLogout'
import OrdersSection from '@/app/dashboard/components/OrdersSection'
import ComplaintsSection from '@/app/dashboard/components/ComplaintsSection'
import type { Complaint } from '@/lib/types'
import { toast } from 'react-hot-toast'
import NotificationBell from '@/components/NotificationBell'


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
  test_type?: string
  viscosity_40c: number
  viscosity_100c: number
  water_content: number
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value: number
  notes?: string
  machine_id?: string
  pdf_path?: string
  overall_status?: 'normal' | 'warning' | 'critical' | null
  running_hours?: number | null
  viscosity_40c_min?: number | null
  viscosity_40c_max?: number | null
  viscosity_100c_min?: number | null
  viscosity_100c_max?: number | null
  water_content_max?: number | null
  tan_max?: number | null
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
  avatar_url?: string | null
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
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value: number
  notes: string
  machine_id?: string
  pdf_path?: string
  overall_status?: 'normal' | 'warning' | 'critical' | null
  running_hours?: number | null
  viscosity_40c_min?: number | null
  viscosity_40c_max?: number | null
  viscosity_100c_min?: number | null
  viscosity_100c_max?: number | null
  water_content_max?: number | null
  tan_max?: number | null
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
  initialComplaints: any[]
}

type TrendSeverity = 'Low' | 'Medium' | 'High'
type Language = 'id' | 'en'





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
  initialComplaints = [],
}: DashboardClientProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  useTabAutoLogout()
  useEffect(() => { signOutIfTabWasClosed() }, [])
  const [language, setLanguage] = useState<Language>('id')
  const [labRequests, setLabRequests] = useState<LabRequest[]>(initialLabRequests)
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints)
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false)
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

  const activeTolerances = useMemo(() => {
    if (!chartMachine || oilSamples.length === 0) return null
    const latestWithTolerances = [...oilSamples].reverse().find(s => 
      s.viscosity_40c_min != null || 
      s.viscosity_40c_max != null || 
      s.viscosity_100c_min != null || 
      s.viscosity_100c_max != null || 
      s.water_content_max != null || 
      s.tan_max != null
    )
    if (!latestWithTolerances) return null
    return {
      viscosity40Min: latestWithTolerances.viscosity_40c_min,
      viscosity40Max: latestWithTolerances.viscosity_40c_max,
      viscosity100Min: latestWithTolerances.viscosity_100c_min,
      viscosity100Max: latestWithTolerances.viscosity_100c_max,
      waterContentMax: latestWithTolerances.water_content_max,
      waterContentUnit: latestWithTolerances.water_content_unit,
      tanMax: latestWithTolerances.tan_max,
    }
  }, [chartMachine, oilSamples])

  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
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

  const [modalInitialData, setModalInitialData] = useState<Partial<RequestFormData> | undefined>()
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

  const [activeTab, setActiveTab] = useState<'trend' | 'analysis' | 'lab' | 'requests' | 'orders' | 'complaints'>('trend')

  // URL Query Sync for tab and selected machine
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (tabParam && ['trend', 'analysis', 'lab', 'requests', 'orders', 'complaints'].includes(tabParam)) {
      setActiveTab(tabParam as any)
    }
    const machineParam = params.get('machine')
    if (machineParam) {
      const found = initialMachines.find(m => m.id === machineParam)
      if (found) setSelectedMachine(found)
    }
  }, [initialMachines])

  const syncUrlParams = (newTab: string, machineId?: string) => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('tab', newTab)
    if (machineId) {
      params.set('machine', machineId)
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }

  const handleShortcutClick = (shortcutId: string) => {
    let nextTab: 'trend' | 'analysis' | 'lab' | 'requests' | 'orders' | 'complaints' = 'trend'
    if (shortcutId.startsWith('trend') || shortcutId === 'trend') nextTab = 'trend'
    else if (shortcutId === 'analysis') nextTab = 'analysis'
    else if (shortcutId === 'lab') nextTab = 'lab'
    else if (shortcutId === 'requests') nextTab = 'requests'
    else if (shortcutId === 'orders') nextTab = 'orders'
    else if (shortcutId === 'complaints') nextTab = 'complaints'
    setActiveTab(nextTab)
    syncUrlParams(nextTab, selectedMachine?.id)
  }

  const handleSelectMachine = (machine: Machine) => {
    setSelectedMachine(machine)
    syncUrlParams(activeTab, machine.id)
  }

  const handleSendRequest = async (formData: RequestFormData) => {
    if (!formData.is_new_machine && !formData.machine_id) {
      toast.error(language === 'id' ? 'Silakan pilih mesin atau centang mesin baru.' : 'Please select a machine or check unregistered machine.')
      return
    }
    if (formData.is_new_machine && !formData.new_machine_name) {
      toast.error(language === 'id' ? 'Silakan masukkan nama mesin baru.' : 'Please enter the new machine name.')
      return
    }

    setRequestSaving(true)
    try {
      const selectedExistingMachine = initialMachines.find(m => m.id === formData.machine_id)
      const machineName = formData.is_new_machine 
        ? (formData.new_machine_name?.trim() || 'Mesin Baru') 
        : (selectedExistingMachine?.machine_name || 'Unknown')

      const res = await createLabRequest({
        machine_id: formData.is_new_machine ? undefined : formData.machine_id,
        title: `Lab Test Request: ${machineName}`,
        description: formData.notes || undefined,
        due_date: formData.requested_date || undefined,
        priority: formData.priority || 'medium',
        running_hours: formData.running_hours ? Number(formData.running_hours) : undefined,
        is_new_machine: formData.is_new_machine,
        assigned_to_profile_id: formData.assigned_to_profile_id || undefined,
        new_machine_data: formData.is_new_machine ? {
          machine_name: machineName,
          model: formData.new_machine_model,
          location: formData.new_machine_location
        } : undefined
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to create lab request')
      }

      if (res.data) {
        setLabRequests(prev => [res.data as unknown as LabRequest, ...prev])
      }
      
      setIsRequestModalOpen(false)
      toast.success(language === 'id' ? 'Permintaan uji lab berhasil dikirim!' : 'Lab test request submitted successfully!')
    } catch (error) {
      console.error('Request failed:', error)
      toast.error(language === 'id' ? 'Gagal mengirim permintaan.' : 'Failed to submit request.')
    } finally {
      setRequestSaving(false)
    }
  }

  const handleQuickLabRequest = (
    machineId: string,
    notes?: string,
    priority: 'High' | 'Medium' | 'Low' | string = 'Medium'
  ) => {
    setModalInitialData({
      machine_id: machineId,
      is_new_machine: false,
      priority: priority.toLowerCase(),
      requested_date: formatLocalDateInput(new Date()),
      notes: notes || '',
    })
    setIsRequestModalOpen(true)
  }

  // SSR-safe chart height (fixes window.innerWidth crash)
  const chartHeight = useChartHeight(200, 250, 300)

  // Set up real-time subscription for lab requests, tests, orders, and complaints with interactive notifications
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
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            toast.success('Status permintaan uji lab Anda telah diperbarui!', { icon: '📋' })
          }
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success('Laporan hasil uji lab baru telah diterbitkan!', { duration: 5000, icon: '🧪' })
          }
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'oil_orders'
        },
        (payload) => {
          const newOrder = payload.new as any
          if (payload.eventType === 'UPDATE' && newOrder?.status === 'processing') {
            toast.success('Permintaan penawaran Anda telah diteruskan ke Tim Admin Sales!', { duration: 6000, icon: '📬' })
          } else if (payload.eventType === 'UPDATE' && newOrder?.status === 'completed') {
            toast.success('Pesanan penawaran Anda telah selesai diproses!', { duration: 5000, icon: '✅' })
          }
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'oil_complaints'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            toast.success('Tanggapan status komplain Anda telah diperbarui.', { duration: 5000, icon: '💬' })
          }
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
    
    // ============================================================
    // TS OVERALL STATUS OVERRIDE
    // ============================================================
    if (test.overall_status === 'critical') {
      score = Math.min(score, 50)
    } else if (test.overall_status === 'warning') {
      score = Math.min(score, 75)
    }

    return Math.max(0, score)
  }

  /**
   * Calculate status badge for user communication (Critical/Warning/Normal)
   */
  const getStatus = (
    viscosity40c: number,
    waterContent: number,
    tanValue: number,
    product?: { product_type?: string; baseline_viscosity_40c?: number },
    testObj?: any
  ): { level: FleetReportRow['statusLevel']; color: string; text: string } => {
    // 1. TS explicit status override (ALWAYS respect TS judgment!)
    if (testObj?.overall_status === 'critical') {
      return { level: 'critical', color: 'red', text: 'Critical' }
    }
    if (testObj?.overall_status === 'warning') {
      return { level: 'warning', color: 'yellow', text: 'Warning' }
    }
    if (testObj?.overall_status === 'normal') {
      return { level: 'normal', color: 'green', text: 'Normal' }
    }

    // 2. TS Manual tolerance limits if provided on testObj
    if (testObj?.water_content_max != null && testObj.water_content_max > 0) {
      const maxWaterPct = testObj.water_content_unit === 'PPM' ? testObj.water_content_max / 10000 : testObj.water_content_max
      if (waterContent > maxWaterPct) {
        return { level: 'critical', color: 'red', text: 'Critical' }
      }
    }
    if (testObj?.tan_max != null && testObj.tan_max > 0 && tanValue > testObj.tan_max) {
      return { level: 'critical', color: 'red', text: 'Critical' }
    }
    if (testObj?.viscosity_40c_max != null && testObj.viscosity_40c_max > 0 && viscosity40c > testObj.viscosity_40c_max) {
      return { level: 'warning', color: 'yellow', text: 'Warning' }
    }
    if (testObj?.viscosity_40c_min != null && testObj.viscosity_40c_min > 0 && viscosity40c < testObj.viscosity_40c_min) {
      return { level: 'warning', color: 'yellow', text: 'Warning' }
    }

    // ============================================================
    // SETUP: Oil-type-based thresholds fallback
    // ============================================================
    const productType = product?.product_type || ''
    const waterThresholds = getWaterThresholds(productType)
    const oilTypeThresholds = getOilTypeThresholds(productType)
    const baselineTan = 0.05
    
    // CRITICAL STATUS CHECKS
    if (waterContent > waterThresholds.critical) {
      return { level: 'critical', color: 'red', text: 'Critical' }
    }
    if (tanValue - baselineTan > oilTypeThresholds.tanIncrease.critical) {
      return { level: 'critical', color: 'red', text: 'Critical' }
    }
    if (product?.baseline_viscosity_40c && viscosity40c) {
      const viscChange = Math.abs(((viscosity40c - product.baseline_viscosity_40c) / product.baseline_viscosity_40c) * 100)
      if (viscChange > oilTypeThresholds.viscosityChange.critical) {
        return { level: 'critical', color: 'red', text: 'Critical' }
      }
    }
    
    // WARNING STATUS CHECKS
    if (waterContent > waterThresholds.warning) {
      return { level: 'warning', color: 'yellow', text: 'Warning' }
    }
    if (tanValue - baselineTan > oilTypeThresholds.tanIncrease.normal) {
      return { level: 'warning', color: 'yellow', text: 'Warning' }
    }
    if (product?.baseline_viscosity_40c && viscosity40c) {
      const viscChange = Math.abs(((viscosity40c - product.baseline_viscosity_40c) / product.baseline_viscosity_40c) * 100)
      if (viscChange > oilTypeThresholds.viscosityChange.normal) {
        return { level: 'warning', color: 'yellow', text: 'Warning' }
      }
    }
    
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

  // Use full history per machine so sampling trends over long periods (months/years) are never cut off
  const filteredSamples = oilSamples
  const filteredReports = labReports

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
        latestTest.product,
        latestTest
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
      <div className="sticky top-0 z-[60] bg-white/85 backdrop-blur-xl shadow-sm border-b border-gray-100">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center gap-4">
            {/* Left: NSG Logo + OilTrack Brand */}
            <div className="flex items-center gap-3 min-w-0 select-none">
              <Image
                src="https://i.imgur.com/8nqsjFz.png"
                alt="Nabel Sakha Gemilang"
                width={90}
                height={28}
                className="h-7 w-auto object-contain flex-shrink-0"
                unoptimized
              />
              <div className="hidden sm:flex items-center border-l border-gray-200 pl-3 shrink-0">
                <Image
                  src="/teks logo.webp"
                  alt="OilTrack"
                  width={3186}
                  height={881}
                  className="h-5 w-auto object-contain shrink-0"
                />
              </div>
            </div>

            {/* Middle: Customer Logo & Company PT */}
            <div className="hidden md:flex flex-1 justify-center min-w-0">
              <div className="bg-slate-50/80 px-4 py-1.5 rounded-2xl border border-slate-200/60 flex items-center gap-3">
                {profile?.customer?.logo_url ? (
                  <Image
                    src={profile.customer.logo_url}
                    alt="Customer logo"
                    width={100}
                    height={30}
                    className="h-5 w-auto object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="w-5 h-5 bg-slate-900 rounded-md flex items-center justify-center text-white text-[9px] font-black uppercase">
                    {profile?.customer?.company_name?.charAt(0) || 'C'}
                  </div>
                )}
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest truncate max-w-[220px]">
                  {profile?.customer?.company_name || 'Customer'}
                </span>
              </div>
            </div>
            
            {/* Right: Quick CTAs + Language + Profile + Logout */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Quick CTA: Bantuan & Komplain */}
              <button
                onClick={() => setIsComplaintModalOpen(true)}
                className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                title="Pusat Bantuan & Komplain"
              >
                <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="hidden md:inline">{language === 'id' ? 'Bantuan & Komplain' : 'Help / Issue'}</span>
                <span className="md:hidden">Bantuan</span>
              </button>

              {/* Quick CTA: Ajukan Uji Lab */}
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-orange-500/15 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">{copy.requestLab.openButton}</span>
                <span className="sm:hidden">Uji Lab</span>
              </button>

              {/* Quick CTA: Ekspor PDF */}
              <button
                onClick={handleExportFleetReport}
                disabled={exporting}
                className="hidden lg:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50"
                title="Ekspor Laporan Armada PDF"
              >
                <svg className="w-3.5 h-3.5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span>{exporting ? '...' : 'PDF'}</span>
              </button>

              {/* In-App Notification Center */}
              <NotificationBell />

              {/* Language Switcher */}
              <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-[10px] font-bold select-none">
                <button onClick={() => setLanguage('id')} className={`px-2 py-1 rounded-lg transition-all ${language === 'id' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}>ID</button>
                <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded-lg transition-all ${language === 'en' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}>EN</button>
              </div>

              {/* Profile Link */}
              <a href="/dashboard/profile" className="p-2 bg-slate-100 hover:bg-orange-50 text-slate-500 hover:text-orange-600 rounded-xl transition-all border border-slate-200/60 active:scale-95" title="Profil Saya">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </a>

              {/* Logout Button */}
              <button onClick={handleSignOut} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all border border-slate-200/60 active:scale-95" title={language === 'id' ? 'Keluar Akun' : 'Sign Out'}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </header>

        {/* Paten Navigator — Symmetrical Full-Width Navbar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-2 shadow-sm select-none">
            <ShortcutNavigator
              ariaLabel={language === 'id' ? 'Navigasi dashboard cepat' : 'Quick dashboard navigation'}
              items={[
                { id: 'trend', label: copy.oilTrend },
                { id: 'analysis', label: copy.analysisAndReports },
                { id: 'lab', label: copy.labResults },
                { id: 'requests', label: language === 'id' ? 'Status Lab Request' : 'Lab Request Status' },
                { id: 'orders', label: language === 'id' ? 'Penawaran Oli' : 'Oil Quotations' },
                { id: 'complaints', label: language === 'id' ? 'Komplain & Bantuan' : 'Help & Complaints' },
              ].map((shortcut) => ({
                id: shortcut.id,
                label: shortcut.label,
                isActive: activeTab === shortcut.id,
              }))}
              onItemClick={handleShortcutClick}
            />
          </div>
        </div>
      </div>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col relative gap-8" style={{ scrollbarGutter: 'stable' }}>
        {/* Welcome Section with Dynamic Time-Aware Greeting Banner */}
        <div className="animate-pop-micro w-full">
          <div className="bg-white rounded-[2rem] border border-slate-105 p-6 sm:p-8 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
            {/* Soft accent background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-gradient-to-br from-orange-400 to-red-500 opacity-5 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
              {/* Left Side: Logo + Divider + Welcome Text */}
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                {/* Logo / Avatar Frame */}
                <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-sm flex items-center justify-center p-1.5">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt="User avatar"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded-xl"
                      unoptimized
                    />
                  ) : profile?.customer?.logo_url ? (
                    <Image
                      src={profile.customer.logo_url}
                      alt="Customer logo"
                      width={80}
                      height={80}
                      className="w-full h-full object-contain p-1"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black text-xl uppercase rounded-xl">
                      {profile?.full_name?.charAt(0) || profile?.customer?.company_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) || 'C'}
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
                    {(() => {
                      const company = profile?.customer?.company_name || (language === 'id' ? 'perusahaan Anda' : 'your company');
                      if (criticalCount > 0) {
                        return language === 'id'
                          ? `Perhatian: Terdapat ${criticalCount} unit mesin dalam kondisi kritis yang memerlukan tindakan segera untuk ${company}.`
                          : `Attention: ${criticalCount} critical machine(s) require immediate inspection for ${company}.`;
                      }
                      if (warningCount > 0) {
                        return language === 'id'
                          ? `Perhatian: Terdapat ${warningCount} mesin dalam status waspada yang membutuhkan pemantauan untuk ${company}.`
                          : `Notice: ${warningCount} machine(s) in warning status requiring attention for ${company}.`;
                      }
                      return language === 'id'
                        ? `Seluruh sistem pemantauan oli armada ${company} terpantau prima & normal hari ini.`
                        : `All fleet lubricant systems for ${company} are running prime & stable today.`;
                    })()}
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
        <div className="w-full animate-pop-micro">
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
                    const statusInfo = latestTest ? getStatus(latestTest.viscosity_40c || 0, latestTest.water_content, latestTest.tan_value, latestTest.product, latestTest) : { text: 'Unknown', color: 'gray' }
                    
                    return (
                      <div
                        key={machine.id}
                        onClick={() => handleSelectMachine(machine)}
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
                
                {selectedMachine ? (() => {
                  const selectedLatestTest = latestTestByMachineId[selectedMachine.id] || null
                  const selectedStatus = selectedLatestTest
                    ? getStatus(selectedLatestTest.viscosity_40c || 0, selectedLatestTest.water_content || 0, selectedLatestTest.tan_value || 0, selectedLatestTest.product, selectedLatestTest)
                    : { level: 'unknown' as const, text: 'N/A', color: 'gray' }

                  return (
                    <div key={selectedMachine.id} className="w-full relative z-10 animate-pop-micro">
                      <div className="flex flex-col mb-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.15em] mb-3 w-fit ${
                          selectedStatus.level === 'critical'
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : selectedStatus.level === 'warning'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          <div className={`w-1 h-1 rounded-full ${
                            selectedStatus.level === 'critical' ? 'bg-red-500' : selectedStatus.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}></div>
                          {selectedStatus.text}
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
                                {selectedLatestTest ? calculateHealthScore(selectedLatestTest) : '--'}
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
                            {selectedLatestTest
                              ? `${Math.floor((Date.now() - new Date(selectedLatestTest.test_date).getTime()) / (1000 * 60 * 60 * 24))}d`
                              : '--'}
                            <span className="text-[8px] font-bold text-slate-400 ml-0.5">ago</span>
                          </p>
                        </div>
                        <div className="bg-slate-50/50 p-4 rounded-[1.25rem] border border-slate-100 transition-all hover:bg-slate-50">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1.5">Overall Status</p>
                          <p className={`text-xl font-black tracking-tight ${
                            selectedStatus.level === 'critical' ? 'text-red-600' : selectedStatus.level === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {selectedStatus.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })() : (
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
            <div key="trend" className="w-full space-y-4">
              {/* Complete Machine Trend Banner (Historical without clipping) */}
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 p-3.5 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {language === 'id' ? `Tren Riwayat Lengkap: ${selectedMachine?.machine_name || 'Semua Mesin'}` : `Full Trend History: ${selectedMachine?.machine_name || 'All Machines'}`}
                  </span>
                  <span className="text-slate-300 text-xs">•</span>
                  <span className="text-[11px] font-bold text-slate-500">
                    {language === 'id' ? 'Menampilkan riwayat uji lab dari sampel awal hingga terbaru' : 'Displaying lab test trend from initial to latest sample'}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                    {chartData.length} {language === 'id' ? 'Titik Data' : 'Data Points'}
                  </span>
                </div>
              </div>

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
                tolerances={activeTolerances}
                onOpenLabDetails={() => {
                  setActiveTab('lab')
                  syncUrlParams('lab', selectedMachine?.id)
                }}
                onRequestLab={() => {
                  setModalInitialData({ machine_id: selectedMachine?.id })
                  setIsRequestModalOpen(true)
                }}
              />
            </div>
          </div>

          {/* Analysis Tab */}
          <div className={`w-full ${activeTab === 'analysis' ? 'block animate-pop-micro' : 'hidden'}`}>
            <AnalysisSection
              language={language}
              selectedMachine={selectedMachine}
              machineInsights={machineInsights}
              selectedMachineTrendAlerts={selectedMachineTrendAlerts}
              labRequests={labRequests}
              handleQuickLabRequest={handleQuickLabRequest}
              handleExportFleetReport={handleExportFleetReport}
              exporting={exporting}
              setActiveTab={setActiveTab}
              avgHealthScore={avgHealthScore}
              healthyCount={healthyCount}
              warningCount={warningCount}
              criticalCount={criticalCount}
              copy={copy}
            />
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
            <LabRequestsSection
              labRequests={labRequests}
              language={language}
              expandedRequestIds={expandedRequestIds}
              toggleRequestExpand={toggleRequestExpand}
              onOpenRequestModal={() => {
                setModalInitialData(undefined)
                setIsRequestModalOpen(true)
              }}
            />
          </div>
          {/* Orders Tab */}
          <div className={`w-full ${activeTab === 'orders' ? 'block animate-pop-micro' : 'hidden'}`}>
            <div key="orders" className="w-full">
              <OrdersSection
                customerId={profile.customer_id || ''}
                products={products}
                initialOrders={initialOrders}
                initialComplaints={complaints}
                language={language}
              />
            </div>
          </div>

          {/* Complaints Tab */}
          <div className={`w-full ${activeTab === 'complaints' ? 'block animate-pop-micro' : 'hidden'}`}>
            <ComplaintsSection
              complaints={complaints}
              machines={initialMachines}
              orders={initialOrders}
              language={language}
              isModalOpen={isComplaintModalOpen}
              setIsModalOpen={setIsComplaintModalOpen}
              onComplaintAdded={(newC) => setComplaints(prev => [newC, ...prev])}
            />
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
      <RequestLabModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        initialMachines={initialMachines}
        initialSalesTeam={initialSalesTeam}
        initialData={modalInitialData}
        copy={copy}
        language={language}
        onSubmit={handleSendRequest}
        isSaving={requestSaving}
      />
    </div>
  )
}
