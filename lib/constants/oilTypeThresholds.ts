/**
 * Oil Type Thresholds - Industry Reference
 * ==========================================
 * 
 * These are DEFAULT industry-standard thresholds for different oil types.
 * Used ONLY in 'oil_type_based' evaluation mode.
 * 
 * IMPORTANT:
 * - These are reference values, NOT absolute rules
 * - Each project/equipment may have different requirements
 * - Frontend reads these as defaults
 * - Backend/Database will eventually define custom thresholds per oil type
 *
 * @see getWaterThresholds() in DashboardClient.tsx
 */

export type OilType = 
  | 'hydraulic' 
  | 'turbine' 
  | 'engine' 
  | 'motor' 
  | 'gear' 
  | 'compressor' 
  | 'transformer' 
  | 'spindle' 
  | 'circulating'
  | 'unknown'

export interface WaterThreshold {
  warning: number    // Stored as percent (PPM / 10000). Example: 0.2 = 0.2% = 2000 PPM
  critical: number   // Stored as percent (PPM / 10000)
}

export interface PercentageThreshold {
  normal: number
  warning: number
  critical: number
}

export interface OilTypeThresholds {
  water: WaterThreshold
  viscosityChange: PercentageThreshold
  tanIncrease: PercentageThreshold
}

/**
 * SysLab Oil-Type-Based Thresholds (In-Service Oil, Generic Evaluation)
 * All water values are stored as percent: PPM / 10000
 */
export const OIL_TYPE_THRESHOLDS: Record<OilType, OilTypeThresholds> = {
  hydraulic: {
    water: { warning: 0.2, critical: 0.5 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.4, critical: 0.4 },
  },
  compressor: {
    water: { warning: 0.2, critical: 0.4 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.5, critical: 0.5 },
  },
  gear: {
    water: { warning: 0.3, critical: 0.5 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.3, warning: 0.6, critical: 0.6 },
  },
  turbine: {
    water: { warning: 0.1, critical: 0.2 },
    viscosityChange: { normal: 5, warning: 10, critical: 15 },
    tanIncrease: { normal: 0.1, warning: 0.2, critical: 0.2 },
  },
  circulating: {
    water: { warning: 0.2, critical: 0.4 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.4, critical: 0.4 },
  },
  engine: {
    water: { warning: 0.2, critical: 0.4 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.4, critical: 0.4 },
  },
  motor: {
    water: { warning: 0.2, critical: 0.4 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.4, critical: 0.4 },
  },
  transformer: {
    water: { warning: 0.2, critical: 0.4 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.4, critical: 0.4 },
  },
  spindle: {
    water: { warning: 0.2, critical: 0.4 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.4, critical: 0.4 },
  },
  unknown: {
    water: { warning: 0.2, critical: 0.4 },
    viscosityChange: { normal: 10, warning: 15, critical: 20 },
    tanIncrease: { normal: 0.2, warning: 0.4, critical: 0.4 },
  },
}

/**
 * Helper function to classify oil type from product_type string
 * @param productType - Product type from database (e.g., "Hydraulic Oil ISO VG 46")
 * @returns Normalized oil type key for threshold lookup
 */
export function classifyOilType(productType: string): OilType {
  if (!productType) return 'unknown'

  const type = productType.toLowerCase()

  // Check specific-use oils first (before general categories)
  if (type.includes('compressor') || type.includes('air')) return 'compressor'
  if (type.includes('circulating') || type.includes('bearing')) return 'circulating'
  if (type.includes('spindle')) return 'spindle'
  if (type.includes('transformer')) return 'transformer'
  if (type.includes('turbine')) return 'turbine'
  if (type.includes('gear')) return 'gear'
  if (type.includes('engine')) return 'engine'
  if (type.includes('motor')) return 'motor'
  if (type.includes('hydraulic')) return 'hydraulic'

  return 'unknown'
}

/**
 * Get water thresholds for specific product type
 * @param productType - Product type string
 * @returns Water threshold object { warning, critical }
 */
export function getOilTypeWaterThresholds(productType: string): WaterThreshold {
  const oilType = classifyOilType(productType)
  return OIL_TYPE_THRESHOLDS[oilType].water
}

export function getOilTypeThresholds(productType: string): OilTypeThresholds {
  const oilType = classifyOilType(productType)
  return OIL_TYPE_THRESHOLDS[oilType]
}
