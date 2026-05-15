# Component Architecture Guide

## Overview

The application uses a **feature-based architecture** with clear separation of concerns:

```
Features Domain
├─ Presentation Layer (Components)
├─ Business Logic Layer (Hooks, Utils)
├─ Data Access Layer (Services)
└─ Domain Layer (Types, Entities)
```

## Major Components

### AdminClient (3500 LOC → TODO: Refactor to 600 LOC)

**Responsibility**: Master admin console for customer/machine/product management

**Current Issues**:
- ❌ Too large (monolith)
- ❌ Multiple concerns (CRUD, validation, state)
- ❌ Difficult to test

**Refactoring Plan** (Phase 2 Follow-up):
```
AdminClient.tsx (orchestrator, ~400 LOC)
├─ AdminCustomersTab.tsx (~300 LOC)
├─ AdminMachinesTab.tsx (~300 LOC)
├─ AdminProductsTab.tsx (~250 LOC)
├─ AdminLabTestsTab.tsx (~400 LOC)
├─ AdminAlertsTab.tsx (~250 LOC)
├─ AdminUsersTab.tsx (~200 LOC)
└─ components/
   ├─ CustomerForm.tsx
   ├─ MachineForm.tsx
   ├─ ProductForm.tsx
   └─ TestUploadModal.tsx
```

### DashboardClient (2000+ LOC → TODO: Refactor to 800 LOC)

**Responsibility**: Customer dashboard with trends, reports, reliability insights

**Current Issues**:
- ❌ Mixed concerns (data, computation, rendering)
- ❌ Hard to test reliability calculations
- ❌ Difficult to reuse logic

**Refactoring Plan**:
```
DashboardClient.tsx (orchestrator, ~400 LOC)
├─ TrendSection.tsx (uses TrendStore from Zustand)
├─ LabReportsSection.tsx
├─ ReliabilitySection.tsx
├─ MaintenanceActionBoardSection.tsx
└─ hooks/
   ├─ useTrendAlerts.ts (extract logic)
   ├─ useReliabilityInsights.ts (extract logic)
   └─ useFleetStats.ts (extract logic)
```

## Component Best Practices

### 1. Server vs Client Components

**Server Components** (default in Next.js 15):
```typescript
// app/admin/page.tsx
export default async function AdminPage() {
  const user = await getSession() // ✅ Can fetch data
  const customers = await getCustomers() // ✅ Direct DB access
  
  return <AdminClient user={user} customers={customers} />
}
```

**Client Components** (for interactivity):
```typescript
// app/admin/AdminClient.tsx
'use client'

export function AdminClient({ customers }: Props) {
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  
  return (
    <div onClick={() => setSelectedCustomer(customers[0])}>
      {/* Interactive elements */}
    </div>
  )
}
```

**Rule**: Use server components by default, client components only for interactivity.

### 2. Props Architecture

**Good**: Minimal, typed, cacheable
```typescript
interface CustomerTabProps {
  customers: Customer[] // Pre-fetched from server
  onCustomerSelect: (customer: Customer) => void
  isLoading: boolean
}

export function AdminCustomersTab({ customers, onCustomerSelect, isLoading }: CustomerTabProps) {
  // Small, focused component
}
```

**Bad**: Too many props, unclear data flow
```typescript
// ❌ Avoid
interface Props {
  customers: Customer[]
  machines: Machine[]
  products: Product[]
  users: User[]
  settings: Settings
  filters: Filters[]
  // ... 20 more props
}
```

### 3. Composition Pattern

**Prefer composition** over props drilling:
```typescript
// ✅ Good: Composition
<DashboardClient>
  <TrendSection machines={machines} />
  <LabReportsSection machines={machines} />
  <ReliabilitySection machines={machines} />
</DashboardClient>

// ❌ Bad: Props drilling
<DashboardClient
  machines={machines}
  trendSectionMachines={machines}
  labReportsMachines={machines}
  reliabilitySectionMachines={machines}
/>
```

## Data Flow Architecture

```
Next.js Server
    ↓
getServerData() - Fetch from Supabase
    ↓
<ServerComponent />
    ↓
Pass props to <ClientComponent /> (React.memo)
    ↓
Client state (useState, useReducer)
    ↓
Zustand store (shared state)
    ↓
SWR hooks (API caching)
```

## Testing Architecture

### Unit Tests
```typescript
// lib/calculations/viscosityIndex.test.ts
describe('calculateViscosityIndex', () => {
  it('returns correct index for valid inputs', () => {
    expect(calculateViscosityIndex(100, 8.5)).toBe(95)
  })
})
```

### Component Tests
```typescript
// app/components/__tests__/GlossaryTooltip.test.tsx
describe('GlossaryTooltip', () => {
  it('renders with label', () => {
    render(<GlossaryTooltip termKey="viscosity40c" label="Viscosity" language="en" />)
    expect(screen.getByText('Viscosity')).toBeDefined()
  })
})
```

### Integration Tests
```typescript
// app/api/__tests__/api.routes.test.ts
describe('POST /api/admin/customers', () => {
  it('validates and creates customer', () => {
    expect(validateCustomer(data)).toPass()
  })
})
```

## Naming Conventions

### Components
```
✅ AdminCustomersTab.tsx
✅ LabReportsSection.tsx
✅ GlossaryTooltip.tsx
❌ admin-tab.tsx
❌ section.tsx
```

### Hooks
```
✅ useLabTests.ts
✅ useAlertStore.ts
✅ useTrendAlerts.ts
❌ lab-tests-hook.ts
```

### Types
```
✅ types.ts (in feature folder)
✅ types/dashboard.ts (for larger feature)
❌ Types.tsx
❌ index.ts (too vague)
```

## Error Handling Pattern

### API Errors
```typescript
try {
  const data = await fetch('/api/customers')
  if (!data.ok) throw new Error(`API error: ${data.status}`)
  return data.json()
} catch (error) {
  logger.error('Fetch error:', error)
  showErrorNotification(error)
  throw error // Re-throw for component to handle
}
```

### Component Errors
```typescript
export function AdminDashboard() {
  const [error, setError] = useState<Error | null>(null)
  
  const handleCustomerCreate = async (data) => {
    try {
      await createCustomer(data)
    } catch (err) {
      setError(err as Error)
    }
  }
  
  if (error) return <ErrorFallback error={error} />
  return <AdminPanel />
}
```

## Performance Optimization Patterns

### 1. Memoization
```typescript
// ✅ Good: Prevents unnecessary re-renders
export const TrendSection = React.memo(function TrendSection({ chartData, alerts }: Props) {
  return <Chart data={chartData} alerts={alerts} />
})
```

### 2. Code Splitting
```typescript
// ✅ Good: Load heavy components on demand
const AdminDashboard = dynamic(() => import('./AdminClient'), { 
  loading: () => <AdminLoader /> 
})
```

### 3. Data Prefetching
```typescript
// ✅ Good: Fetch data while rendering
const machineTestData = await fetchLabTests(machineId) // Parallel fetch
const machines = await fetchMachines()

// Data ready before component renders
return <Dashboard machines={machines} tests={machineTestData} />
```

## Directory Structure Reference

```
app/
├─ admin/
│  ├─ AdminClient.tsx (client)
│  ├─ page.tsx (server)
│  ├─ components/
│  │  ├─ AdminCustomersTab.tsx
│  │  ├─ AdminMachinesTab.tsx
│  │  ├─ types.ts
│  │  └─ __tests__/
│  ├─ types.ts
│  └─ utils/
├─ dashboard/
│  ├─ DashboardClient.tsx (client)
│  ├─ page.tsx (server)
│  ├─ components/
│  │  ├─ TrendSection.tsx
│  │  ├─ LabReportsSection.tsx
│  │  ├─ __tests__/
│  │  └─ types.ts
│  └─ hooks/
│     ├─ useTrendAlerts.ts
│     └─ useReliabilityInsights.ts
├─ api/
│  ├─ admin/
│  │  ├─ customers/route.ts
│  │  ├─ machines/route.ts
│  │  └─ __tests__/
│  └─ customer/
│     ├─ machines/route.ts
│     └─ lab-tests/route.ts
├─ components/ (shared)
│  ├─ GlossaryTooltip.tsx
│  ├─ OilDropLoader.tsx
│  └─ __tests__/
└─ actions/
   ├─ adminActions.ts
   └─ dashboardActions.ts

lib/
├─ hooks/
│  ├─ useSessionTimeout.ts
│  └─ useWindowSize.ts
├─ calculations/
│  ├─ viscosityIndex.ts
│  └─ __tests__/
├─ alerts/
│  ├─ engine.ts
│  └─ __tests__/
└─ stores/ (Zustand stores - Phase 4)
   ├─ alertStore.ts
   ├─ filterStore.ts
   └─ uiStore.ts
```

## Code Review Checklist

- [ ] Component has single responsibility
- [ ] Props are minimal and clearly named
- [ ] TypeScript types are complete (no `any`)
- [ ] Component is under 400 LOC
- [ ] Tests exist for business logic
- [ ] Error handling is implemented
- [ ] Loading states are handled
- [ ] Accessibility considered (ARIA, semantic HTML)
- [ ] Performance optimizations applied
- [ ] Documentation comments for complex logic
