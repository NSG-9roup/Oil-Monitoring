# 📊 Database Quick Reference

## Customer IDs (Fixed UUIDs)
- **Apex Manufacturing:** `11111111-1111-1111-1111-111111111111`
- **Precision Industries:** `22222222-2222-2222-2222-222222222222`

## Product IDs
- **Mobilgear 600 XP 220:** `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`
- **Shell Omala S4 WE 320:** `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`
- **Castrol Hyspin AWH-M 68:** `cccccccc-cccc-cccc-cccc-cccccccccccc`
- **Mobil DTE 25:** `dddddddd-dddd-dddd-dddd-dddddddddddd`

## Machine IDs
- **Apex - Hydraulic Press:** `a1111111-1111-1111-1111-111111111111`
- **Apex - CNC Mill:** `a2222222-2222-2222-2222-222222222222`
- **Precision - Turbine:** `b1111111-1111-1111-1111-111111111111`
- **Precision - Gearbox:** `b2222222-2222-2222-2222-222222222222`

## Test Accounts
```
apex.user1@example.com / password123
apex.user2@example.com / password123
precision.user1@example.com / password123
precision.user2@example.com / password123
```

## Useful Queries

### View all customers with their machines
```sql
SELECT 
  c.company_name,
  m.machine_name,
  m.location,
  m.status
FROM customers c
LEFT JOIN machines m ON c.id = m.customer_id
ORDER BY c.company_name, m.machine_name;
```

### View current product for each machine
```sql
SELECT 
  c.company_name,
  m.machine_name,
  p.product_name,
  p.product_type,
  mp.start_date
FROM machines m
JOIN customers c ON m.customer_id = c.id
JOIN machine_products mp ON m.id = mp.machine_id
JOIN products p ON mp.product_id = p.id
WHERE mp.end_date IS NULL
ORDER BY c.company_name, m.machine_name;
```

### View latest lab tests
```sql
SELECT 
  c.company_name,
  m.machine_name,
  lt.test_date,
  lt.viscosity,
  lt.water_content,
  lt.tan_value,
  p.product_name
FROM lab_tests lt
JOIN machines m ON lt.machine_id = m.id
JOIN customers c ON m.customer_id = c.id
JOIN products p ON lt.product_id = p.id
ORDER BY lt.test_date DESC
LIMIT 10;
```

### View purchase history by customer
```sql
SELECT 
  c.company_name,
  p.product_name,
  ph.quantity,
  ph.purchase_date
FROM purchase_history ph
JOIN customers c ON ph.customer_id = c.id
JOIN products p ON ph.product_id = p.id
ORDER BY c.company_name, ph.purchase_date DESC;
```

### Check user profiles
```sql
SELECT 
  u.email,
  p.role,
  c.company_name
FROM profiles p
JOIN auth.users u ON p.id = u.id
LEFT JOIN customers c ON p.customer_id = c.id
ORDER BY c.company_name, u.email;
```

## Data Patterns in Seed Data

### Apex Manufacturing
- **Hydraulic Press:** Shows degrading quality (increasing water, TAN)
- **CNC Mill:** Product switch from Mobilgear to Shell Omala, then stable

### Precision Industries
- **Turbine:** Excellent stable quality (low water, low TAN)
- **Gearbox:** Gradual improvement over time

## Testing RLS Policies

```sql
-- Test as a specific user
SET request.jwt.claim.sub = '<user-uuid-here>';

-- View what this user can see
SELECT * FROM machines;
SELECT * FROM lab_tests;
SELECT * FROM purchase_history;

-- Should only see data for their customer_id
```

## Common Admin Tasks (Future)

### Add new machine
```sql
INSERT INTO machines (customer_id, machine_name, location, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'New Machine Name',
  'Building C',
  'active'
);
```

### Add lab test
```sql
INSERT INTO lab_tests (
  machine_id,
  product_id,
  test_date,
  viscosity,
  water_content,
  tan_value
) VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '2026-02-15',
  70.5,
  0.0380,
  1.42
);
```

### Change machine product
```sql
-- End current product assignment
UPDATE machine_products
SET end_date = '2026-02-28'
WHERE machine_id = 'a1111111-1111-1111-1111-111111111111'
  AND end_date IS NULL;

-- Start new product assignment
INSERT INTO machine_products (machine_id, product_id, start_date)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '2026-03-01'
);
```

## Database Health Checks

### Check RLS is enabled
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### View active policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Count records per table
```sql
SELECT 
  'customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'machines', COUNT(*) FROM machines
UNION ALL
SELECT 'machine_products', COUNT(*) FROM machine_products
UNION ALL
SELECT 'lab_tests', COUNT(*) FROM lab_tests
UNION ALL
SELECT 'purchase_history', COUNT(*) FROM purchase_history;
```

Expected counts from seed data:
- customers: 2
- profiles: 4 (after manual creation)
- products: 4
- machines: 4
- machine_products: 5
- lab_tests: 20
- purchase_history: 8
