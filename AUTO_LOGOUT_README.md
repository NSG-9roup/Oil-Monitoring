# Auto Logout Configuration Guide

## Overview
Sistem auto logout telah diimplementasikan dengan fitur-fitur berikut:
- **Inactivity Timeout**: Auto logout jika user tidak melakukan aktivitas selama 30 menit
- **Session Max Age**: Auto logout setelah 24 jam (regardless of activity)
- **Warning Dialog**: Warning 5 menit sebelum logout otomatis
- **Activity Monitoring**: Tracking user activity (mouse, keyboard, scroll, touch)

## Trigger Events untuk Auto Logout

### 1. **Inactivity Timeout (30 menit)**
- Default trigger: tidak ada aktivitas user selama 30 menit
- Activities yang direset timer:
  - Mousedown
  - Keydown
  - Scroll
  - Touch/tap
  - Click

### 2. **Session Max Age (24 jam)**
- Logout otomatis 24 jam setelah login (meskipun ada aktivitas)
- Waktu ini simpan di localStorage: `session_start_time`

### 3. **Warning Dialog**
- Muncul 5 menit sebelum inactivity logout
- User bisa:
  - **Tetap Login**: Reset timer dengan menekan button (trigger activity)
  - **Logout**: Manual logout dan redirect ke login

### 4. **Manual Logout**
- User bisa logout manual melalui button di UI

## Konfigurasi

Untuk mengubah timeout duration, edit file: `lib/hooks/useSessionTimeout.ts`

```typescript
// Timeout dalam milidetik
const INACTIVITY_TIMEOUT = 30 * 60 * 1000  // 30 menit
const WARNING_TIME = 5 * 60 * 1000          // 5 menit warning
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000 // 24 jam
```

## Implementation Details

### Files Added:
1. **`lib/hooks/useSessionTimeout.ts`**
   - Custom hook untuk manage session timeout logic
   - Monitor user activity
   - Handle logout dan reset timeout

2. **`app/components/SessionWarning.tsx`**
   - Dialog component untuk warning sebelum logout
   - Countdown timer
   - Button: "Tetap Login" atau "Logout"

3. **`app/components/SessionProvider.tsx`**
   - Provider component yang wrap entire app
   - Setup session start time di localStorage

### Modified Files:
1. **`app/layout.tsx`**
   - Wrap dengan SessionProvider

## How It Works

```
User Activity -> Reset Timeout
                     ↓
            Start 30 menit countdown
                     ↓
         After 25 menit (no more activity)
                     ↓
        Show Warning Dialog (5 menit countdown)
                     ↓
         User Click "Tetap Login" OR "Logout"
                     ↓
        If "Tetap Login": Reset timeout again
        If "Logout": Sign out dari Supabase + redirect ke /login
```

## Storage

Data yang disimpan di localStorage:
- `session_start_time`: Timestamp saat user login
- `last_activity_time`: Timestamp aktivitas terakhir user

Kedua data ini otomatis dihapus saat logout.

## Testing

Untuk test fitur ini:

1. **Quick Test (Short Timeout)**:
   Edit `useSessionTimeout.ts`:
   ```typescript
   const INACTIVITY_TIMEOUT = 1 * 60 * 1000  // 1 menit
   const WARNING_TIME = 30 * 1000              // 30 detik warning
   ```

2. **Test Steps**:
   - Login ke aplikasi
   - Tunggu tanpa aktivitas selama timeout duration
   - Dialog warning seharusnya muncul
   - Klik "Tetap Login" atau tunggu sampai auto logout

3. **Verify Logout**:
   - Check localStorage kosong
   - Redirect ke /login
   - Session Supabase cleared

## Additional Notes

- ⚠️ Warning dialog menggunakan event listener untuk session_warning event
- 🔔 Countdown di warning dialog update setiap 1 detik
- 🚫 Jika user punya multiple tabs, setiap tab punya timeout tersendiri
- 💾 Session data tersimpan di localStorage dan Supabase session cookie

## Troubleshooting

**User tidak auto logout meskipun sudah timeout:**
1. Check browser console untuk errors
2. Verify localStorage tidak di-clear oleh browser extensions
3. Check Supabase session masih valid

**Warning dialog tidak muncul:**
1. Verify SessionProvider wrap di layout.tsx
2. Check browser console untuk JavaScript errors
3. Verify custom event 'session_warning' di-trigger

**Timer terus reset meskipun tidak ada aktivitas:**
1. Check event listeners di `useSessionTimeout.ts`
2. Mungkin ada script lain yang trigger activity events
