'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { User } from '@supabase/supabase-js'
import { getOilTypeWaterThresholds, getOilTypeThresholds, classifyOilType, type OilType } from '@/lib/constants/oilTypeThresholds'

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
  }
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
  profile: any
  initialMachines: Machine[]
}

export default function DashboardClient({ user, profile, initialMachines }: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const detailsRef = useRef<HTMLDivElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [machines, setMachines] = useState<Machine[]>(initialMachines)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(initialMachines[0] || null)
  const [oilSamples, setOilSamples] = useState<OilSample[]>([])
  const [labReports, setLabReports] = useState<LabReport[]>([])
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '6m' | 'all'>('all')
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | undefined>()
  const [latestTestByMachineId, setLatestTestByMachineId] = useState<Record<string, OilSample>>({})
  const [fleetInsightsLoading, setFleetInsightsLoading] = useState(false)

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
    } catch (error: any) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF: ' + error.message)
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
  const calculateHealthScore = (test: any) => {
    if (!test) return null
    let score = 100
    
    // ============================================================
    // STEP 1: Determine evaluation mode and thresholds
    // ============================================================
    const evaluationMode = test.evaluation_mode || 'oil_type_based'
    const productType = test.product?.product_type || ''
    const oilType = getOilType(productType)  // Centralized classification (ONCE)
    const waterThresholds = getWaterThresholds(productType)
    const oilTypeThresholds = getOilTypeThresholds(productType)
    
    // Baseline data (if available)
    const hasBaseline = test.product?.baseline_viscosity_40c != null
    const useProductSpecific = evaluationMode === 'product_specific' && hasBaseline
    
    const baseline40 = test.product?.baseline_viscosity_40c
    const baseline100 = test.product?.baseline_viscosity_100c
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
  const getStatus = (viscosity40c: number, waterContent: number, tanValue: number, product: any): { level: string; color: string; text: string } => {
    // ============================================================
    // SETUP: Oil-type-based thresholds
    // ============================================================
    const productType = product?.product_type || ''
    const oilType = getOilType(productType)
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
  const getRecommendations = (viscosity40c: number, waterContent: number, tanValue: number, product: any, previousTest: any, evaluationMode?: string) => {
    const recommendations = []
    
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

  useEffect(() => {
    if (selectedMachine) {
      loadMachineData(selectedMachine.id)
    }
  }, [selectedMachine])

  useEffect(() => {
    if (machines.length > 0) {
      loadFleetInsights()
    }
  }, [machines])

  async function loadFleetInsights() {
    const machineIds = machines.map((machine) => machine.id)
    if (machineIds.length === 0) {
      setLatestTestByMachineId({})
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
      ;(data || []).forEach((test: any) => {
        if (!latestMap[test.machine_id]) {
          latestMap[test.machine_id] = test
        }
      })

      setLatestTestByMachineId(latestMap)
    } catch (error) {
      console.error('Fleet insight error:', error)
      setLatestTestByMachineId({})
    } finally {
      setFleetInsightsLoading(false)
    }
  }

  async function loadMachineData(machineId: string) {
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
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Filter data based on time range
  const filterByTimeRange = (data: any[]) => {
    if (timeRange === 'all') return data
    
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
          status: { level: 'unknown', text: 'No Data' },
          daysSinceTest: null as number | null,
          priorityScore: 0,
          nextAction: 'Schedule initial sampling now',
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

  const chartData = filteredSamples.map(sample => ({
    date: new Date(sample.test_date).toLocaleDateString(),
    viscosity_40c: sample.viscosity_40c || 0,
    viscosity_100c: sample.viscosity_100c || 0,
    water: sample.water_content ? sample.water_content * 100 : 0,
    tan: sample.tan_value || 0
  }))

  return (
    <div className="clean-ui min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 bg-grid-pattern flex flex-col" style={{ backgroundSize: '40px 40px' }}>
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            {/* Left: NSG Logo + Brand */}
            <div className="flex items-center gap-3">
              <img 
                src="https://i.imgur.com/8nqsjFz.png" 
                alt="Nabel Sakha Gemilang" 
                className="h-10 w-auto object-contain"
              />
              <div className="border-l-2 border-gray-300 pl-3">
                <h1 className="text-xl font-bold text-gray-800">OilTrack™</h1>
              </div>
            </div>
            
            {/* Right: User Info + Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-gray-500 text-xs">{profile?.customer?.company_name}</p>
                <p className="text-gray-800 font-medium text-sm">{profile?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white p-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Sign Out"
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
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-2">Welcome back</p>
              <h1 className="text-4xl font-black text-gray-900">
                {profile?.customer?.company_name?.split(' ').map((word: string, i: number) => 
                  i === 0 ? word : <span key={i} className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">{word}</span>
                ).reduce((prev: any, curr: any) => [prev, ' ', curr])}
              </h1>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                <div className="w-40 h-32 rounded-2xl overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center shadow-xl p-4 hover:scale-105 transition-transform duration-300">
                  {profile?.customer?.logo_url ? (
                    <img 
                      src={profile.customer.logo_url} 
                      alt={profile.customer.company_name}
                      className="max-w-full max-h-full object-contain"
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
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Status</p>
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border-2 ${
                    profile?.customer?.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-300' 
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {profile?.customer?.status === 'active' && (
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    )}
                    {profile?.customer?.status === 'active' ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Total Machines */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Machines</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900">{machines.length}</span>
                    <span className="text-sm text-gray-500 font-semibold">total</span>
                  </div>
                </div>

                {/* User Name */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100 col-span-2 md:col-span-1">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">User</p>
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

        {/* Purchase History Button */}
        <button
          onClick={() => router.push('/purchases')}
          className="w-full mb-8 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 rounded-2xl shadow-xl p-6 text-white transition-all transform hover:scale-[1.02] flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-black">Purchase History</h3>
              <p className="text-white/90 text-sm font-medium mt-1">View detailed purchase records and transaction history</p>
            </div>
          </div>
          <svg className="w-6 h-6 text-white transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Phase 1: Rule-Based Insight Engine */}
        <section className="mb-8 bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black text-gray-900">
                Insight <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">Engine</span>
              </h2>
              <p className="text-gray-600 font-medium mt-1">Phase 1 intelligence: health scoring, priority ranking, and maintenance actions</p>
            </div>
            <button
              onClick={loadFleetInsights}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
            >
              Refresh Insights
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100/70 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-1">Critical Machines</p>
              <p className="text-3xl font-black text-red-700">{criticalCount}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-100/70 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">Warning Machines</p>
              <p className="text-3xl font-black text-amber-700">{warningCount}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-green-100/70 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 mb-1">Healthy Machines</p>
              <p className="text-3xl font-black text-emerald-700">{healthyCount}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Average Health</p>
              <p className="text-3xl font-black text-slate-800">{avgHealthScore !== null ? `${avgHealthScore}/100` : '-'}</p>
            </div>
          </div>

          <div className="bg-gray-50/80 rounded-2xl p-5 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              {criticalCount > 0
                ? `Immediate focus required: ${criticalCount} machine${criticalCount > 1 ? 's are' : ' is'} in critical condition. Prioritize contamination source checks and repeat sampling within 72 hours.`
                : warningCount > 0
                ? `System is stable with caution: ${warningCount} machine${warningCount > 1 ? 's need' : ' needs'} closer monitoring. Plan verification sampling in the next 14 days.`
                : 'System condition is healthy overall. Continue routine monthly sampling and keep contamination prevention controls active.'}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-black text-gray-900 mb-3">Maintenance Priority Queue</h3>
            {fleetInsightsLoading ? (
              <p className="text-gray-500">Calculating machine priorities...</p>
            ) : (
              <div className="space-y-3">
                {machineInsights.slice(0, 5).map((item, idx) => (
                  <div key={item.machine.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                      <div>
                        <p className="font-bold text-gray-900">{item.machine.machine_name}</p>
                        <p className="text-xs text-gray-500">{item.machine.location || 'No location'} • Last test {item.daysSinceTest === null ? 'N/A' : `${item.daysSinceTest} days ago`}</p>
                      </div>
                    </div>
                    <div className="lg:text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recommended Action</p>
                      <p className="text-sm font-medium text-gray-800">{item.nextAction}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Machine Health Overview - Neuros Style with Horizontal Carousel */}
        <div className="mb-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-black text-gray-900">
                Machine <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">Health</span> Overview
              </h2>
              <p className="text-gray-600 font-medium mt-1">Real-time monitoring of your equipment condition</p>
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
              const machineTests = labReports.filter((test: any) => test.machine_id === machine.id)
              const latestTest = machineTests.length > 0 ? machineTests[0] : null
              const healthScore = latestTest ? calculateHealthScore(latestTest) : null
              const status = latestTest ? getStatus(latestTest.viscosity_40c || 0, latestTest.water_content, latestTest.tan_value, latestTest.product) : null
              const daysSinceTest = latestTest ? Math.floor((Date.now() - new Date(latestTest.test_date).getTime()) / (1000 * 60 * 60 * 24)) : null

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
                    selectedMachine?.id === machine.id 
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
                      <p className="text-sm text-gray-600 font-medium">{machine.location || 'No location'}</p>
                    </div>

                    {/* Health Score */}
                    {healthScore !== null ? (
                      <div className="mb-4">
                        <div className="flex items-baseline justify-between mb-2">
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Health Score</span>
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
                        <p className="text-sm text-gray-500 font-medium">No test data</p>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-gray-600 font-semibold mb-0.5">Last Test</p>
                        <p className="font-bold text-gray-900">
                          {daysSinceTest !== null ? (
                            daysSinceTest === 0 ? 'Today' :
                            daysSinceTest === 1 ? 'Yesterday' :
                            `${daysSinceTest}d ago`
                          ) : 'Never'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-gray-600 font-semibold mb-0.5">Status</p>
                        <p className="font-bold text-gray-900">
                          {status?.text || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Hover Indicator */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-center text-primary-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details →
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
                Select Machine
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
                  {machine.machine_name} - {machine.model} ({machine.location || 'No location'})
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Filter */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-secondary-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Time Range</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '7d'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '30d'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '90d'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                90 Days
              </button>
              <button
                onClick={() => setTimeRange('6m')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === '6m'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                6 Months
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  timeRange === 'all'
                    ? 'bg-gradient-industrial text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
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
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Machine Selected</h3>
            <p className="text-gray-600">Please select a machine from the dropdown above to view its data.</p>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && selectedMachine && (
          <div className="space-y-8">
            {/* Charts Section */}
            <div className="bg-gray-50 rounded-3xl p-8 -mx-4 sm:mx-0">
              <div className="mb-6">
                <h2 className="text-3xl font-black text-gray-900">
                  Performance <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">Trends</span>
                </h2>
                <p className="text-gray-600 font-medium mt-1">Monitor oil condition parameters over time</p>
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
                    <p className="font-semibold">No sample data available</p>
                    <p className="text-sm text-gray-400 mt-1">Check browser console for debug info</p>
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
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Water Content Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-secondary-500 rounded-full mr-3"></span>
                  Water Content
                </h3>
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <p>No data available</p>
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
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* TAN Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-industrial-500 rounded-full mr-3"></span>
                  Total Acid Number (TAN)
                </h3>
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-gray-400">
                    <p>No data available</p>
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
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
              </div>
            </div>

            {/* Lab Reports */}
            <div className="bg-gray-50 rounded-3xl p-8 -mx-4 sm:mx-0">
              <div className="mb-6">
                <h2 className="text-3xl font-black text-gray-900">
                  Lab <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600">Reports</span>
                </h2>
                <p className="text-gray-600 font-medium mt-1">
                  {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'} in selected time range
                </p>
              </div>
              {filteredReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No lab reports available for selected time range</p>
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
                                  {status.level.charAt(0).toUpperCase() + status.level.slice(1)}
                                </div>
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <span className="text-gray-600">
                                  <span className="font-semibold text-blue-900">Viscosity:</span> {report.viscosity_40c?.toFixed(1) || 'N/A'} / {report.viscosity_100c?.toFixed(1) || 'N/A'} cSt
                                </span>
                                <span className="text-gray-600">
                                  <span className="font-semibold text-cyan-900">Water:</span> {report.water_content ? (report.water_content * 100).toFixed(2) : '0.00'}%
                                </span>
                                <span className="text-gray-600">
                                  <span className="font-semibold text-purple-900">TAN:</span> {report.tan_value?.toFixed(2) || 'N/A'} mg KOH/g
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {report.pdf_path && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const { data } = supabase.storage.from('lab-reports').getPublicUrl(report.pdf_path)
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
                                  View Report
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
                                  <h4 className="text-xl font-black text-white">Complete Analysis</h4>
                                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full">
                                    {status.text.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-white/80 text-xs mt-2 font-medium">
                                  Evaluation based on industry-standard oil type practices
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
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Machine</p>
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
                                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Product</p>
                                  <p className="text-sm font-bold text-gray-900 mt-1">{report.product?.product_name || 'N/A'}</p>
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
                                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Viscosity 40°C</p>
                                  <span className={`text-lg font-black ${
                                    viscosity40Trend.direction === 'up' ? 'text-red-600' :
                                    viscosity40Trend.direction === 'down' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{viscosity40Trend.icon}</span>
                                </div>
                                <p className="text-3xl font-black text-blue-900">{report.viscosity_40c?.toFixed(1) || 'N/A'}</p>
                                <p className="text-xs text-blue-700 mt-1 font-semibold">cSt</p>
                              </div>

                              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-4 border-2 border-indigo-200">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">Viscosity 100°C</p>
                                  <span className={`text-lg font-black ${
                                    viscosity100Trend.direction === 'up' ? 'text-red-600' :
                                    viscosity100Trend.direction === 'down' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{viscosity100Trend.icon}</span>
                                </div>
                                <p className="text-3xl font-black text-indigo-900">{report.viscosity_100c?.toFixed(1) || 'N/A'}</p>
                                <p className="text-xs text-indigo-700 mt-1 font-semibold">cSt</p>
                              </div>
                              
                              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl p-4 border-2 border-cyan-200">
                                <div className="flex justify-between items-start mb-2">
                                  <p className="text-xs font-bold text-cyan-800 uppercase tracking-wide">Water Content</p>
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
                                  <p className="text-xs font-bold text-purple-800 uppercase tracking-wide">TAN Value</p>
                                  <span className={`text-lg font-black ${
                                    tanTrend.direction === 'up' ? 'text-red-600' :
                                    tanTrend.direction === 'down' ? 'text-green-600' :
                                    'text-gray-600'
                                  }`}>{tanTrend.icon}</span>
                                </div>
                                <p className="text-3xl font-black text-purple-900">{report.tan_value?.toFixed(2) || 'N/A'}</p>
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
                                    const { data } = supabase.storage.from('lab-reports').getPublicUrl(report.pdf_path)
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
                                    handleDownloadPDF(report.pdf_path, report.test_date)
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
              <img 
                src="/logos/total-energies.png" 
                alt="TotalEnergies" 
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
