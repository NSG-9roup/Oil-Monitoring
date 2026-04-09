# TypeScript Errors - Fix Guide

**File:** `app/admin/AdminClient.tsx`  
**Total Errors:** 36  
**Priority:** HIGH (Prevents Build)

---

## Error Categories & Solutions

### 🔴 Category 1: Union Type Narrowing (11 errors)

**Problem:** `selectedItem` is a union type of 6 different types:
```typescript
type SelectedItemType = Customer | AdminMachine | AdminLabTest | AdminProduct | AdminPurchase | AdminUser | null
```

Only `Customer` has `logo_url` property, but code tries to access it on the union.

**Affected Lines:** 364-365, 409, 415, 2479

**Errors:**
```
Line 364: Property 'logo_url' does not exist on type 'AdminMachine'
Line 365: Property 'logo_url' does not exist on type 'AdminMachine'
Line 409: Property 'logo_url' does not exist on type 'Customer | AdminMachine | ...'
Line 415: Property 'logo_url' does not exist on type 'Customer | AdminMachine | ...'
Line 2479: Property 'logo_url' does not exist on type 'Customer | AdminMachine | ...'
```

**Solution:**

Add type guards before accessing logo_url:

```typescript
// BEFORE (Line 364 area)
if (selectedItem.logo_url) {
  const oldPath = selectedItem.logo_url.split('/').slice(-2).join('/')
  // ...
}

// AFTER - Add type guard
if (selectedItem && 'logo_url' in selectedItem && selectedItem.logo_url) {
  const oldPath = selectedItem.logo_url.split('/').slice(-2).join('/')
  // ...
}

// OR Better - Type narrowing
if (selectedItem && 'company_name' in selectedItem) {
  // Now TypeScript knows this is a Customer type
  if (selectedItem.logo_url) {
    const oldPath = selectedItem.logo_url.split('/').slice(-2).join('/')
  }
}
```

**Alternatively - Cast when you know it's safe:**
```typescript
if (modalOpen === 'upload-logo' && selectedItem) {
  const customer = selectedItem as Customer
  if (customer.logo_url) {
    const oldPath = customer.logo_url.split('/').slice(-2).join('/')
  }
}
```

---

### 🔴 Category 2: Form Data Typing (12 errors)

**Problem:** Form state type is too loose:
```typescript
interface FormDataState {
  company_name?: string
  machine_name?: string
  // ... 
  [key: string]: string | number | undefined
}
```

This causes issues with parseFloat() and File objects.

**Affected Lines:** 886, 897-901, 2770, 2788, 2949

**Errors:**
```
Line 886: Argument of type 'string | number | undefined' is not assignable to parameter of type 'string'
Line 897: Argument of type 'string | number | undefined' is not assignable to parameter of type 'string'
Line 2770: Argument of type 'string | number | undefined' is not assignable to parameter of type 'string'
```

**Solution Option 1 - Guard before parseFloat:**
```typescript
// BEFORE
let waterContentDecimal = parseFloat(formData.water_content) || null

// AFTER
let waterContentDecimal = formData.water_content 
  ? parseFloat(String(formData.water_content)) 
  : null

// Alternative
let waterContentDecimal = typeof formData.water_content === 'string' 
  ? parseFloat(formData.water_content) 
  : null
```

**Solution Option 2 - Better type definition:**
```typescript
interface FormDataState {
  // Lab test form
  machine_id?: string
  product_id?: string
  test_date?: string
  viscosity_40c?: string  // Keep as string from input
  viscosity_100c?: string
  water_content?: string
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value?: string
  pdf_path?: string
  pdfFile?: File  // Add this for file uploads
  // ... other fields
}

// Then when parsing:
const viscosity40c = formData.viscosity_40c 
  ? parseFloat(formData.viscosity_40c) 
  : null
```

---

### 🔴 Category 3: File Upload Type Issues (2 errors)

**Problem:** Form state tries to store File object, but type expects string/number.

**Affected Lines:** 876, 879, 2972

**Errors:**
```
Line 876: Property 'name' does not exist on type 'string | number'
Line 879: Argument of type 'string | number' is not assignable to parameter of type 'FileBody'
Line 2972: Type 'File' is not assignable to type 'string | number | undefined'
```

**Solution:**

Create a separate state for file uploads:

```typescript
// Add separate state for PDF file
const [pdfFile, setPdfFile] = useState<File | null>(null)

// In form data - remove pdfFile reference:
interface FormDataState {
  // ... existing fields
  pdf_path?: string  // Just the path, not the file
}

// When handling file change:
const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (file) {
    setPdfFile(file)
  }
}

// In upload handler:
const uploadPdf = async () => {
  if (!pdfFile) return
  
  const fileName = `${Date.now()}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  // ... rest of upload logic
}
```

---

### 🔴 Category 4: Null Safety (5 errors)

**Problem:** Code accesses properties on possibly null `selectedItem`.

**Affected Lines:** 231, 473, 627, 775, 920, 1008

**Errors:**
```
Line 231: 'selectedItem' is possibly 'null'
Line 473: 'selectedItem' is possibly 'null'
Line 920: 'selectedItem' is possibly 'null'
```

**Solution:**

Add null checks before accessing properties:

```typescript
// BEFORE
const { error } = await supabase
  .from('oil_customers')
  .update(formData)
  .eq('id', selectedItem.id)

// AFTER
if (!selectedItem) {
  alert('No item selected')
  return
}
const { error } = await supabase
  .from('oil_customers')
  .update(formData)
  .eq('id', selectedItem.id)
```

**Or with optional chaining:**
```typescript
if (!selectedItem?.id) {
  alert('No item selected')
  return
}
```

---

### 🔴 Category 5: Query Response Type Mismatches (5 errors)

**Problem:** Database query returns data that doesn't match the defined type.

**Affected Lines:** 119, 1972-1974, 2003, 2422, 2437

**Errors:**
```
Line 119: Type is not assignable to 'AdminUser[]' - missing 'updated_at'
Line 1972: Property 'serial_number' does not exist on machine type
Line 2003: Argument of type 'string | null' is not assignable to type 'string'
Line 2422: Property 'company_name' does not exist on union type
```

**Solution - Fix the query:**

For line 119 (loadUsers):

```typescript
// Current query doesn't select updated_at
const { data, error } = await supabase
  .from('oil_profiles')
  .select('id, full_name, email, phone_number, role, customer_id, created_at, customer:oil_customers(company_name)')
  .order('created_at', { ascending: false })

// Add updated_at to selection:
const { data, error } = await supabase
  .from('oil_profiles')
  .select('id, full_name, email, phone_number, role, customer_id, created_at, updated_at, customer:oil_customers(company_name)')
  .order('created_at', { ascending: false })
```

For line 1972-1974 (serial_number, model not selected):

```typescript
// The machine relation on lab_tests doesn't include these fields
// In the query, make sure to select full machine data:
.select(`
  *,
  machine:machine_id (
    id,
    machine_name,
    serial_number,    // Add this
    model,             // Add this
    customer_id,
    customer:customer_id (company_name)
  ),
  ...
`)
```

For line 2003 (null check for pdf_path):

```typescript
// BEFORE
const { data } = supabase.storage.from('lab-reports').getPublicUrl(test.pdf_path)

// AFTER - Add null check
if (test.pdf_path) {
  const { data } = supabase.storage.from('lab-reports').getPublicUrl(test.pdf_path)
  // ... use data
}
```

---

### 🔴 Category 6: Union Type with company_name (2 errors)

**Problem:** Only `Customer` and some admin types have `company_name`.

**Affected Lines:** 2422, 2437

**Errors:**
```
Line 2422: Property 'company_name' does not exist on union type
Line 2437: Property 'company_name' does not exist on union type
```

**Solution:**

Add type guard:

```typescript
// In logo upload modal where we know it's a Customer
if (modalOpen === 'upload-logo' && selectedItem) {
  const customer = selectedItem as Customer
  
  <p className="text-blue-100 text-sm mt-1">{customer.company_name}</p>
  
  {customer.company_name
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()}
}
```

---

### 🔴 Category 7: String Operations on Union Types (2 errors)

**Problem:** Treating form field as string when it could be number.

**Affected Lines:** 2979, 2949

**Errors:**
```
Line 2979: Property 'split' does not exist on type 'string | number'
Line 2949: Type mismatch on parseFloat result
```

**Solution:**

```typescript
// BEFORE
Current: {formData.pdf_path.split('/').pop()}

// AFTER
Current: {typeof formData.pdf_path === 'string' 
  ? formData.pdf_path.split('/').pop() 
  : 'N/A'}

// For water content display:
// BEFORE
`${formData.water_content || 0} PPM = ${((parseFloat(formData.water_content || '0') / 10000) || 0).toFixed(4)}%`

// AFTER
`${formData.water_content || 0} PPM = ${((parseFloat(String(formData.water_content || '0')) / 10000) || 0).toFixed(4)}%`
```

---

## 🔧 Implementation Order

### Step 1: Quick Fixes (30 min)
1. Add null checks before accessing `selectedItem` properties
2. Cast `selectedItem` to `Customer` in upload-logo modal
3. Add type guards for file operations

### Step 2: Form State Refactoring (1-2 hours)  
1. Create specific form state types per entity
2. Update form state initialization
3. Update form data setters

### Step 3: Query Fixes (30 min)
1. Update `loadUsers()` query to include `updated_at`
2. Update lab test query to include `serial_number`, `model`
3. Add null checks before file operations

### Step 4: Testing (30 min)
1. Run `npm run build` to verify no errors
2. Test logo upload functionality
3. Test PDF upload functionality
4. Test form submissions

---

## 📝 Code Review Checklist

After fixing, verify:
- [ ] `npm run build` completes without errors
- [ ] No TypeScript warnings in the output
- [ ] `npm run lint` passes
- [ ] All form submissions work
- [ ] File uploads successful
- [ ] Logo display works
- [ ] PDF downloads work

---

## 💡 Best Practices Going Forward

1. **Use discriminated unions** for better type safety:
   ```typescript
   type ModalContent = 
     | { type: 'customer'; data: Customer }
     | { type: 'machine'; data: AdminMachine }
     | { type: 'upload-logo'; data: Customer }
   ```

2. **Create form-specific types:**
   ```typescript
   interface CustomerFormState {
     company_name: string
     status: 'active' | 'inactive'
   }
   
   interface LabTestFormState {
     machine_id: string
     product_id: string
     viscosity_40c: string
     viscosity_100c: string
     water_content: string
     water_content_unit: 'PPM' | 'PERCENT'
     tan_value: string
   }
   ```

3. **Use proper null safety:**
   ```typescript
   const uploadPdf = async () => {
     if (!pdfFile) return // Guard at start
     if (!selectedItem?.id) return
     
     // Safe to use now
   }
   ```

---

## 📞 Summary

**Total Errors:** 36  
**Categories:** 6  
**Estimated Fix Time:** 2-3 hours  
**Complexity:** Medium

The errors are mostly related to type safety and proper null handling. All are fixable with the suggestions above. None of these prevent runtime functionality - they're compile-time type checking issues.

**Key Insight:** The real issue is that the AdminClient component is trying to be too generic with the `selectedItem` union type. Consider refactoring to use TypeScript discriminated unions in future iterations for cleaner code.
