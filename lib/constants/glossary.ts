/**
 * Glossary — definisi istilah teknis oil monitoring
 * Bilingual (ID/EN), dengan threshold range untuk edukasi user
 */

export interface GlossaryEntry {
  term: string
  definition: string
  unit: string
  normalRange: string
  warningRange: string
  criticalRange: string
  tip?: string
}

export type GlossaryKey =
  | 'tan'
  | 'viscosity40c'
  | 'viscosity100c'
  | 'viscosityIndex'
  | 'waterContent'
  | 'healthScore'
  | 'ppm'
  | 'cSt'

export const glossary: Record<GlossaryKey, { id: GlossaryEntry; en: GlossaryEntry }> = {
  tan: {
    id: {
      term: 'Total Acid Number (TAN)',
      definition:
        'Mengukur tingkat keasaman oli akibat proses oksidasi dan kontaminasi. Nilai yang tinggi menunjukkan oli sudah terdegradasi dan berisiko menyebabkan korosi pada komponen mesin.',
      unit: 'mg KOH/g',
      normalRange: '< 0.5 mg KOH/g',
      warningRange: '0.5 – 1.0 mg KOH/g',
      criticalRange: '> 1.0 mg KOH/g',
      tip: 'Semakin rendah nilai TAN, semakin baik kondisi oli.',
    },
    en: {
      term: 'Total Acid Number (TAN)',
      definition:
        'Measures the acidity of oil due to oxidation and contamination. High values indicate oil degradation, posing corrosion risks to machine components.',
      unit: 'mg KOH/g',
      normalRange: '< 0.5 mg KOH/g',
      warningRange: '0.5 – 1.0 mg KOH/g',
      criticalRange: '> 1.0 mg KOH/g',
      tip: 'Lower TAN = healthier oil.',
    },
  },

  viscosity40c: {
    id: {
      term: 'Viskositas @40°C',
      definition:
        'Kekentalan oli diukur pada suhu 40°C, merepresentasikan kondisi sistem dalam keadaan hangat. Digunakan sebagai parameter utama dalam grade viscosity oli.',
      unit: 'cSt (centistokes)',
      normalRange: 'Sesuai spesifikasi grade (contoh: VG46 = 41.4–50.6 cSt)',
      warningRange: '±10% dari batas spesifikasi',
      criticalRange: '>±20% dari batas spesifikasi',
      tip: 'Setiap produk oli memiliki range normal yang berbeda sesuai grade-nya.',
    },
    en: {
      term: 'Viscosity @40°C',
      definition:
        'Oil kinematic viscosity measured at 40°C, representing warm system operation. Used as the primary parameter for oil viscosity grading.',
      unit: 'cSt (centistokes)',
      normalRange: 'Per grade spec (e.g., VG46 = 41.4–50.6 cSt)',
      warningRange: '±10% of spec limit',
      criticalRange: '>±20% of spec limit',
      tip: 'Each oil product has a different normal range based on its grade.',
    },
  },

  viscosity100c: {
    id: {
      term: 'Viskositas @100°C',
      definition:
        'Kekentalan oli diukur pada suhu 100°C, merepresentasikan kondisi sistem pada suhu operasi penuh. Penting untuk mengevaluasi performa di suhu tinggi.',
      unit: 'cSt (centistokes)',
      normalRange: 'Sesuai spesifikasi grade produk',
      warningRange: '±15% dari batas spesifikasi',
      criticalRange: '>±25% dari batas spesifikasi',
      tip: 'Viskositas @100°C yang terlalu rendah berarti oli tidak cukup melindungi komponen saat mesin panas.',
    },
    en: {
      term: 'Viscosity @100°C',
      definition:
        'Oil kinematic viscosity at 100°C, representing full operating temperature conditions. Important for evaluating high-temperature performance.',
      unit: 'cSt (centistokes)',
      normalRange: 'Per product grade spec',
      warningRange: '±15% of spec limit',
      criticalRange: '>±25% of spec limit',
      tip: 'Too low at 100°C means the oil cannot adequately protect components when the machine is hot.',
    },
  },

  viscosityIndex: {
    id: {
      term: 'Viscosity Index (VI)',
      definition:
        'Angka yang menunjukkan seberapa stabil kekentalan oli saat suhu berubah. Nilai VI tinggi berarti oli tetap menjaga kekentalan optimal di berbagai suhu — dari dingin hingga panas.',
      unit: 'Tidak berdimensi (dimensionless)',
      normalRange: '> 95 (Most mineral oils)',
      warningRange: '80 – 95',
      criticalRange: '< 80',
      tip: 'Oli synthetic biasanya memiliki VI lebih tinggi dari oli mineral.',
    },
    en: {
      term: 'Viscosity Index (VI)',
      definition:
        'A number indicating how stable oil viscosity remains across temperature changes. A high VI means the oil maintains optimal viscosity from cold to hot conditions.',
      unit: 'Dimensionless',
      normalRange: '> 95 (Most mineral oils)',
      warningRange: '80 – 95',
      criticalRange: '< 80',
      tip: 'Synthetic oils typically have higher VI than mineral oils.',
    },
  },

  waterContent: {
    id: {
      term: 'Kandungan Air (Water Content)',
      definition:
        'Persentase air yang terlarut atau tersuspensi dalam oli. Air adalah kontaminan utama yang mempercepat oksidasi, mengurangi efektivitas pelumas, dan dapat menyebabkan korosi dan kelelahan logam.',
      unit: '% volume (atau PPM)',
      normalRange: '< 0.05% (500 PPM)',
      warningRange: '0.05% – 0.15% (500–1500 PPM)',
      criticalRange: '> 0.15% (> 1500 PPM)',
      tip: 'Air dalam oli sering berasal dari kondensasi atau kebocoran sistem pendingin.',
    },
    en: {
      term: 'Water Content',
      definition:
        'Percentage of water dissolved or suspended in oil. Water is a primary contaminant that accelerates oxidation, reduces lubrication effectiveness, and can cause corrosion and metal fatigue.',
      unit: '% volume (or PPM)',
      normalRange: '< 0.05% (500 PPM)',
      warningRange: '0.05% – 0.15% (500–1500 PPM)',
      criticalRange: '> 0.15% (> 1500 PPM)',
      tip: 'Water in oil often comes from condensation or coolant system leaks.',
    },
  },

  healthScore: {
    id: {
      term: 'Health Score',
      definition:
        'Nilai gabungan 0–100 yang merepresentasikan kondisi keseluruhan oli mesin. Dihitung dari kombinasi viskositas, kandungan air, nilai TAN, dan usia data. Semakin tinggi semakin baik.',
      unit: 'Skor 0–100',
      normalRange: '≥ 80 (Kondisi baik)',
      warningRange: '60 – 79 (Perlu perhatian)',
      criticalRange: '< 60 (Tindakan segera diperlukan)',
      tip: 'Health Score bukan pengganti analisis laboran — gunakan sebagai indikator awal.',
    },
    en: {
      term: 'Health Score',
      definition:
        "A composite 0–100 score representing the overall condition of a machine's oil. Calculated from viscosity, water content, TAN, and data age. Higher is better.",
      unit: 'Score 0–100',
      normalRange: '≥ 80 (Good condition)',
      warningRange: '60 – 79 (Needs attention)',
      criticalRange: '< 60 (Immediate action required)',
      tip: 'Health Score is an early indicator, not a replacement for lab analysis.',
    },
  },

  ppm: {
    id: {
      term: 'PPM (Parts Per Million)',
      definition:
        'Satuan konsentrasi yang berarti satu bagian per satu juta bagian. Digunakan untuk mengukur kandungan air atau partikel kontaminan dalam oli dengan konsentrasi sangat kecil.',
      unit: 'mg/kg atau µl/l',
      normalRange: '< 500 PPM (untuk kandungan air)',
      warningRange: '500 – 1500 PPM',
      criticalRange: '> 1500 PPM',
    },
    en: {
      term: 'PPM (Parts Per Million)',
      definition:
        'A concentration unit meaning one part per million parts. Used to measure very small concentrations of water or contaminant particles in oil.',
      unit: 'mg/kg or µl/l',
      normalRange: '< 500 PPM (for water content)',
      warningRange: '500 – 1500 PPM',
      criticalRange: '> 1500 PPM',
    },
  },

  cSt: {
    id: {
      term: 'cSt (Centistokes)',
      definition:
        'Satuan viskositas kinematik yang mengukur seberapa cepat oli mengalir di bawah pengaruh gravitasi. Nilai lebih tinggi berarti oli lebih kental.',
      unit: 'mm²/s',
      normalRange: 'Bervariasi per grade (VG32, VG46, VG68, dll)',
      warningRange: 'Di luar ±10% dari range grade',
      criticalRange: 'Di luar ±20% dari range grade',
      tip: 'VG46 artinya viskositas nominal 46 cSt pada 40°C.',
    },
    en: {
      term: 'cSt (Centistokes)',
      definition:
        'Unit of kinematic viscosity measuring how fast oil flows under gravity. Higher values mean thicker oil.',
      unit: 'mm²/s',
      normalRange: 'Varies by grade (VG32, VG46, VG68, etc.)',
      warningRange: 'Outside ±10% of grade range',
      criticalRange: 'Outside ±20% of grade range',
      tip: 'VG46 means nominal viscosity of 46 cSt at 40°C.',
    },
  },
}
