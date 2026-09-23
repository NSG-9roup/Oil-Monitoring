export type RunningHoursUnit = 'hours' | 'months' | 'years'

/**
 * Parses running hours unit and clean notes.
 * If running_hours_unit column is present in DB, uses it.
 * If not present yet (pending SQL migration), extracts [UNIT:hours|months|years] from notes.
 */
export function parseRunningHoursMetadata(
  notes?: string | null,
  explicitUnit?: string | null
): {
  unit: RunningHoursUnit
  cleanNotes: string
} {
  const match = (notes || '').match(/\[UNIT:(hours|months|years)\]/i)
  if (match) {
    const extractedUnit = match[1].toLowerCase() as RunningHoursUnit
    const cleanNotes = (notes || '').replace(/\[UNIT:(hours|months|years)\]/gi, '').trim()
    return {
      unit: (explicitUnit && explicitUnit !== 'hours') ? (explicitUnit as RunningHoursUnit) : extractedUnit,
      cleanNotes
    }
  }

  const validUnits: readonly string[] = ['hours', 'months', 'years']
  const unit = (explicitUnit && validUnits.includes(explicitUnit.toLowerCase()))
    ? (explicitUnit.toLowerCase() as RunningHoursUnit)
    : 'hours'

  return {
    unit,
    cleanNotes: notes || ''
  }
}

/**
 * Formats running hours display with appropriate localized unit.
 */
export function formatRunningHoursDisplay(
  hours?: number | null,
  unit?: string | null,
  language: 'id' | 'en' = 'id'
): string | null {
  if (hours === undefined || hours === null) return null
  const u = (unit || 'hours').toLowerCase()
  if (u === 'months') {
    return `${hours} ${language === 'id' ? 'Bulan' : 'mos'}`
  }
  if (u === 'years') {
    return `${hours} ${language === 'id' ? 'Tahun' : 'yrs'}`
  }
  return `${hours} ${language === 'id' ? 'Jam' : 'hrs'}`
}
