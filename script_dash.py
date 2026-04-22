import sys, re

with open('c:/Users/Acuel/Oil-Monitoring/app/dashboard/DashboardClient.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def remove_function_by_name(source, func_name):
    # Find start of function
    start_index = source.find(f'const {func_name} = ')
    if start_index == -1:
        return source
    brace_index = source.find('{', start_index)
    if brace_index == -1:
        return source
    bracket_count = 1
    i = brace_index + 1
    while i < len(source):
        if source[i] == '{': bracket_count += 1
        elif source[i] == '}': bracket_count -= 1
        if bracket_count == 0: break
        i += 1
    return source[:start_index] + source[i+1:]

def replace_func_body(source, func_name, new_body):
    start_index = source.find(f'const {func_name} = ')
    if start_index == -1: return source
    brace_index = source.find('{', start_index)
    bracket_count = 1
    i = brace_index + 1
    while i < len(source):
        if source[i] == '{': bracket_count += 1
        elif source[i] == '}': bracket_count -= 1
        if bracket_count == 0: break
        i += 1
    return source[:start_index] + f'const {func_name} = ' + new_body + source[i+1:]

# 1. Update Props
text = text.replace(
  '  initialPurchaseHistory: PurchaseHistoryRecord[]\n}',
  '  initialPurchaseHistory: PurchaseHistoryRecord[]\n  initialLabTests: any[]\n  initialDismissedAlertIds: string[]\n}'
)
text = text.replace(
  '  initialPurchaseHistory: PurchaseHistoryRecord[]\r\n}',
  '  initialPurchaseHistory: PurchaseHistoryRecord[]\r\n  initialLabTests: any[]\r\n  initialDismissedAlertIds: string[]\r\n}'
)

# 2. Add imports
imports = "import { createTeamUser, createMaintenanceAction, updateMaintenanceAction, dismissAlert } from '@/app/actions/dashboardActions'\n"
text = text.replace("import { createClient } from '@/lib/supabase/client'", imports + "import { createClient } from '@/lib/supabase/client'")

# 3. Update Component signature
text = re.sub(
  r'export default function DashboardClient\(\{[\s\S]*?\}\s*:\s*DashboardClientProps\)\s*\{',
  '''export default function DashboardClient({
  user,
  profile,
  initialMachines,
  initialTeamMembers,
  initialMaintenanceActions,
  initialMaintenanceActionLogs,
  initialPurchaseHistory,
  initialLabTests,
  initialDismissedAlertIds,
}: DashboardClientProps) {''', text)

# 4. Remove unwanted functions
funcs_to_remove = [
    'loadMachineData', 'loadFleetInsights'
]
for fn in funcs_to_remove:
    text = remove_function_by_name(text, fn)

# Also remove floating callback lists from loadMachineData or loadFleetInsights due to syntax
text = re.sub(r'\s*, \[machines, supabase\]\)', '', text)
text = re.sub(r'\s*, \[loadFleetInsights, machines\]\)', '', text)
text = re.sub(r'\s*, \[profile\?\.id, supabase, user\.id\]\)', '', text)

# 5. Overwrite the oilSamples state variables with useMemo!
text = text.replace(
'''  const [fleetInsightsLoading, setFleetInsightsLoading] = useState(false)
  const [latestTestByMachineId, setLatestTestByMachineId] = useState<Record<string, OilSample>>({})
  const [fleetHistoryByMachineId, setFleetHistoryByMachineId] = useState<Record<string, OilSample[]>>({})''',
'''
  const [fleetInsightsLoading] = useState(false)
  // Re-calculate these off initialLabTests directly to run synchronously
  const { latestTestByMachineId, fleetHistoryByMachineId } = useMemo(() => {
    const latestMap: Record<string, any> = {}
    const historyMap: Record<string, any[]> = {}
    ;(initialLabTests || []).forEach((test) => {
      const product = Array.isArray(test.product) ? test.product[0] : test.product
      const normalizedTest = { ...test, product }
      if (!historyMap[normalizedTest.machine_id]) {
        historyMap[normalizedTest.machine_id] = []
      }
      historyMap[normalizedTest.machine_id].push(normalizedTest)

      if (!latestMap[normalizedTest.machine_id]) {
        latestMap[normalizedTest.machine_id] = normalizedTest
      }
    })
    return { latestTestByMachineId: latestMap, fleetHistoryByMachineId: historyMap }
  }, [initialLabTests])
'''
)

# And oilSamples
text = text.replace(
'''const [oilSamples, setOilSamples] = useState<OilSample[]>([])''',
'''const oilSamples = useMemo(() => {
    if (!selectedMachine) return []
    return initialLabTests.filter(t => t.machine_id === selectedMachine.id)
  }, [selectedMachine, initialLabTests]) as unknown as OilSample[]
'''
)
text = text.replace(
'''const [labReports, setLabReports] = useState<any[]>([])''',
'''const labReports = oilSamples'''
)
text = text.replace(
'''const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])''',
'''const dismissedAlerts = initialDismissedAlertIds'''
)

# Strip out effect usages of those initial states
text = re.sub(r'useEffect\(\(\) => \{[\s\S]*?router\.prefetch\(\'/purchases\'\)[\s\S]*?\}\, \[router\]\)', 'useEffect(() => { router.prefetch(\'/purchases\'); router.prefetch(\'/login\'); }, [router])', text)
text = re.sub(r'useEffect\(\(\) => \{[\s\S]*?if \(!selectedMachine\) \{.*?setOilSamples\(\[\]\).*?setLabReports\(\[\]\).*?\} else \{.*?loadMachineData.*?\}[\s\S]*?\}\, \[selectedMachine, loadMachineData\]\)', '', text)
text = re.sub(r'useEffect\(\(\) => \{\n\s*void \(async \(\) => \{\n\s*const \{ data, error \} = await supabase\n\s*\.from\(\'oil_alert_actions\'\)[\s\S]*?\}\)\(\)\n\s*\}, \[profile\?\.id, supabase, user\.id\]\)', '', text)
text = re.sub(r'useEffect\(\(\) => \{\n\s*if \(machines\.length > 0\) \{\n\s*loadFleetInsights\(\)\n\s*\}\n\s*\}, \[loadFleetInsights, machines\]\)', '', text)

# Rewrite Server Actions
text = replace_func_body(text, 'handleCreateTeamUser', '''async () => {
    setTeamSaving(true)
    try {
      await createTeamUser({ ...teamForm, customer_id: profile.customer_id })
      setTeamForm({ full_name: '', email: '', pin: '', role: 'customer' })
      router.refresh()
    } catch (error: any) {
      logger.error('Failed to create team member:', error)
      alert(language === 'id' ? 'Gagal menambah tim. Email mungkin sudah terdaftar.' : 'Failed to add team member.')
    } finally {
      setTeamSaving(false)
    }
  }''')

text = replace_func_body(text, 'handleUpdateMaintenanceAction', '''async (
    actionId: string,
    updates: Partial<typeof actionForm>,
    logMessage?: string,
    toStatus?: string
  ) => {
    try {
      await updateMaintenanceAction(actionId, { ...updates, logMessage, toStatus })
      router.refresh()
    } catch (error: any) {
      logger.error('Failed to update action:', error)
      alert(language === 'id' ? 'Gagal memperbarui: ' + error.message : 'Failed to update: ' + error.message)
    }
  }''')

text = replace_func_body(text, 'handleCreateMaintenanceAction', '''async (
    overrides?: Partial<typeof actionForm> & { source_payload?: Record<string, unknown> }
  ) => {
    try {
      const payload = {
        machine_id: overrides?.machine_id || actionForm.machine_id,
        action_type: overrides?.action_type || actionForm.action_type,
        priority: overrides?.priority || actionForm.priority,
        description: overrides?.description || actionForm.description,
        assigned_to: overrides?.assigned_to || actionForm.assigned_to,
        due_date: overrides?.due_date || actionForm.due_date,
        source_type: overrides?.source_type || 'manual',
        source_payload: overrides?.source_payload || null,
        customer_id: profile.customer_id
      }
      
      await createMaintenanceAction(payload)
      setIsActionModalOpen(false)
      setActionForm({ machine_id: '', action_type: 'top_up', priority: 'medium', description: '', assigned_to: '', due_date: '' })
      router.refresh()
    } catch (error: any) {
      logger.error('Failed to create maintenance action:', error)
      alert(language === 'id' ? 'Gagal membuat tugas.' : 'Failed to create task.')
    }
  }''')

text = replace_func_body(text, 'handleDismissAlert', '''async (alertItem: DashboardAlert) => {
    try {
      await dismissAlert(alertItem.id)
      router.refresh()
    } catch (error) {
      logger.error('Failed to dismiss alert:', error)
    }
  }''')

# Fix UI refresh calls from loadFleetInsights
text = text.replace('onRefresh={loadFleetInsights}', 'onRefresh={() => router.refresh()}')

with open('c:/Users/Acuel/Oil-Monitoring/app/dashboard/DashboardClient.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('DashboardClient.tsx processed successfully')
