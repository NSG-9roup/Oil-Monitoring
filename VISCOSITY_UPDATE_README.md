# Viscosity Fields Update - Summary

## ✅ What Was Changed

### 1. Database Schema
- **Renamed**: `viscosity` → `viscosity_40c` 
- **Added**: `viscosity_100c` field
- Both fields store NUMERIC data (e.g., 46.5, 6.8)

### 2. Admin Form (AdminClient.tsx)
**Form State Updated**:
- Added `viscosity_40c` state
- Added `viscosity_100c` state

**Input Fields**:
- 2 separate input fields with proper labels:
  * "Viscosity (cSt @40°C)" with placeholder "e.g., 46.5"
  * "Viscosity (cSt @100°C)" with placeholder "e.g., 6.8"

**Submit Handler**:
- Both values parsed and saved to database

### 3. Customer Dashboard (DashboardClient.tsx)
**Interfaces Updated**:
- `OilSample` interface: viscosity_40c, viscosity_100c
- `LabReport` interface: viscosity_40c, viscosity_100c

**Functions Updated**:
- `calculateHealthScore()` - Uses viscosity_40c for scoring
- `getStatus()` - Uses viscosity_40c for threshold checks
- `getRecommendations()` - Uses viscosity_40c for alerts

**Display Updated**:
- **Report Cards**: Now shows 4 cards instead of 3
  * Viscosity 40°C (blue card)
  * Viscosity 100°C (indigo card)
  * Water Content (cyan card)
  * TAN Value (purple card)
  
- **Charts**: Shows 2 lines in viscosity trend
  * Orange line: Viscosity @40°C
  * Blue line: Viscosity @100°C

- **Trend Indicators**: Separate trend arrows for both viscosity values

---

## 🚀 How to Apply Changes

### Step 1: Run Database Migration

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy content from `update_viscosity_fields.sql`
4. Click **Run**
5. Verify result shows both columns

### Step 2: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Restart
npm run dev
```

### Step 3: Test the Changes

#### Admin Panel:
1. Go to **Lab Tests** tab
2. Click **Add Lab Test**
3. You should see 2 viscosity fields:
   - Viscosity (cSt @40°C)
   - Viscosity (cSt @100°C)
4. Enter values (e.g., 46.5 and 6.8)
5. Save test

#### Customer Dashboard:
1. Login as customer
2. Click on a machine
3. View lab report
4. Should see 4 cards: Viscosity 40°C, Viscosity 100°C, Water, TAN
5. Check trend chart shows 2 lines (orange & blue)

---

## 📊 Example Data

### Typical Values:
| Oil Grade | Viscosity @40°C | Viscosity @100°C |
|-----------|-----------------|------------------|
| SAE 10W-30 | 63.0 cSt | 10.3 cSt |
| SAE 15W-40 | 110.0 cSt | 14.5 cSt |
| ISO VG 46 | 46.0 cSt | 6.8 cSt |
| ISO VG 68 | 68.0 cSt | 8.9 cSt |
| ISO VG 100 | 100.0 cSt | 11.2 cSt |

### Health Score Logic:
- Uses **viscosity_40c** for scoring (industry standard)
- Critical: > 100 cSt
- Warning: > 80 cSt
- Normal: 40-70 cSt

---

## 🔧 Files Modified

1. ✅ `supabase/migrations/20260205000001_update_viscosity_fields.sql`
2. ✅ `update_viscosity_fields.sql` (manual execution)
3. ✅ `app/admin/AdminClient.tsx` (lines 591, 604, 644, 2532-2550)
4. ✅ `app/dashboard/DashboardClient.tsx` (multiple sections)

---

## ⚠️ Important Notes

- **Existing data** will be preserved in `viscosity_40c` after rename
- **New field** `viscosity_100c` will be NULL for existing records
- **Both fields optional** - You can enter one or both values
- **Charts** will show both lines if data available
- **Health scoring** uses viscosity_40c only (standard practice)

---

## 🐛 If Something Goes Wrong

### Migration Failed?
```sql
-- Rollback: Rename back
ALTER TABLE oil_lab_tests RENAME COLUMN viscosity_40c TO viscosity;
ALTER TABLE oil_lab_tests DROP COLUMN viscosity_100c;
```

### Data Not Showing?
- Check browser console for errors
- Verify migration ran successfully
- Clear browser cache and reload

### Form Not Submitting?
- Check both fields accept decimal values (46.5, not "46.5 cSt")
- Verify Supabase connection in console
