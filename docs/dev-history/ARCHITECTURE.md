# Architecture Decision Records (ADRs)

## ADR-001: Use Next.js 15 with React Server Components

**Status:** Accepted  
**Date:** 2026-05-15  
**Deciders:** Team Lead, Tech Lead

### Context
The Oil Monitoring Dashboard requires a modern, performant full-stack framework that can handle both server-side rendering and client-side interactivity efficiently.

### Decision
We use **Next.js 15** with **React Server Components (RSC)** as our primary architecture pattern.

### Rationale
1. **Performance**: RSC reduces JavaScript sent to browser by keeping data fetching on server
2. **Security**: Sensitive operations (Supabase queries, API keys) stay server-side
3. **DX**: Unified framework eliminates context switching between frontend/backend
4. **Streaming**: Native support for real-time data updates
5. **Type Safety**: Full TypeScript integration across server/client boundary

### Consequences
- ✅ Faster page loads (less JS to parse)
- ✅ Improved SEO for marketing pages
- ✅ Simplified authentication/authorization
- ⚠️ Requires understanding RSC limitations
- ⚠️ Client state management must be thoughtful

### Related
- ADR-002: Client State Management with Zustand
- ADR-005: Supabase RLS Policies

---

## ADR-002: Client State Management with Zustand

**Status:** Proposed  
**Date:** 2026-05-15

### Context
Client-side state includes UI preferences, form data, and real-time updates that shouldn't persist to database.

### Decision
**Recommended**: Use **Zustand** for lightweight, typescript-friendly client state management.

### Rationale
1. **Lightweight**: ~2KB vs Redux ~40KB
2. **Type-Safe**: Full TypeScript inference
3. **DevX**: No boilerplate (vs Context API)
4. **Performance**: Minimal re-renders with selector API
5. **Testing**: Easy to mock and test

### Implementation Strategy
```typescript
// stores/alertStore.ts
import { create } from 'zustand'

export const useAlertStore = create((set) => ({
  openAlerts: [] as DashboardAlert[],
  setOpenAlerts: (alerts) => set({ openAlerts: alerts }),
  clearAlerts: () => set({ openAlerts: [] }),
}))
```

### Alternatives Considered
- **Context API**: Too verbose for this complexity
- **Redux**: Overkill, complex middleware
- **Jotai**: Good, but less ecosystem support
- **Recoil**: Facebook project, less stable

### Consequences
- ✅ Smaller bundle size
- ✅ Better TypeScript support
- ✅ Easier testing
- ⚠️ Need to educate team on Zustand patterns
- ⚠️ Devtools less mature than Redux

---

## ADR-003: API Data Caching with SWR

**Status:** Proposed  
**Date:** 2026-05-15

### Context
API calls for lab tests, machines, and alerts are frequent and can result in excessive network requests and poor UX.

### Decision
Use **SWR (stale-while-revalidate)** for client-side caching of API responses.

### Rationale
1. **Smart Caching**: Serves stale data while revalidating in background
2. **Deduplication**: Multiple components requesting same data = 1 request
3. **Type-Safe**: Full TypeScript support
4. **Offline**: Works offline with cached data
5. **Devtools**: Good debugging experience

### Implementation Strategy
```typescript
// hooks/useLabTests.ts
import useSWR from 'swr'

export function useLabTests(machineId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/customer/lab-tests?machine_id=${machineId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )
  
  return { tests: data, error, isLoading, refresh: mutate }
}
```

### Alternatives Considered
- **React Query**: More powerful, but heavier (40KB)
- **RTK Query**: Redux-dependent
- **Apollo Client**: GraphQL only
- **Manual Fetch**: No caching benefits

### Consequences
- ✅ Reduced network requests
- ✅ Better perceived performance
- ✅ Automatic background updates
- ⚠️ Stale data briefly shown
- ⚠️ Cache invalidation complexity

---

## ADR-004: Error Handling with Error Boundaries

**Status:** Proposed  
**Date:** 2026-05-15

### Context
React errors that bubble up crash the entire application, leaving users with blank screens.

### Decision
Implement **React Error Boundaries** at strategic points in the component tree.

### Rationale
1. **Graceful Degradation**: Isolate failures to specific components
2. **User Experience**: Display helpful error messages instead of blank page
3. **Debugging**: Capture and log errors to monitoring service
4. **Recovery**: Allow users to retry failed operations

### Implementation Strategy
```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logger.error('Component error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}

// Usage
<ErrorBoundary>
  <AdminDashboard />
</ErrorBoundary>
```

### Placement Strategy
- **Top Level**: Wraps entire application
- **Route Level**: Each major route (admin, dashboard)
- **Feature Level**: Critical features (charts, data grids)

### Consequences
- ✅ Better reliability
- ✅ Isolated component failures
- ✅ Logging/monitoring integration
- ⚠️ Won't catch async errors (need try/catch)
- ⚠️ Event handler errors need separate handling

---

## ADR-005: Supabase RLS Policies Over Application Auth

**Status:** Accepted  
**Date:** 2026-05-15

### Context
Authorization must be enforced at database level, not just application level, to prevent data breaches.

### Decision
Use **Supabase Row Level Security (RLS)** policies to enforce authorization at the database layer.

### Rationale
1. **Security**: Cannot bypass database security from application
2. **Single Source of Truth**: Authorization rules in one place
3. **Audit**: Database logs all access
4. **Consistency**: Mobile/API clients get same security

### Policy Example
```sql
-- Only customers can see their own machines
CREATE POLICY "Customers view own machines"
ON oil_machines
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM oil_customers 
    WHERE id = customer_id
  )
)
```

### Consequences
- ✅ Defense in depth
- ✅ No auth bypass possible
- ✅ Better compliance (GDPR, SOC2)
- ⚠️ RLS policies add query overhead
- ⚠️ Complex policies hard to debug

---

## ADR-006: PostgreSQL Migrations with Semantic Versioning

**Status:** Accepted  
**Date:** 2026-05-15

### Context
Database schema changes must be tracked, versioned, and safely deployed across environments.

### Decision
Use **Supabase migrations** with **semantic versioning** (YYYYMMDDHHMM format).

### Rationale
1. **Traceability**: Every schema change is tracked
2. **Rollback Safety**: Easy to identify what changed
3. **CI/CD**: Migrations integrate with deployment pipelines
4. **Audit Trail**: Database DDL history for compliance

### Migration Naming Convention
```
20260515120000_add_alert_actions.sql
├─ Date: 2026-05-15
├─ Time: 12:00:00 
└─ Description: add_alert_actions
```

### Consequences
- ✅ Safe deployments
- ✅ Easy troubleshooting
- ✅ Team collaboration
- ⚠️ Requires discipline (never edit old migrations)
- ⚠️ Complex transactions hard to write

---

## ADR-007: TypeScript Strict Mode

**Status:** Accepted  
**Date:** 2026-05-15

### Context
JavaScript's dynamic typing leads to subtle bugs and makes refactoring risky.

### Decision
Enable **TypeScript strict mode** with no `any` escapes without explicit comments.

### Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Consequences
- ✅ Fewer runtime errors
- ✅ Better IDE support
- ✅ Safer refactoring
- ⚠️ Longer development time initially
- ⚠️ Library types can be incomplete

---

## ADR-008: Component Structure and Naming

**Status:** Accepted  
**Date:** 2026-05-15

### Context
Consistent component organization improves code navigation and reduces cognitive load.

### Decision
Organize components by feature domain with consistent naming:

```
app/
├─ admin/
│  ├─ components/
│  │  ├─ AdminCustomersTab.tsx
│  │  ├─ AdminMachinesTab.tsx
│  │  ├─ AdminProductsTab.tsx
│  │  └─ types.ts
│  ├─ AdminClient.tsx
│  └─ page.tsx
├─ dashboard/
│  ├─ components/
│  │  ├─ TrendSection.tsx
│  │  ├─ LabReportsSection.tsx
│  │  └─ types.ts
│  ├─ DashboardClient.tsx
│  └─ page.tsx
└─ components/ (shared)
   ├─ GlossaryTooltip.tsx
   ├─ OilDropLoader.tsx
   └─ __tests__/
```

### Naming Rules
- **Components**: PascalCase
- **Utilities**: camelCase
- **Types/Interfaces**: PascalCase, prefixed with `type` or `interface`
- **Constants**: UPPER_SNAKE_CASE
- **Files**: Same as export name

### Consequences
- ✅ Predictable file locations
- ✅ Easier onboarding
- ✅ Better IDE navigation
- ⚠️ Requires discipline to maintain

---

## ADR-009: Testing Strategy

**Status:** Proposed  
**Date:** 2026-05-15

### Context
Code quality and reliability require comprehensive testing across layers.

### Decision
Implement **3-tier testing strategy**:

1. **Unit Tests** (60% coverage)
   - Utilities, helpers, business logic
   - Framework: Vitest + Testing Library

2. **Integration Tests** (25% coverage)
   - API routes with mocked Supabase
   - Component interactions
   - Framework: Vitest

3. **E2E Tests** (15% coverage)
   - Critical user workflows
   - Framework: Playwright (future)

### Test Locations
```
app/
├─ components/
│  ├─ GlossaryTooltip.tsx
│  └─ __tests__/
│     └─ GlossaryTooltip.test.tsx
└─ api/
   ├─ admin/
   │  └─ customers/
   │     └─ route.ts
   └─ __tests__/
      └─ api.routes.test.ts
```

### Coverage Targets
- Overall: 60%+
- Critical paths: 80%+
- Admin features: 70%+
- Dashboard: 60%+

### Consequences
- ✅ Higher confidence in changes
- ✅ Catches regressions early
- ✅ Documents expected behavior
- ⚠️ Requires ~30% more development time
- ⚠️ Tests add maintenance burden

---

## Summary of Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 + React 19 | Modern, performant, full-stack |
| **State** | Zustand | Lightweight, TypeScript-first |
| **Data** | SWR | Smart caching, deduplication |
| **Backend** | Next.js API Routes | Unified framework |
| **Database** | Supabase + PostgreSQL | Managed, secure, performant |
| **Auth** | Supabase Auth + RLS | Secure, auditable, GDPR-ready |
| **Styling** | Tailwind CSS | Utility-first, performant |
| **Validation** | Zod | Type-safe runtime validation |
| **Testing** | Vitest + Testing Library | Fast, type-safe |
| **Monitoring** | Sentry (recommended) | Error tracking, performance |

---

## Implementation Timeline

- **Phase 3** (Current): Tests + Documentation ✓
- **Phase 4**: State Management + Error Boundaries
  - Week 1: Install Zustand, create stores
  - Week 2: Integrate SWR for data fetching
  - Week 3: Implement Error Boundaries
  - Week 4: Optimize database connections

---

## Related Documentation
- [Component Architecture](./COMPONENT_ARCHITECTURE.md)
- [API Design Patterns](./API_PATTERNS.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Database Schema](../supabase/migrations/)
