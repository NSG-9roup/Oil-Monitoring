# Role Matrix and Application Flow

## Current Role Model
The application currently uses three business roles stored in `oil_profiles.role`:

- `admin`
- `sales`
- `customer`

There are also Supabase/system roles such as `authenticated`, `anon`, and `service_role`, but those are infrastructure roles, not business roles.

## Role Matrix

| Role | Main Entry Point | Can Access | Key Responsibilities | Notes |
|------|------------------|------------|----------------------|-------|
| `admin` | `/admin` | Admin dashboard, customer management, machine management, product management, test management, user management | Full platform administration | Highest privilege in app and DB policies |
| `sales` | Currently also redirected to `/admin` | Admin dashboard, sales-related read views, some shared admin tools | Operational support and customer-facing coordination | In current code, `sales` is grouped with `admin` in redirect and access checks |
| `customer` | `/dashboard` | Customer dashboard, own machines, own maintenance actions, own lab-test requests, team/user management within customer scope | Day-to-day monitoring and request submission | Restricted to own `customer_id` |

## Current Routing Flow

```mermaid
flowchart TD
  A[User opens / or /login] --> B[Authenticate via Supabase]
  B --> C{Read oil_profiles.role}
  C -->|admin| D[/admin]
  C -->|sales| D[/admin]
  C -->|customer| E[/dashboard]
  C -->|unknown / no profile| F[/login]

  D --> G[Admin page]
  E --> H[Customer dashboard]

  G --> I{Role check in admin page}
  I -->|admin or sales| J[Allow access]
  I -->|other| K[Access denied]

  H --> L{Role check in dashboard page}
  L -->|customer| M[Allow access]
  L -->|other| N[Access denied]
```

## What This Means Today

- `admin` and `sales` are currently treated as one portal at login time.
- `customer` is separated correctly into `/dashboard`.
- The `sales` page exists at `/sales`, but login does not route users there yet.
- Because of that, a `sales` account can land in the admin area even if its intended job is different.

## Recommended Target Flow

If the goal is strict separation, the app should evolve to this model:

| Role | Dedicated Entry | Suggested Scope |
|------|-----------------|-----------------|
| `admin` | `/admin` | Full admin control |
| `sales` | `/sales` | Sales-specific dashboard and tasks only |
| `customer` | `/dashboard` | Customer self-service dashboard |

```mermaid
flowchart TD
  A[User opens / or /login] --> B[Authenticate via Supabase]
  B --> C{Read oil_profiles.role}
  C -->|admin| D[/admin]
  C -->|sales| E[/sales]
  C -->|customer| F[/dashboard]
  C -->|unknown / no profile| G[/login]

  D --> H[Admin-only tools]
  E --> I[Sales-only tools]
  F --> J[Customer-only tools]
```

## Access Rules by Area

### `/admin`
- Allowed: `admin`
- Current code also allows: `sales`
- Recommended: keep `sales` out unless a specific admin feature is intentionally shared

### `/sales`
- Allowed: `sales`
- Should be the home page for sales workflows if role separation is required

### `/dashboard`
- Allowed: `customer`
- Restricted to the logged-in customer's own data

## Source of Truth in Code

- Login redirect logic: `app/login/page.tsx`
- Root redirect logic: `app/page.tsx`
- Admin access page: `app/admin/page.tsx`
- Customer dashboard access page: `app/dashboard/page.tsx`
- Sales page: `app/sales/page.tsx`
- Role type definition: `lib/domain/entities/auth.ts`
- RLS policies: `supabase/migrations/20260202120002_oil_rls_policies.sql`

## Short Conclusion

The application currently has **3 business roles**, but the routing behavior still groups `sales` with `admin`. If the business wants clean separation of duties, the login redirect and access checks need to be updated so `sales` lands in `/sales`, not `/admin`.
