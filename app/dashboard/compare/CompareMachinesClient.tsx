'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { calculateVI } from '@/lib/calculations/viscosityIndex'

interface Machine {
  id: string
  machine_name: string
  model: string
  location: string
  status: string
}

interface LabTest {
  id: string
  test_date: string
  viscosity_40c: number | null
  viscosity_100c: number | null
  water_content: number | null
  tan_value: number | null
  machine_id: string
}

interface MachineData {
  machine: Machine
  tests: LabTest[]
  latest: LabTest | null
  healthScore: number | null
}

const CHART_COLORS = ['#f97316', '#6366f1', '#10b981', '#ec4899']

function computeHealthScore(test: LabTest): number {
  let score = 100
  const water = (test.water_content ?? 0)
  const tan = test.tan_value ?? 0
  if (water > 0.15) score -= 30
  else if (water > 0.05) score -= 15
  if (tan > 1.0) score -= 30
  else if (tan > 0.5) score -= 15
  return Math.max(0, Math.min(100, score))
}

function StatusBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">N/A</span>
  const color = score >= 80 ? 'bg-green-100 text-green-800' : score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
  return <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${color}`}>{score}/100</span>
}

function CellStatus({ value, normal, warning }: { value: number | null; normal: number; warning: number }) {
  if (value === null) return <td className="px-4 py-3 text-center text-gray-400">–</td>
  const color = value <= normal ? 'text-green-700' : value <= warning ? 'text-yellow-700' : 'text-red-700'
  const icon = value <= normal ? '✅' : value <= warning ? '⚠️' : '🔴'
  return <td className={`px-4 py-3 text-center font-bold text-sm ${color}`}>{icon} {value.toFixed(2)}</td>
}

export default function CompareMachinesClient({ machines, language }: { machines: Machine[]; language: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [machineData, setMachineData] = useState<MachineData[]>([])
  const [loading, setLoading] = useState(false)
  const [activeChart, setActiveChart] = useState<'viscosity' | 'water' | 'tan'>('viscosity')

  const toggleMachine = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  const loadComparison = useCallback(async () => {
    if (selected.length < 2) return
    setLoading(true)
    const results: MachineData[] = []

    for (const machineId of selected) {
      const machine = machines.find(m => m.id === machineId)!
      const { data: tests } = await supabase
        .from('oil_lab_tests')
        .select('id, test_date, viscosity_40c, viscosity_100c, water_content, tan_value, machine_id')
        .eq('machine_id', machineId)
        .order('test_date', { ascending: true })
        .limit(20)

      const t = tests ?? []
      const latest = t.length > 0 ? t[t.length - 1] : null
      results.push({
        machine,
        tests: t,
        latest,
        healthScore: latest ? computeHealthScore(latest) : null,
      })
    }

    setMachineData(results)
    setLoading(false)
  }, [selected, machines, supabase])

  // Build overlay chart data (all machines, same date axis via index)
  const chartDataByMachine = machineData.map((md, i) =>
    md.tests.map(t => ({
      date: new Date(t.test_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      [`viscosity_${i}`]: t.viscosity_40c,
      [`water_${i}`]: t.water_content ? t.water_content * 100 : null,
      [`tan_${i}`]: t.tan_value,
    }))
  )

  // Flatten for chart (padded by index)
  const maxLen = Math.max(...machineData.map(md => md.tests.length), 0)
  const flatChartData = Array.from({ length: maxLen }, (_, i) => {
    const row: Record<string, unknown> = { index: i + 1 }
    machineData.forEach((md, mi) => {
      const t = md.tests[i]
      if (t) {
        row[`viscosity_${mi}`] = t.viscosity_40c
        row[`water_${mi}`] = t.water_content ? parseFloat((t.water_content * 100).toFixed(3)) : null
        row[`tan_${mi}`] = t.tan_value
        if (i === 0) row[`label_${mi}`] = md.machine.machine_name
      }
    })
    return row
  })
  void chartDataByMachine // used via flatChartData above

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900">
                {language === 'id' ? 'Perbandingan Mesin' : 'Machine Comparison'}
              </h1>
              <p className="text-xs text-gray-500">
                {language === 'id' ? 'Pilih 2–4 mesin untuk dibandingkan' : 'Select 2–4 machines to compare'}
              </p>
            </div>
          </div>
          <button
            onClick={loadComparison}
            disabled={selected.length < 2 || loading}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl disabled:opacity-40 hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
          >
            {loading ? '⏳ Loading...' : language === 'id' ? '🔍 Bandingkan' : '🔍 Compare'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Machine selector */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-black text-gray-900 mb-4">
            {language === 'id' ? `Pilih Mesin (${selected.length}/4)` : `Select Machines (${selected.length}/4)`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {machines.map((m) => {
              const isSelected = selected.includes(m.id)
              const colorIdx = selected.indexOf(m.id)
              const borderColor = isSelected ? CHART_COLORS[colorIdx] : '#e5e7eb'
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMachine(m.id)}
                  style={{ borderColor, borderWidth: isSelected ? 2 : 1 }}
                  className={`p-4 rounded-2xl text-left transition-all ${isSelected ? 'bg-orange-50 shadow-md' : 'bg-gray-50 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{m.machine_name}</p>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ backgroundColor: CHART_COLORS[colorIdx] }}>
                        {colorIdx + 1}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{m.model || '–'} · {m.location || '–'}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Comparison table */}
        {machineData.length >= 2 && (
          <>
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900">
                  {language === 'id' ? '📊 Tabel Perbandingan Parameter' : '📊 Parameter Comparison Table'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-bold text-gray-700 w-40">Parameter</th>
                      {machineData.map((md, i) => (
                        <th key={md.machine.id} className="px-4 py-3 text-center font-bold" style={{ color: CHART_COLORS[i] }}>
                          {md.machine.machine_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-700">Health Score</td>
                      {machineData.map(md => (
                        <td key={md.machine.id} className="px-4 py-3 text-center">
                          <StatusBadge score={md.healthScore} />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-700">Viscosity @40°C (cSt)</td>
                      {machineData.map(md => (
                        <CellStatus key={md.machine.id} value={md.latest?.viscosity_40c ?? null} normal={50} warning={60} />
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-700">Viscosity @100°C (cSt)</td>
                      {machineData.map(md => (
                        <CellStatus key={md.machine.id} value={md.latest?.viscosity_100c ?? null} normal={8} warning={12} />
                      ))}
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-700">Viscosity Index (VI)</td>
                      {machineData.map(md => {
                        const v40 = md.latest?.viscosity_40c
                        const v100 = md.latest?.viscosity_100c
                        const result = (v40 && v100) ? calculateVI(v40, v100) : null
                        return (
                          <td key={md.machine.id} className="px-4 py-3 text-center font-bold text-sm">
                            {result?.isValid ? (
                              <span className={result.vi >= 95 ? 'text-green-700' : result.vi >= 80 ? 'text-yellow-700' : 'text-red-700'}>
                                {result.vi}
                              </span>
                            ) : '–'}
                          </td>
                        )
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-700">Water Content (%)</td>
                      {machineData.map(md => {
                        const val = md.latest?.water_content != null ? md.latest.water_content * 100 : null
                        return <CellStatus key={md.machine.id} value={val} normal={0.05} warning={0.15} />
                      })}
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-700">TAN (mg KOH/g)</td>
                      {machineData.map(md => (
                        <CellStatus key={md.machine.id} value={md.latest?.tan_value ?? null} normal={0.5} warning={1.0} />
                      ))}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-700">Total Samples</td>
                      {machineData.map(md => (
                        <td key={md.machine.id} className="px-4 py-3 text-center font-black text-gray-900">
                          {md.tests.length}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-xs text-gray-500 flex gap-4 flex-wrap">
                <span>✅ Normal</span>
                <span>⚠️ Warning</span>
                <span>🔴 Critical</span>
                <span className="ml-auto italic">Data latest test per mesin</span>
              </div>
            </div>

            {/* Overlay Chart */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className="text-lg font-black text-gray-900">
                  {language === 'id' ? '📈 Grafik Tren Overlay' : '📈 Trend Overlay Chart'}
                </h2>
                <div className="flex gap-2">
                  {(['viscosity', 'water', 'tan'] as const).map(key => (
                    <button
                      key={key}
                      onClick={() => setActiveChart(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeChart === key ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {key === 'viscosity' ? 'Viscosity' : key === 'water' ? 'Water %' : 'TAN'}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={flatChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="index" stroke="#9ca3af" style={{ fontSize: 11 }} label={{ value: 'Sample #', position: 'insideBottom', offset: -3 }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'white', borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => {
                      const idx = parseInt(String(name).split('_')[1])
                      return [String(value), machineData[idx]?.machine.machine_name ?? name]
                    }}
                  />
                  <Legend formatter={(value) => {
                    const idx = parseInt(String(value).split('_')[1])
                    return machineData[idx]?.machine.machine_name ?? value
                  }} />
                  {machineData.map((md, i) => (
                    <Line
                      key={md.machine.id}
                      type="monotone"
                      dataKey={`${activeChart}_${i}`}
                      stroke={CHART_COLORS[i]}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART_COLORS[i] }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {machineData.length === 0 && !loading && selected.length >= 2 && (
          <div className="bg-white rounded-3xl shadow-xl p-12 text-center">
            <p className="text-gray-500 font-medium">
              {language === 'id' ? 'Klik "Bandingkan" untuk mulai analisis' : 'Click "Compare" to start analysis'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
