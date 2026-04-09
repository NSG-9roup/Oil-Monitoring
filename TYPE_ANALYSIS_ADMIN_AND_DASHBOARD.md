# Oil Monitoring Project: TypeScript 'any' Type Analysis
## AdminClient.tsx & DashboardClient.tsx Components

**Analysis Date:** April 9, 2026  
**Project:** Oil-Monitoring System  
**Scope:** React Client Components with Supabase Integration

---

## Executive Summary

Both components contain **20+ instances of unsafe 'any' types** that should be replaced with proper TypeScript interfaces. The 'any' types primarily occur in:
- Component props interfaces
- State variables
- Function parameters (error handling, callbacks)
- Array elements without type constraints

This document provides the exact locations, data structures, and recommended TypeScript types for each 'any' usage.

---

## Database Schema Reference

### Core Tables
- **oil_customers**: id, company_name, status, created_at, updated_at, [logo_url, logo_updated_at]
- **oil_profiles**: id, role, customer_id, created_at, updated_at, [full_name, email, phone_number, contact_email]
- **oil_products**: id, product_name, product_type, created_at, updated_at, [base_oil, viscosity_grade, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan, oil_grade]
- **oil_machines**: id, customer_id, machine_name, location, status, created_at, updated_at, [serial_number, model]
- **oil_lab_tests**: id, machine_id, product_id, test_date, viscosity_40c, viscosity_100c, water_content, water_content_unit, tan_value, pdf_path, created_at, updated_at, updated_by, [evaluation_mode]
- **oil_purchase_history**: id, customer_id, product_id, quantity, purchase_date, unit_price, total_price, status, created_at, updated_at

---

# COMPONENT 1: AdminClient.tsx

## Section 1: Interface Props (Lines 27-31)

### Finding 1.1: AdminClientProps - Multiple 'any' Types

**Location:** Lines 27-31
```typescript
interface AdminClientProps {
  user: User
  profile: any                    // ❌ ANY #1
  customers: any[]                // ❌ ANY #2
  machines: any[]                 // ❌ ANY #3
  recentTests: any[]              // ❌ ANY #4
}
```

**Current Analysis:**  
The props are populated from Supabase queries in [app/admin/page.tsx](app/admin/page.tsx). Looking at the loader queries:

**Actual Data Structures:**

1. **profile: any** (should be `Profile`)
   - OracleSQL Query: `SELECT * FROM oil_profiles`
   - Fields: `id, role, customer_id, created_at, updated_at, [full_name, email, phone_number, contact_email]`
   - Relations: Can include `customer:oil_customers(company_name, logo_url)`
```typescript
interface AdminProfile extends Profile {
  customer?: {
    company_name: string
    logo_url?: string | null
    status: string
  }
}
```

2. **customers: any[]** (should be `Customer[]`)
   - Query: `.from('oil_customers').select('*')`
   - Each element has fields: `id, company_name, status, created_at, updated_at, [logo_url, logo_updated_at]`
```typescript
interface Customer {
  id: string
  company_name: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  logo_url?: string | null
  logo_updated_at?: string | null
}
```

3. **machines: any[]** (should be `AdminMachine[]`)
   - Query: `.select('*, customer:oil_customers(company_name)')`
   - Fields: `id, customer_id, machine_name, location, status, created_at, updated_at, [serial_number, model]`
   - Nested relation: `customer { company_name }`
```typescript
interface AdminMachine {
  id: string
  customer_id: string
  machine_name: string
  location?: string | null
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
  serial_number?: string | null
  model?: string | null
  customer?: {
    company_name: string
  }
}
```

4. **recentTests: any[]** (should be `AdminLabTest[]`)
   - Query: `.select(*,machine:machine_id(...), product:product_id(...))`
   - Complex nested structure with machine and product details
```typescript
interface AdminLabTest {
  id: string
  machine_id: string
  product_id: string
  test_date: string
  viscosity_40c?: number | null
  viscosity_100c?: number | null
  water_content?: number | null
  water_content_unit: 'PPM' | 'PERCENT'
  tan_value?: number | null
  pdf_path?: string | null
  created_at: string
  updated_at: string
  updated_by?: string | null
  machine?: {
    machine_name: string
    customer_id: string
    customer?: {
      company_name: string
    }
  }
  product?: {
    product_name: string
    product_type: string
  }
}
```

**Suggested Types to Define:**
```typescript
// Add these to lib/types.ts

export interface AdminProfile extends Profile {
  customer?: {
    company_name: string
    logo_url?: string | null
    status: string
  }
}

export interface AdminMachine {
  id: string
  customer_id: string
  machine_name: string
  location?: string | null
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
  serial_number?: string | null
  model?: string | null
  customer?: {
    company_name: string
  }
}

export interface AdminLabTest {
  id: string
  machine_id: string
  product_id: string
  test_date: string
  viscosity_40c?: number | null
  viscosity_100c?: number | null
  water_content?: number | null
  water_content_unit: 'PPM' | 'PERCENT'
  tan_value?: number | null
  pdf_path?: string | null
  created_at: string
  updated_at: string
  updated_by?: string | null
  evaluation_mode?: 'oil_type_based' | 'product_specific' | 'new_oil_verification'
  machine?: {
    machine_name: string
    customer_id: string
    customer?: {
      company_name: string
    }
  }
  product?: {
    product_name: string
    product_type: string
  }
}

export interface AdminClientProps {
  user: User
  profile: AdminProfile
  customers: Customer[]
  machines: AdminMachine[]
  recentTests: AdminLabTest[]
}
```

---

## Section 2: State Variables with 'any' (Lines 48-70)

### Finding 2.1: selectedItem State (Line 48)

**Location:** Line 48
```typescript
const [selectedItem, setSelectedItem] = useState<any>(null)
```

**Usage Context:**
- Used in `openEditCustomer(customer: any)` - line 207
- Used in `openEditMachine(machine: any)` - line 263
- Used in `openEditProduct(product: any)` - line 418
- Used in `openEditPurchase(purchase: any)` - line 469
- Used in `openEditTest(test: any)` - line 546
- Used in `openEditUser(user: any)` - line 610
- Used in `openLogoUpload(customer: any)` - line 327

**Actual Data Types:**
Discriminated union of different entities depending on `modalOpen` state:

```typescript
type SelectedItem = {
  type: 'customer' | 'machine' | 'product' | 'purchase' | 'test' | 'user' | 'logo'
  data: Customer | AdminMachine | Product | Purchase | AdminLabTest | UserProfile | Customer
}

// Better approach - context-specific typing:
const [selectedItem, setSelectedItem] = useState<
  Customer | AdminMachine | Product | Purchase | AdminLabTest | UserProfile | null
>(null)
```

**Suggested Type:**
```typescript
type SelectedItem = Customer | AdminMachine | Product | Purchase | AdminLabTest | UserProfile | null
const [selectedItem, setSelectedItem] = useState<SelectedItem>(null)
```

### Finding 2.2: users State (Line 56)

**Location:** Line 56
```typescript
const [users, setUsers] = useState<any[]>([])
```

**Supabase Query (Line 107-110):**
```typescript
.select('id, full_name, email, phone_number, role, customer_id, created_at, customer:oil_customers(company_name)')
```

**Actual Data Structure:**
```typescript
interface AdminUser {
  id: string
  full_name?: string | null
  email: string
  phone_number?: string | null
  role: 'customer' | 'admin' | 'sales'
  customer_id?: string | null
  created_at: string
  customer?: {
    company_name: string
  }
}

const [users, setUsers] = useState<AdminUser[]>([])
```

### Finding 2.3: products State (Line 57)

**Location:** Line 57
```typescript
const [products, setProducts] = useState<any[]>([])
```

**Supabase Query (Line 118-123):**
```typescript
.select('*')
```

**Actual Data Structure:**
```typescript
interface AdminProduct {
  id: string
  product_name: string
  product_type: string
  base_oil?: string | null
  viscosity_grade?: string | null
  baseline_viscosity_40c?: number | null
  baseline_viscosity_100c?: number | null
  baseline_tan?: number | null
  oil_grade?: string | null
  created_at: string
  updated_at: string
}

const [products, setProducts] = useState<AdminProduct[]>([])
```

### Finding 2.4: purchases State (Line 58)

**Location:** Line 58
```typescript
const [purchases, setPurchases] = useState<any[]>([])
```

**Supabase Query (Line 188-192):**
```typescript
.select('*, customer:oil_customers(company_name), product:oil_products(product_name)')
```

**Actual Data Structure:**
```typescript
interface AdminPurchase {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  purchase_date: string
  unit_price: number
  total_price?: number | null
  status: 'completed' | 'pending' | 'cancelled'
  created_at: string
  updated_at: string
  customer?: {
    company_name: string
  }
  product?: {
    product_name: string
  }
}

const [purchases, setPurchases] = useState<AdminPurchase[]>([])
```

### Finding 2.5: formData State (Line 61)

**Location:** Line 61
```typescript
const [formData, setFormData] = useState<any>({})
```

**Usage Context:**
This is a generic form state used for multiple modal types. Replace with discriminated union:

```typescript
type FormData = {
  // Customer form
  company_name?: string
  status?: 'active' | 'inactive'
  
  // Machine form
  machine_name?: string
  customer_id?: string
  location?: string
  serial_number?: string
  model?: string
  
  // Product form
  product_name?: string
  product_type?: string
  base_oil?: string
  viscosity_grade?: string
  baseline_viscosity_40c?: number
  baseline_viscosity_100c?: number
  baseline_tan?: number
  oil_grade?: string
  
  // Test form
  machine_id?: string
  product_id?: string
  test_date?: string
  viscosity_40c?: string | number
  viscosity_100c?: string | number
  water_content?: string | number
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value?: string | number
  pdf_path?: string | null
  pdfFile?: File
  
  // Purchase form
  purchase_date?: string
  quantity?: string | number
  unit_price?: string | number
  total_price?: string | number
  
  // User form
  email?: string
  password?: string
  full_name?: string
  contact_email?: string
  phone_number?: string
  role?: 'customer' | 'admin' | 'sales'
}

const [formData, setFormData] = useState<FormData>({})
```

### Finding 2.6: csvData State (Line 71)

**Location:** Line 71
```typescript
const [csvData, setCsvData] = useState<any[]>([])
```

**Usage Context:**
Stores parsed CSV rows for customer/product import. Each row should match the entity schema.

```typescript
type CSVRow = Record<string, string | number | boolean | null>

interface CustomerCSVRow extends CSVRow {
  company_name: string
  status: 'active' | 'inactive'
}

interface ProductCSVRow extends CSVRow {
  product_name: string
  product_type: string
  base_oil?: string
  viscosity_grade?: string
}

const [csvData, setCsvData] = useState<CSVRow[]>([])
```

### Finding 2.7: quickAddData State (Line 77)

**Location:** Line 77
```typescript
const [quickAddData, setQuickAddData] = useState<any>({})
```

**Used for:** Quick machine and product addition (lines 357, 414)

```typescript
type QuickAddData = {
  // Machine quick add
  machine_name?: string
  serial_number?: string
  model?: string
  location?: string
  status?: 'active' | 'inactive' | 'maintenance'
  customer_id?: string
  
  // Product quick add
  product_name?: string
  product_type?: string
  base_oil?: string
  viscosity_grade?: string
}

const [quickAddData, setQuickAddData] = useState<QuickAddData>({})
```

---

## Section 3: Function Parameters with 'any' (Lines 200-650)

### Finding 3.1: openEditCustomer Parameter (Line 207)

**Location:** Line 207
```typescript
const openEditCustomer = (customer: any) => {
```

**Should be:**
```typescript
const openEditCustomer = (customer: Customer) => {
```

### Finding 3.2: openEditMachine Parameter (Line 263)

**Location:** Line 263
```typescript
const openEditMachine = (machine: any) => {
```

**Should be:**
```typescript
const openEditMachine = (machine: AdminMachine) => {
```

### Finding 3.3: error Catch Parameter (Multiple Locations)

**Locations:** 
- Line 234 (handleSaveCustomer)
- Line 251 (handleDeleteCustomer)
- Line 326 (handleUploadLogo)
- Line 408 (handleDeleteLogo)
- And ~10 more error handlers

**Current code:**
```typescript
catch (error: any) {
  alert('Error: ' + error.message)
}
```

**Should be:**
```typescript
catch (error: unknown) {
  const message = error instanceof Error 
    ? error.message 
    : String(error)
  alert('Error: ' + message)
}
```

**Or create a utility:**
```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error occurred'
}

catch (error) {
  alert('Error: ' + getErrorMessage(error))
}
```

### Finding 3.4: openEditProduct Parameter (Line 418)

**Location:** Line 418
```typescript
const openEditProduct = (product: any) => {
```

**Should be:**
```typescript
const openEditProduct = (product: AdminProduct) => {
```

### Finding 3.5: openEditPurchase Parameter (Line 469)

**Location:** Line 469
```typescript
const openEditPurchase = (purchase: any) => {
```

**Should be:**
```typescript
const openEditPurchase = (purchase: AdminPurchase) => {
```

### Finding 3.6: openEditTest Parameter (Line 546)

**Location:** Line 546
```typescript
const openEditTest = (test: any) => {
```

**Should be:**
```typescript
const openEditTest = (test: AdminLabTest) => {
```

### Finding 3.7: openEditUser Parameter (Line 610)

**Location:** Line 610
```typescript
const openEditUser = (user: any) => {
```

**Should be:**
```typescript
const openEditUser = (user: AdminUser) => {
```

### Finding 3.8: openLogoUpload Parameter (Line 327)

**Location:** Line 327
```typescript
const openLogoUpload = (customer: any) => {
```

**Should be:**
```typescript
const openLogoUpload = (customer: Customer) => {
```

### Finding 3.9: handleDeleteTest Parameter (Line 568)

**Location:** Line 568
```typescript
const handleDeleteTest = async (id: string) => {
```

This is correct, but related state `selectedItem.id` should be typed.

---

## Section 4: Render/Response Parsing with 'any'

### Finding 4.1: response.json() casting (Multiple locations)

**Location:** Lines 632, 657 (API response handling)

```typescript
const data = await response.json()  // ❌ Implicitly 'any'
```

**Should be:**
```typescript
interface UserResponse {
  error?: string
  success?: boolean
  userId?: string
}

const data = await response.json() as UserResponse
if (!response.ok) throw new Error(data.error)
```

### Finding 4.2: test.machine?.customer_id access (Line 1099)

**Actual location near "Top Performers" section**

Current code iterates over `recentTests` with unsafe chaining:
```typescript
recentTests.reduce((acc: any, test) => {
  const customerId = test.machine?.customer_id
  
  if (acc[customerId]) {
    acc[customerId].count++
  }
})
```

**Should use defined types:**
```typescript
const testsByCustomer = recentTests.reduce((
  acc: Record<string, { name: string; count: number }>, 
  test: AdminLabTest
) => {
  const customerId = test.machine?.customer_id
  if (customerId && test.machine?.customer?.company_name) {
    if (!acc[customerId]) {
      acc[customerId] = { name: test.machine.customer.company_name, count: 0 }
    }
    acc[customerId].count++
  }
  return acc
}, {})
```

---

# COMPONENT 2: DashboardClient.tsx

## Section 1: Component Props (Lines 55-59)

### Finding 1.1: DashboardClientProps - profile 'any'

**Location:** Lines 55-59
```typescript
interface DashboardClientProps {
  user: { id: string; email?: string }
  profile: any                    // ❌ ANY
  initialMachines: Machine[]
}
```

**Should be:**
```typescript
interface DashboardClientProps {
  user: { id: string; email?: string }
  profile: DashboardProfile
  initialMachines: DashboardMachine[]
}

interface DashboardProfile {
  id: string
  email?: string
  full_name?: string
  customer?: {
    company_name: string
  }
}

interface DashboardMachine extends Machine {
  // No extra fields needed beyond Machine interface from types.ts
}
```

---

## Section 2: State Variables with 'any'

### Finding 2.1: loadMachineData Function Parameter (Line 822)

**Location:** Line 822
```typescript
async function loadMachineData(machineId: string) {
  const testsRes = await supabase
    .from('oil_lab_tests')
    .select('*, product:oil_products(product_name, product_type)')

  const tests = testsRes.data || []
  setOilSamples(tests)  // ❌ tests should be typed
  setLabReports(tests)  // ❌ tests should be typed
}
```

The `tests` variable is inferred as `any[]` from Supabase response.

**Should be:**
```typescript
async function loadMachineData(machineId: string) {
  const testsRes = await supabase
    .from('oil_lab_tests')
    .select(
      '*, product:oil_products(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)'
    )
    .eq('machine_id', machineId)
    .order('test_date', { ascending: true })

  const tests: OilSample[] = testsRes.data || []
  setOilSamples(tests)
  setLabReports(tests)
}
```

### Finding 2.2: calculateHealthScore Parameter (Line 289)

**Location:** Line 289
```typescript
const calculateHealthScore = (test: any) => {
  if (!test) return null
```

**Should be:**
```typescript
const calculateHealthScore = (test: OilSample | LabReport): number | null => {
  if (!test) return null
```

Where `OilSample` is already defined in DashboardClient (lines 23-32).

### Finding 2.3: getStatus Function Parameter (Line 530)

**Location:** Line 530
```typescript
const getStatus = (
  viscosity40c: number, 
  waterContent: number, 
  tanValue: number, 
  product: any  // ❌ ANY
): ...
```

**Should be:**
```typescript
const getStatus = (
  viscosity40c: number,
  waterContent: number,
  tanValue: number,
  product: OilSample['product'] | LabReport['product'] | undefined
): { level: string; color: string; text: string }
```

### Finding 2.4: filterByTimeRange Parameter (Line 807)

**Location:** Line 807
```typescript
const filterByTimeRange = (data: any[]) => {
  if (timeRange === 'all') return data
  
  const now = new Date()
  return data.filter(item => new Date(item.test_date) >= cutoffDate)
}
```

**Should be:**
```typescript
const filterByTimeRange = (data: OilSample[]): OilSample[] => {
  if (timeRange === 'all') return data
  
  const now = new Date()
  const cutoffDate = new Date()
  
  // ... time range logic ...
  
  return data.filter(item => new Date(item.test_date) >= cutoffDate)
}
```

### Finding 2.5: getTrend Function (Line 557)

**Current:**
```typescript
const getTrend = (currentValue: number, previousValue: number | null) => {
  if (!previousValue) return { direction: 'stable', icon: '→', color: 'gray' }
  // ...
}
```

**This is good, but return type should be explicit:**
```typescript
interface TrendInfo {
  direction: 'up' | 'down' | 'stable'
  icon: string
  color: string
}

const getTrend = (currentValue: number, previousValue: number | null): TrendInfo => {
```

### Finding 2.6: latestTestByMachineId State (Line 87)

**Location:** Line 87
```typescript
const [latestTestByMachineId, setLatestTestByMachineId] = useState<Record<string, OilSample>>({})
```

This is actually **correctly typed**! ✅

### Finding 2.7: machineInsights reduce callback (Line 865)

**Location:** ~Line 865-920 (machineInsights calculation)

```typescript
const machineInsights = machines
  .map((machine) => {
    const latestTest = latestTestByMachineId[machine.id]
    // ...
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
```

**Should have explicit interface:**
```typescript
interface MachineInsight {
  machine: DashboardMachine
  latestTest: OilSample | null
  healthScore: number | null
  status: { level: string; text: string }
  daysSinceTest: number | null
  priorityScore: number
  nextAction: string
}

const machineInsights: MachineInsight[] = machines.map((machine) => {
  // ...
})
```

### Finding 2.8: loadFleetInsights Function (Line 761)

**Location:** Line 761-795

```typescript
async function loadFleetInsights() {
  // ...
  const latestMap: Record<string, OilSample> = {}
  ;(data || []).forEach((test: any) => {  // ❌ HERE: test typed as any
    if (!latestMap[test.machine_id]) {
      latestMap[test.machine_id] = test
    }
  })
}
```

**Should be:**
```typescript
async function loadFleetInsights() {
  const machineIds = machines.map((machine) => machine.id)
  
  const { data, error } = await supabase
    .from('oil_lab_tests')
    .select(
      'id, machine_id, test_date, viscosity_40c, viscosity_100c, water_content, tan_value, evaluation_mode, product:oil_products(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)'
    )
    .in('machine_id', machineIds)
    .order('test_date', { ascending: false })

  const latestMap: Record<string, OilSample> = {}
  ;(data || []).forEach((test: OilSample) => {  // ✅ Typed correctly
    if (!latestMap[test.machine_id]) {
      latestMap[test.machine_id] = test
    }
  })
  
  setLatestTestByMachineId(latestMap)
}
```

### Finding 2.9: expandedReports Set (Line 81)

**Location:** Line 81
```typescript
const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set())
```

This is **correctly typed**! ✅

---

## Section 3: Error Handling (Unknown vs Any)

### Finding 3.1: Multiple catch blocks with 'any'

**Locations:**
- Line 219 (handleDownloadPDF)
- Line 755 (loadFleetInsights)
- Line 795 (loadFleetInsights catch)
- Line 803 (loadMachineData catch)

**Current pattern:**
```typescript
catch (error: any) {
  console.error('Error downloading PDF:', error)
  alert('Failed to download PDF: ' + error.message)
}
```

**Should be:**
```typescript
catch (error: unknown) {
  const message = error instanceof Error 
    ? error.message 
    : 'Unknown error occurred'
  console.error('Error downloading PDF:', error)
  alert('Failed to download PDF: ' + message)
}
```

---

# Summary Table

| Component | Finding | Location | Current Type | Suggested Type | Severity |
|-----------|---------|----------|--------------|----------------|----------|
| AdminClient | Props interface | Lines 27-31 | any | AdminProfile, Customer[], AdminMachine[], AdminLabTest[] | HIGH |
| AdminClient | selectedItem state | Line 48 | any | SelectedItem union | HIGH |
| AdminClient | users state | Line 56 | any[] | AdminUser[] | HIGH |
| AdminClient | products state | Line 57 | any[] | AdminProduct[] | HIGH |
| AdminClient | purchases state | Line 58 | any[] | AdminPurchase[] | HIGH |
| AdminClient | formData state | Line 61 | any | FormData | HIGH |
| AdminClient | csvData state | Line 71 | any[] | CSVRow[] | MEDIUM |
| AdminClient | quickAddData state | Line 77 | any | QuickAddData | MEDIUM |
| AdminClient | openEditCustomer param | Line 207 | any | Customer | HIGH |
| AdminClient | openEditMachine param | Line 263 | any | AdminMachine | HIGH |
| AdminClient | error handlers | Multiple | any | unknown | HIGH |
| AdminClient | openEditProduct param | Line 418 | any | AdminProduct | HIGH |
| AdminClient | openEditPurchase param | Line 469 | any | AdminPurchase | HIGH |
| AdminClient | openEditTest param | Line 546 | any | AdminLabTest | HIGH |
| AdminClient | openEditUser param | Line 610 | any | AdminUser | HIGH |
| AdminClient | API responses | Lines 632, 657 | any | UserResponse | MEDIUM |
| DashboardClient | Props profile | Line 57 | any | DashboardProfile | HIGH |
| DashboardClient | test in loadFleetInsights | Line 782 | any | OilSample | HIGH |
| DashboardClient | calculateHealthScore param | Line 289 | any | OilSample | HIGH |
| DashboardClient | getStatus product param | Line 530 | any | Product object | HIGH |
| DashboardClient | filterByTimeRange param | Line 807 | any[] | OilSample[] | HIGH |
| DashboardClient | error handlers | Multiple | any | unknown | HIGH |

---

# Recommended Implementation Priority

## Phase 1: Core Types (Highest Priority)
1. Create interfaces in `lib/types.ts`:
   - AdminProfile, AdminMachine, AdminLabTest, AdminUser, AdminProduct, AdminPurchase
   - DashboardProfile, MachineInsight, TrendInfo

2. Update component props interfaces
   - AdminClientProps
   - DashboardClientProps

## Phase 2: State Variables
1. Replace `useState<any>` with typed alternatives
2. Update discriminated unions for modal/form states

## Phase 3: Function Parameters & Error Handling
1. Replace `(param: any)` with specific types
2. Replace `catch (error: any)` with `catch (error: unknown)` pattern
3. Create error handling utility function

## Phase 4: Supabase Response Typing
1. Add strict response types for API calls
2. Type all `.select().data` results

---

# Testing Strategy

After implementing type changes:

```bash
# Check for TypeScript errors
npm run build

# Run type checking
npx tsc --noEmit

# Run tests
npm run test
```

All components should compile without any implicit 'any' warnings.
