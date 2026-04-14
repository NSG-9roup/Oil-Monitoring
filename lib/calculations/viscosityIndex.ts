/**
 * ASTM D2270 Viscosity Index Calculator
 * Implementasi sesuai standar ASTM D2270 menggunakan interpolasi linear dari lookup table L dan H.
 * 
 * Referensi: ASTM D2270 - Standard Practice for Calculating Viscosity Index from
 * Kinematic Viscosity at 40°C and 100°C
 */

/**
 * Tabel L dan H dari ASTM D2270.
 * Kolom: [v100 (cSt), L, H]
 * Untuk v100 di antara dua baris, lakukan interpolasi linear.
 */
const ASTM_D2270_TABLE: [number, number, number][] = [
  [2.0,   7.994,   6.394],
  [2.1,   8.640,   6.894],
  [2.2,   9.309,   7.410],
  [2.3,   10.00,   7.944],
  [2.4,   10.71,   8.496],
  [2.5,   11.45,   9.063],
  [2.6,   12.21,   9.647],
  [2.7,   13.00,   10.25],
  [2.8,   13.80,   10.87],
  [2.9,   14.63,   11.50],
  [3.0,   15.48,   12.15],
  [3.5,   19.89,   15.65],
  [4.0,   24.91,   19.56],
  [4.5,   30.43,   23.76],
  [5.0,   36.44,   28.24],
  [5.5,   42.92,   32.98],
  [6.0,   49.87,   37.97],
  [6.5,   57.28,   43.21],
  [7.0,   65.14,   48.70],
  [7.5,   73.45,   54.43],
  [8.0,   82.19,   60.40],
  [8.5,   91.38,   66.61],
  [9.0,   100.0,   73.06],
  [9.5,   110.00,  79.74],
  [10.0,  120.0,   86.66],
  [11.0,  143.0,   101.4],
  [12.0,  168.0,   117.5],
  [13.0,  195.0,   134.9],
  [14.0,  224.0,   153.7],
  [15.0,  255.0,   173.8],
  [16.0,  288.0,   195.2],
  [17.0,  323.0,   217.9],
  [18.0,  360.0,   242.0],
  [19.0,  400.0,   267.5],
  [20.0,  442.0,   294.3],
  [22.0,  531.0,   351.6],
  [24.0,  628.0,   414.3],
  [26.0,  733.0,   482.5],
  [28.0,  846.0,   556.3],
  [30.0,  967.0,   636.0],
  [32.0,  1097,    721.8],
  [34.0,  1234,    813.7],
  [36.0,  1381,    912.2],
  [38.0,  1535,    1017],
  [40.0,  1698,    1128],
  [42.0,  1870,    1245],
  [44.0,  2052,    1368],
  [46.0,  2243,    1497],
  [48.0,  2443,    1632],
  [50.0,  2653,    1773],
  [55.0,  3205,    2122],
  [60.0,  3811,    2507],
  [65.0,  4472,    2929],
  [70.0,  5187,    3388],
]

/**
 * Interpolasi linear antara dua titik dalam tabel ASTM D2270
 */
function interpolateLH(v100: number): { L: number; H: number } | null {
  if (v100 < 2.0 || v100 > 70.0) return null

  // Cari dua titik yang mengapit v100
  let lower = ASTM_D2270_TABLE[0]
  let upper = ASTM_D2270_TABLE[ASTM_D2270_TABLE.length - 1]

  for (let i = 0; i < ASTM_D2270_TABLE.length - 1; i++) {
    if (ASTM_D2270_TABLE[i][0] <= v100 && ASTM_D2270_TABLE[i + 1][0] >= v100) {
      lower = ASTM_D2270_TABLE[i]
      upper = ASTM_D2270_TABLE[i + 1]
      break
    }
  }

  const [lv100, lL, lH] = lower
  const [uv100, uL, uH] = upper

  if (uv100 === lv100) return { L: lL, H: lH }

  const t = (v100 - lv100) / (uv100 - lv100)
  return {
    L: lL + t * (uL - lL),
    H: lH + t * (uH - lH),
  }
}

export interface ViscosityIndexResult {
  vi: number
  method: 'standard' | 'high-vi'
  isValid: boolean
  error?: string
}

/**
 * Hitung Viscosity Index sesuai ASTM D2270
 * 
 * @param v40 - Viskositas kinematik pada 40°C (cSt)
 * @param v100 - Viskositas kinematik pada 100°C (cSt)
 * @returns ViscosityIndexResult dengan nilai VI dan metadata
 */
export function calculateVI(v40: number, v100: number): ViscosityIndexResult {
  // Validasi input
  if (v100 < 2.0) {
    return {
      vi: 0,
      method: 'standard',
      isValid: false,
      error: 'Viscosity @100°C must be ≥ 2.0 cSt for ASTM D2270',
    }
  }

  if (v100 > 70.0) {
    return {
      vi: 0,
      method: 'standard',
      isValid: false,
      error: 'Viscosity @100°C exceeds ASTM D2270 table range (max 70 cSt)',
    }
  }

  if (v40 <= 0) {
    return {
      vi: 0,
      method: 'standard',
      isValid: false,
      error: 'Viscosity @40°C must be positive',
    }
  }

  const lh = interpolateLH(v100)
  if (!lh) {
    return {
      vi: 0,
      method: 'standard',
      isValid: false,
      error: 'Cannot interpolate L/H values from ASTM D2270 table',
    }
  }

  const { L, H } = lh

  // Formula ASTM D2270 untuk VI ≤ 100
  // VI = (L - U) / (L - H) × 100
  // dimana U = viskositas kinematik pada 40°C dari sampel yang diuji
  if (L === H) {
    return {
      vi: 0,
      method: 'standard',
      isValid: false,
      error: 'L and H values are equal; cannot compute VI',
    }
  }

  const viRaw = ((L - v40) / (L - H)) * 100
  const vi = Math.round(viRaw)

  // Untuk VI > 100, ASTM D2270 menggunakan formula alternatif berbasis N
  // (implementasi lanjutan untuk high-VI synthetic oils)
  if (vi > 100) {
    // Simplified high-VI approximation (full ASTM formula membutuhkan tabel N)
    return {
      vi: Math.min(vi, 400), // clamp reasonable max
      method: 'high-vi',
      isValid: true,
    }
  }

  return {
    vi: Math.max(vi, -100), // clamp minimum
    method: 'standard',
    isValid: true,
  }
}

/**
 * Helper: format VI dengan label kualitas
 */
export function formatVILabel(vi: number, language: 'id' | 'en' = 'id'): string {
  if (language === 'id') {
    if (vi >= 120) return `${vi} (Sangat Tinggi - Synthetic)`
    if (vi >= 95) return `${vi} (Baik)`
    if (vi >= 80) return `${vi} (Cukup)`
    return `${vi} (Rendah - Perlu Evaluasi)`
  }
  if (vi >= 120) return `${vi} (Very High - Synthetic)`
  if (vi >= 95) return `${vi} (Good)`
  if (vi >= 80) return `${vi} (Fair)`
  return `${vi} (Low - Needs Evaluation)`
}
