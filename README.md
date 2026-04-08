# Oil Condition Monitoring System

Full-stack web application for monitoring industrial oil condition data with customer and admin dashboards.

## Features

**Customer Dashboard:**
- View machines & oil condition data  
- Interactive trend charts (Viscosity, Water Content, TAN)
- Download lab report PDFs
- Purchase history

**Admin Dashboard:**
- Complete CRUD for Customers, Machines, Lab Tests
- User management (create customer/admin/sales users)
- Upload lab report PDFs  
- System statistics

## Tech Stack

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS + Recharts
- Supabase (PostgreSQL + Auth + Storage)

## Quick Start

```bash
# Install
npm install

# Configure .env.local with Supabase credentials
cp .env.local.example .env.local

# Push migrations
npx supabase db push

# Run dev server
npm run dev
```

## Default Credentials

- **Admin:** admin@example.com / admin123456
- **Customer:** user1@apex.com / password123

## Structure

```
app/
├── admin/         # Admin CRUD dashboard
├── dashboard/     # Customer charts dashboard  
├── api/admin/     # User management API
└── login/         # Auth

lib/
├── supabase/      # DB clients
└── types.ts       # Types

supabase/
└── migrations/    # SQL migrations
```

## Database

Tables (all `oil_` prefixed):
- oil_customers, oil_profiles, oil_machines
- oil_lab_tests (with PDF), oil_purchase_history

## License

MIT
