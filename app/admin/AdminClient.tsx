'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import imageCompression from 'browser-image-compression'
import OilDropLoader from '@/app/components/OilDropLoader'
import Image from 'next/image'
import type { AdminProfile, Customer, AdminMachine, AdminLabTest, AdminUser, AdminProduct, AdminPurchase } from '@/lib/types'
import { buildDashboardAlerts, type DashboardAlert } from '@/lib/alerts/engine'

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const formatDate = (value?: string | number | Date) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return dateFormatter.format(date)
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error'

interface AdminClientProps {
  user: User
  profile: AdminProfile
  customers: Customer[]
  machines: AdminMachine[]
  recentTests: AdminLabTest[]
}

type ModalType = 'add-customer' | 'edit-customer' | 'import-customers' | 'add-machine' | 'edit-machine' | 'add-test' | 'edit-test' | 'add-product' | 'edit-product' | 'import-products' | 'add-purchase' | 'edit-purchase' | 'add-user' | 'edit-user' | 'upload-logo' | null

type SelectedItemType = Customer | AdminMachine | AdminLabTest | AdminProduct | AdminPurchase | AdminUser | null

type TabKey = 'overview' | 'customers' | 'machines' | 'products' | 'tests' | 'alerts' | 'purchases' | 'users'

type FormValue = string | number | null | undefined | File

type CsvRow = {
  company_name?: string
  status?: string
  product_name?: string
  product_type?: string
  base_oil?: string | null
  viscosity_grade?: string | null
}

interface FormDataState {
  company_name?: string
  machine_name?: string
  customer_id?: string | null
  product_name?: string
  product_type?: string
  test_date?: string
  email?: string
  role?: string
  phone_number?: string
  contact_email?: string
  password?: string
  status?: string
  location?: string | null
  serial_number?: string
  model?: string
  base_oil?: string | null
  viscosity_grade?: string | null
  machine_id?: string
  product_id?: string
  quantity?: string | number
  unit_price?: string | number
  total_price?: string | number
  viscosity_40c?: string | number | null
  viscosity_100c?: string | number | null
  water_content?: string | number | null
  water_content_unit?: 'PPM' | 'PERCENT'
  tan_value?: string | number | null
  pdf_path?: string | null
  pdfFile?: File | null
  [key: string]: FormValue
}

export default function AdminClient({
  user,
  profile,
  customers: initialCustomers,
  machines: initialMachines,
  recentTests: initialTests,
}: AdminClientProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [modalOpen, setModalOpen] = useState<ModalType>(null)
  const [selectedItem, setSelectedItem] = useState<SelectedItemType>(null)
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [machines, setMachines] = useState<AdminMachine[]>(initialMachines)
  const [recentTests, setRecentTests] = useState<AdminLabTest[]>(initialTests)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [purchases, setPurchases] = useState<AdminPurchase[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormDataState>({})
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [customDateFrom, setCustomDateFrom] = useState<string>('')
  const [customDateTo, setCustomDateTo] = useState<string>('')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [filterMachine, setFilterMachine] = useState<string>('all')
  const [csvData, setCsvData] = useState<CsvRow[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{success: number, failed: number, errors: string[]} | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)
  const [quickAddModal, setQuickAddModal] = useState<'machine' | 'product' | null>(null)
  const [quickAddData, setQuickAddData] = useState<FormDataState>({})
  const [uniqueProductTypes, setUniqueProductTypes] = useState<string[]>([])
  const [useCustomViscosity, setUseCustomViscosity] = useState(false)
  const [useCustomViscosityQuick, setUseCustomViscosityQuick] = useState(false)
  const [alertQueue, setAlertQueue] = useState<DashboardAlert[]>([])
  const [reviewedAlertIds, setReviewedAlertIds] = useState<string[]>([])
  const [emailedAlertIds, setEmailedAlertIds] = useState<string[]>([])
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all')
  const [alertStatusFilter, setAlertStatusFilter] = useState<'all' | 'open' | 'reviewed' | 'emailed'>('all')
  const [alertCustomerFilter, setAlertCustomerFilter] = useState<string>('all')
  const [emailLanguage, setEmailLanguage] = useState<'id' | 'en'>('id')

  // Load customers
  const loadCustomers = async () => {
    const { data, error } = await supabase
      .from('oil_customers')
      .select('*')
      .order('company_name')
    if (error) console.error('Failed to load customers:', error.message)
    setCustomers(data || [])
  }

  // Load machines
  const loadMachines = async () => {
    const { data, error } = await supabase
      .from('oil_machines')
      .select('*, customer:oil_customers(company_name)')
      .order('machine_name')
    if (error) console.error('Failed to load machines:', error.message)
    setMachines(data || [])
  }

  // Load users
  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from('oil_profiles')
      .select('id, full_name, email, phone_number, role, customer_id, created_at, updated_at, customer:oil_customers(company_name)')
      .order('created_at', { ascending: false })
    if (error) console.error('Failed to load users:', error.message)
    const normalizedUsers: AdminUser[] = (data || []).map((row) => ({
      ...row,
      customer: Array.isArray(row.customer) ? (row.customer[0] ?? null) : row.customer,
    }))
    setUsers(normalizedUsers)
  }, [supabase])

  // Load products
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('oil_products')
      .select('*')
      .order('id')
    if (error) console.error('Failed to load products:', error.message)
    setProducts(data || [])
    
    // Extract unique product types for autocomplete
    if (data) {
      const types = [...new Set(data.map(p => p.product_type).filter(Boolean))]
      setUniqueProductTypes(types)
    }
  }, [supabase])

  // Load recent tests
  const loadTests = useCallback(async () => {
    const { data, error } = await supabase
      .from('oil_lab_tests')
      .select(`
        *,
        machine:machine_id (
          machine_name,
          customer_id,
          customer:customer_id (company_name)
        ),
        product:product_id (
          product_name,
          product_type
        )
      `)
      .order('test_date', { ascending: false })
      .limit(50)
    if (error) console.error('Failed to load tests:', error.message)
    setRecentTests(data || [])
  }, [supabase])

  // Load purchases
  const loadPurchases = useCallback(async () => {
    const { data, error } = await supabase
      .from('oil_purchase_history')
      .select('*, customer:oil_customers(company_name), product:oil_products(product_name)')
      .order('purchase_date', { ascending: false })
      .limit(100)
    if (error) console.error('Failed to load purchases:', error.message)
    setPurchases(data || [])
  }, [supabase])

  const loadAlertQueue = useCallback(async () => {
    try {
      const [machinesResult, testsResult, profilesResult] = await Promise.all([
        supabase
          .from('oil_machines')
          .select('id, machine_name, customer_id, customer:oil_customers(company_name)')
          .eq('status', 'active'),
        supabase
          .from('oil_lab_tests')
          .select('id, machine_id, test_date, water_content, tan_value')
          .order('test_date', { ascending: false })
          .limit(500),
        supabase
          .from('oil_profiles')
          .select('customer_id, email, full_name')
          .eq('role', 'customer')
          .not('customer_id', 'is', null),
      ])

      if (machinesResult.error || testsResult.error || profilesResult.error) {
        console.error('Failed to load alert queue:', {
          machines: machinesResult.error?.message,
          tests: testsResult.error?.message,
          profiles: profilesResult.error?.message,
        })
        setAlertQueue([])
        return
      }

      const latestByMachine = new Map<string, { test_date: string; water_content: number | null; tan_value: number | null }>()
      ;(testsResult.data || []).forEach((test) => {
        if (!latestByMachine.has(test.machine_id)) {
          latestByMachine.set(test.machine_id, test)
        }
      })

      const emailByCustomer = new Map<string, string>()
      ;(profilesResult.data || []).forEach((profileItem) => {
        if (!profileItem.customer_id || emailByCustomer.has(profileItem.customer_id)) return
        emailByCustomer.set(profileItem.customer_id, profileItem.email || '')
      })

      const alertInputs = (machinesResult.data || []).map((machineItem) => {
        const latestTest = latestByMachine.get(machineItem.id)
        const water = latestTest?.water_content || 0
        const tan = latestTest?.tan_value || 0
        const daysSinceTest = latestTest?.test_date
          ? Math.floor((Date.now() - new Date(latestTest.test_date).getTime()) / (1000 * 60 * 60 * 24))
          : null

        let statusLevel: 'critical' | 'warning' | 'normal' | 'unknown' = 'unknown'
        let statusText = 'No data'
        let nextAction = 'Schedule initial sampling now'
        if (latestTest) {
          if (water >= 0.15 || tan >= 1.0 || (daysSinceTest !== null && daysSinceTest > 60)) {
            statusLevel = 'critical'
            statusText = 'Critical trend from latest lab result'
            nextAction = 'Send manual email today and ask customer to retest within 3 days'
          } else if (water >= 0.08 || tan >= 0.5 || (daysSinceTest !== null && daysSinceTest > 30)) {
            statusLevel = 'warning'
            statusText = 'Warning trend from latest lab result'
            nextAction = 'Send manual email reminder and schedule retest in 14 days'
          } else {
            statusLevel = 'normal'
            statusText = 'Normal condition'
            nextAction = 'Continue regular monthly monitoring'
          }
        }

        const customerRelation = Array.isArray(machineItem.customer) ? machineItem.customer[0] : machineItem.customer
        return {
          machineId: machineItem.id,
          customerId: machineItem.customer_id || null,
          machineName: machineItem.machine_name,
          customerName: customerRelation?.company_name || 'Unknown customer',
          customerEmail: emailByCustomer.get(machineItem.customer_id) || '-',
          statusLevel,
          statusText,
          nextAction,
          testDate: latestTest?.test_date || null,
          daysSinceTest,
          healthScore: null,
        }
      })

      const queue = buildDashboardAlerts(alertInputs)
      setAlertQueue(queue)

      if (queue.length > 0) {
        const alertKeys = queue.map((item) => item.id)
        const { data: actionRows, error: actionError } = await supabase
          .from('oil_alert_actions')
          .select('alert_key, action_type')
          .in('alert_key', alertKeys)
          .in('action_type', ['reviewed', 'email_sent'])

        if (actionError) {
          console.error('Failed to load alert action state:', actionError.message)
        } else {
          const reviewed = (actionRows || [])
            .filter((row) => row.action_type === 'reviewed')
            .map((row) => row.alert_key)
          const emailed = (actionRows || [])
            .filter((row) => row.action_type === 'email_sent')
            .map((row) => row.alert_key)

          setReviewedAlertIds(Array.from(new Set(reviewed)))
          setEmailedAlertIds(Array.from(new Set(emailed)))
        }
      } else {
        setReviewedAlertIds([])
        setEmailedAlertIds([])
      }
    } catch (error) {
      console.error('Unexpected alert queue error:', error)
      setAlertQueue([])
    }
  }, [supabase])

  // Load users when switching to users tab
  useEffect(() => {
    if (activeTab === 'overview') {
      loadTests()
    }
    if (activeTab === 'users') {
      loadUsers()
    }
    if (activeTab === 'products') {
      loadProducts()
    }
    if (activeTab === 'tests') {
      loadTests()
    }
    if (activeTab === 'alerts') {
      loadAlertQueue()
    }
    if (activeTab === 'purchases') {
      loadPurchases()
    }
  }, [activeTab, loadAlertQueue, loadProducts, loadPurchases, loadTests, loadUsers])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const refreshData = () => {
    // Refresh semua data yang sedang aktif
    loadCustomers()
    loadMachines()
    loadTests() // Always load tests for overview Recent Activity
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'products') loadProducts()
    if (activeTab === 'alerts') loadAlertQueue()
    if (activeTab === 'purchases') loadPurchases()
    router.refresh()
  }

  const markAlertReviewed = (alertId: string) => {
    const found = alertQueue.find((item) => item.id === alertId)
    if (!found) return

    void (async () => {
      const { error } = await supabase.from('oil_alert_actions').upsert(
        {
          alert_key: found.id,
          action_type: 'reviewed',
          actor_id: user.id,
          customer_id: found.customerId,
          machine_id: found.machineId,
          payload: {
            machine_name: found.machineName,
            customer_name: found.customerName,
            severity: found.severity,
          },
        },
        { onConflict: 'alert_key,action_type' }
      )

      if (error) {
        alert(`Failed to mark alert as reviewed: ${error.message}`)
        return
      }

      setReviewedAlertIds((prev) => (prev.includes(alertId) ? prev : [...prev, alertId]))
    })()
  }

  const sendManualEmail = (alertItem: DashboardAlert) => {
    const to = alertItem.customerEmail && alertItem.customerEmail !== '-' ? alertItem.customerEmail : ''
    const subject =
      emailLanguage === 'id'
        ? `[OilTrack Alert] ${alertItem.severity.toUpperCase()} - ${alertItem.machineName}`
        : `[OilTrack Alert] ${alertItem.severity.toUpperCase()} - ${alertItem.machineName}`
    const body =
      emailLanguage === 'id'
        ? [
            `Yth. ${alertItem.customerName},`,
            '',
            `Kami mendeteksi kondisi ${alertItem.severity} pada mesin ${alertItem.machineName}.`,
            `Ringkasan: ${alertItem.message}`,
            `Rekomendasi tindakan: ${alertItem.recommendedAction}`,
            '',
            'Mohon konfirmasi rencana maintenance dan jadwal retest Anda.',
            '',
            'Hormat kami,',
            'Tim Admin OilTrack',
          ].join('\n')
        : [
            `Dear ${alertItem.customerName},`,
            '',
            `We detected a ${alertItem.severity} condition on machine ${alertItem.machineName}.`,
            `Summary: ${alertItem.message}`,
            `Recommended action: ${alertItem.recommendedAction}`,
            '',
            'Please confirm your maintenance schedule and retest plan.',
            '',
            'Regards,',
            'OilTrack Admin Team',
          ].join('\n')

    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, '_blank')

    void (async () => {
      const { error } = await supabase.from('oil_alert_actions').upsert(
        {
          alert_key: alertItem.id,
          action_type: 'email_sent',
          actor_id: user.id,
          customer_id: alertItem.customerId,
          machine_id: alertItem.machineId,
          payload: {
            recipient: to,
            subject,
            language: emailLanguage,
          },
        },
        { onConflict: 'alert_key,action_type' }
      )

      if (error) {
        alert(`Failed to save email action: ${error.message}`)
        return
      }

      setEmailedAlertIds((prev) => (prev.includes(alertItem.id) ? prev : [...prev, alertItem.id]))
    })()
  }

  const filteredAlertQueue = alertQueue.filter((alertItem) => {
    const severityMatch = alertSeverityFilter === 'all' || alertItem.severity === alertSeverityFilter
    const customerMatch = alertCustomerFilter === 'all' || alertItem.customerId === alertCustomerFilter
    const reviewed = reviewedAlertIds.includes(alertItem.id)
    const emailed = emailedAlertIds.includes(alertItem.id)

    let statusMatch = true
    if (alertStatusFilter === 'open') statusMatch = !reviewed && !emailed
    if (alertStatusFilter === 'reviewed') statusMatch = reviewed
    if (alertStatusFilter === 'emailed') statusMatch = emailed

    return severityMatch && customerMatch && statusMatch
  })

  // Customer CRUD
  const openAddCustomer = () => {
    setFormData({ company_name: '', status: 'active' })
    setModalOpen('add-customer')
  }

  const openEditCustomer = (customer: Customer) => {
    setSelectedItem(customer)
    setFormData({ company_name: customer.company_name, status: customer.status })
    setModalOpen('edit-customer')
  }

  const handleSaveCustomer = async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-customer') {
        const { error } = await supabase
          .from('oil_customers')
          .insert([formData])
        if (error) throw error
        alert('Customer added successfully!')
      } else if (modalOpen === 'edit-customer') {
        const selectedItemId = selectedItem?.id
        if (!selectedItemId) throw new Error('No customer selected')
        const { error } = await supabase
          .from('oil_customers')
          .update(formData)
          .eq('id', selectedItemId)
        if (error) throw error
        alert('Customer updated successfully!')
      }
      setModalOpen(null)
      refreshData()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('oil_customers')
        .delete()
        .eq('id', id)
      if (error) throw error
      alert('Customer deleted successfully!')
      refreshData()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  // localStorage functions for form state persistence
  const saveLabTestDraft = () => {
    try {
      localStorage.setItem('labTestDraft', JSON.stringify({
        machine_id: formData.machine_id,
        product_id: formData.product_id,
        test_date: formData.test_date,
        viscosity_40c: formData.viscosity_40c,
        viscosity_100c: formData.viscosity_100c,
        water_content: formData.water_content,
        water_content_unit: formData.water_content_unit,
        tan_value: formData.tan_value,
        timestamp: Date.now()
      }))
    } catch (e) {
      console.error('Error saving draft:', e)
    }
  }

  const restoreLabTestDraft = (newItemId?: string, itemType?: 'machine' | 'product') => {
    try {
      const draft = localStorage.getItem('labTestDraft')
      if (draft) {
        const data = JSON.parse(draft)
        // Check if less than 24 hours old
        if (Date.now() - data.timestamp < 86400000) {
          const restoredData = { ...data }
          delete restoredData.timestamp
          
          // Auto-select new item if provided
          if (newItemId && itemType === 'machine') {
            restoredData.machine_id = newItemId
          } else if (newItemId && itemType === 'product') {
            restoredData.product_id = newItemId
          }
          
          setFormData(restoredData)
        } else {
          localStorage.removeItem('labTestDraft')
        }
      }
    } catch (e) {
      console.error('Error restoring draft:', e)
    }
  }

  const clearLabTestDraft = () => {
    localStorage.removeItem('labTestDraft')
  }

  // Logo Upload Functions
  const openLogoUpload = (customer: Customer) => {
    setSelectedItem(customer)
    setLogoFile(null)
    setLogoPreview(customer.logo_url || null)
    setModalOpen('upload-logo')
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }
      // Check file size (5MB max before compression)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadLogo = async () => {
    if (!logoFile || !selectedItem || !('company_name' in selectedItem)) return
    const selectedCustomer = selectedItem as Customer
    
    setUploadingLogo(true)
    try {
      // Compress image
      const options = {
        maxSizeMB: 0.5,        // Max 500KB
        maxWidthOrHeight: 400,  // Max 400px for logo
        useWebWorker: true,
        fileType: 'image/webp'  // WebP for better compression
      }
      
      const compressedFile = await imageCompression(logoFile, options)
      
      // Generate filename: customer_id.webp
      const fileExt = 'webp'
      const fileName = `${selectedCustomer.id}.${fileExt}`
      const filePath = `${selectedCustomer.id}/${fileName}`
      
      // Delete old logo if exists
      if (selectedCustomer.logo_url) {
        const oldPath = selectedCustomer.logo_url.split('/').slice(-2).join('/')
        await supabase.storage
          .from('customer-logos')
          .remove([oldPath])
      }
      
      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('customer-logos')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('customer-logos')
        .getPublicUrl(filePath)
      
      // Update customer record
      const { error: updateError } = await supabase
        .from('oil_customers')
        .update({ 
          logo_url: publicUrl,
          logo_updated_at: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id)
      
      if (updateError) throw updateError
      
      alert('Logo uploaded successfully!')
      setModalOpen(null)
      refreshData()
    } catch (error: unknown) {
      console.error('Upload error:', error)
      alert('Error uploading logo: ' + getErrorMessage(error))
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDeleteLogo = async () => {
    if (!selectedItem || !('company_name' in selectedItem)) return
    const selectedCustomer = selectedItem as Customer
    if (!selectedCustomer.logo_url) return
    if (!confirm('Are you sure you want to delete this logo?')) return
    
    setUploadingLogo(true)
    try {
      // Delete from storage
      const oldPath = selectedCustomer.logo_url.split('/').slice(-2).join('/')
      await supabase.storage
        .from('customer-logos')
        .remove([oldPath])
      
      // Update customer record
      const { error } = await supabase
        .from('oil_customers')
        .update({ logo_url: null, logo_updated_at: new Date().toISOString() })
        .eq('id', selectedCustomer.id)
      
      if (error) throw error
      
      alert('Logo deleted successfully!')
      setModalOpen(null)
      refreshData()
    } catch (error: unknown) {
      alert('Error deleting logo: ' + getErrorMessage(error))
    } finally {
      setUploadingLogo(false)
    }
  }

  // Machine CRUD
  const openAddMachine = () => {
    setFormData({ 
      machine_name: '', 
      customer_id: customers[0]?.id || '', 
      location: '', 
      status: 'active' 
    })
    setModalOpen('add-machine')
  }

  const openEditMachine = (machine: AdminMachine) => {
    setSelectedItem(machine)
    setFormData({
      machine_name: machine.machine_name,
      customer_id: machine.customer_id,
      location: machine.location,
      status: machine.status
    })
    setModalOpen('edit-machine')
  }

  const handleSaveMachine = async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-machine') {
        const { error } = await supabase
          .from('oil_machines')
          .insert([formData])
        if (error) throw error
        alert('Machine added successfully!')
      } else if (modalOpen === 'edit-machine') {
        const selectedItemId = selectedItem?.id
        if (!selectedItemId) throw new Error('No machine selected')
        const { error } = await supabase
          .from('oil_machines')
          .update(formData)
          .eq('id', selectedItemId)
        if (error) throw error
        alert('Machine updated successfully!')
      }
      setModalOpen(null)
      refreshData()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMachine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this machine?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('oil_machines')
        .delete()
        .eq('id', id)
      if (error) throw error
      alert('Machine deleted successfully!')
      refreshData()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  // Quick Add Machine (from Lab Test modal)
  const openQuickAddMachine = () => {
    saveLabTestDraft() // Save current lab test form
    setQuickAddData({
      machine_name: '',
      serial_number: '',
      model: '',
      location: '',
      status: 'active',
      customer_id: customers[0]?.id || ''
    })
    setQuickAddModal('machine')
  }

  const handleQuickSaveMachine = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('oil_machines')
        .insert([quickAddData])
        .select()
        .single()
      
      if (error) throw error
      
      // Refresh machines list
      await loadMachines()
      
      // Restore lab test form and auto-select new machine
      restoreLabTestDraft(data.id, 'machine')
      
      alert('Machine added successfully!')
      setQuickAddModal(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const cancelQuickAddMachine = () => {
    restoreLabTestDraft() // Restore without new item
    setQuickAddModal(null)
  }

  // Quick Add Product (from Lab Test modal)
  const openQuickAddProduct = () => {
    saveLabTestDraft() // Save current lab test form
    setQuickAddData({
      product_name: '',
      product_type: '',
      base_oil: '',
      viscosity_grade: ''
    })
    setQuickAddModal('product')
  }

  const handleQuickSaveProduct = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('oil_products')
        .insert([quickAddData])
        .select()
        .single()
      
      if (error) throw error
      
      // Refresh products list
      await loadProducts()
      
      // Restore lab test form and auto-select new product
      restoreLabTestDraft(data.id, 'product')
      
      alert('Product added successfully!')
      setQuickAddModal(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const cancelQuickAddProduct = () => {
    restoreLabTestDraft() // Restore without new item
    setQuickAddModal(null)
  }

  // Product CRUD
  const openAddProduct = () => {
    setFormData({ 
      product_name: '', 
      product_type: '',
      base_oil: '',
      viscosity_grade: ''
    })
    setModalOpen('add-product')
  }

  const openEditProduct = (product: AdminProduct) => {
    setSelectedItem(product)
    setFormData({
      product_name: product.product_name,
      product_type: product.product_type,
      base_oil: product.base_oil || '',
      viscosity_grade: product.viscosity_grade || ''
    })
    setModalOpen('edit-product')
  }

  const handleSaveProduct = async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-product') {
        const { error } = await supabase
          .from('oil_products')
          .insert([formData])
        if (error) throw error
        alert('Product added successfully!')
      } else if (modalOpen === 'edit-product') {
        const selectedItemId = selectedItem?.id
        if (!selectedItemId) throw new Error('No product selected')
        const { error } = await supabase
          .from('oil_products')
          .update(formData)
          .eq('id', selectedItemId)
        if (error) throw error
        alert('Product updated successfully!')
      }
      setModalOpen(null)
      // Reload products
      const { data: productsData } = await supabase
        .from('oil_products')
        .select('*')
        .order('id')
      setProducts(productsData || [])
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('oil_products')
        .delete()
        .eq('id', id)
      if (error) throw error
      alert('Product deleted successfully!')
      // Reload products
      const { data: productsData } = await supabase
        .from('oil_products')
        .select('*')
        .order('id')
      setProducts(productsData || [])
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  // Purchase History CRUD
  const openAddPurchase = async () => {
    // Load products for dropdown
    const { data: productsData } = await supabase
      .from('oil_products')
      .select('*')
      .order('id')
    
    setProducts(productsData || [])
    
    setFormData({
      customer_id: customers[0]?.id || '',
      product_id: productsData?.[0]?.id || '',
      purchase_date: new Date().toISOString().split('T')[0],
      quantity: '',
      unit_price: '',
      total_price: '',
      status: 'completed'
    })
    setModalOpen('add-purchase')
  }

  const openEditPurchase = (purchase: AdminPurchase) => {
    setSelectedItem(purchase)
    const computedTotal = (purchase.total_price ?? ((purchase.quantity || 0) * (purchase.unit_price || 0)))
    setFormData({
      customer_id: purchase.customer_id,
      product_id: purchase.product_id,
      purchase_date: purchase.purchase_date.split('T')[0],
      quantity: purchase.quantity,
      unit_price: purchase.unit_price,
      total_price: computedTotal,
      status: purchase.status
    })
    setModalOpen('edit-purchase')
  }

  const handleSavePurchase = async () => {
    setLoading(true)
    try {
      const toNumber = (value: unknown) => {
        if (value === null || value === undefined) return 0
        // Handle inputs like "1,250.50" or "1250,50" safely.
        const raw = String(value).trim()
        if (!raw) return 0
        const normalized = raw.includes(',') && !raw.includes('.')
          ? raw.replace(/\./g, '').replace(',', '.')
          : raw.replace(/,/g, '')
        const parsed = Number(normalized)
        return Number.isFinite(parsed) ? parsed : 0
      }

      const round2 = (num: number) => Math.round(num * 100) / 100

      const quantity = round2(toNumber(formData.quantity))
      const unitPrice = round2(toNumber(formData.unit_price))
      const totalPrice = round2(toNumber(formData.total_price) || (quantity * unitPrice))

      const MAX_QUANTITY = 99999999.99 // NUMERIC(10,2)
      const MAX_UNIT_PRICE = 9999999999.99 // NUMERIC(12,2)
      const MAX_TOTAL_PRICE = 999999999999.99 // NUMERIC(14,2)

      if (quantity > MAX_QUANTITY) {
        throw new Error('Quantity terlalu besar. Maksimal 99,999,999.99')
      }
      if (unitPrice > MAX_UNIT_PRICE) {
        throw new Error('Unit Price terlalu besar. Maksimal 9,999,999,999.99')
      }
      if (totalPrice > MAX_TOTAL_PRICE) {
        throw new Error('Total Price terlalu besar. Maksimal 999,999,999,999.99')
      }

      const purchaseData = {
        customer_id: formData.customer_id,
        product_id: formData.product_id,
        purchase_date: formData.purchase_date,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        status: formData.status
      }

      const purchaseDataNoTotal = {
        customer_id: formData.customer_id,
        product_id: formData.product_id,
        purchase_date: formData.purchase_date,
        quantity,
        unit_price: unitPrice,
        status: formData.status
      }

      if (modalOpen === 'add-purchase') {
        let { error } = await supabase
          .from('oil_purchase_history')
          .insert([purchaseData])
        if (error?.message?.includes("'total_price'")) {
          const retry = await supabase
            .from('oil_purchase_history')
            .insert([purchaseDataNoTotal])
          error = retry.error
        }
        if (error) throw error
        alert('Purchase added successfully!')
      } else if (modalOpen === 'edit-purchase') {
        const selectedItemId = selectedItem?.id
        if (!selectedItemId) throw new Error('No purchase selected')
        let { error } = await supabase
          .from('oil_purchase_history')
          .update(purchaseData)
          .eq('id', selectedItemId)
        if (error?.message?.includes("'total_price'")) {
          const retry = await supabase
            .from('oil_purchase_history')
            .update(purchaseDataNoTotal)
            .eq('id', selectedItemId)
          error = retry.error
        }
        if (error) throw error
        alert('Purchase updated successfully!')
      }
      
      await loadPurchases()
      setModalOpen(null)
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error).toLowerCase()
      if (errorMessage.includes('numeric field overflow')) {
        alert('Error: nilai angka terlalu besar untuk kolom database. Cek Quantity, Unit Price, dan Total Price.')
      } else {
        alert('Error: ' + getErrorMessage(error))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePurchase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this purchase?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('oil_purchase_history')
        .delete()
        .eq('id', id)
      if (error) throw error
      alert('Purchase deleted successfully!')
      await loadPurchases()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  // Lab Test CRUD
  const openAddTest = async () => {
    // Load products from database
    const { data: productsData } = await supabase
      .from('oil_products')
      .select('*')
      .order('id')
    
    setProducts(productsData || [])
    
    setFormData({
      machine_id: machines[0]?.id || '',
      product_id: productsData?.[0]?.id || '',
      test_date: new Date().toISOString().split('T')[0],
      viscosity_40c: '',
      viscosity_100c: '',
      water_content: '',
      water_content_unit: 'PPM',
      tan_value: ''
    })
    setModalOpen('add-test')
  }

  const openEditTest = (test: AdminLabTest) => {
    setSelectedItem(test)
    setFormData({
      machine_id: test.machine_id,
      product_id: test.product_id,
      test_date: test.test_date.split('T')[0],
      viscosity_40c: test.viscosity_40c,
      viscosity_100c: test.viscosity_100c,
      water_content: test.water_content,
      water_content_unit: test.water_content_unit || 'PPM',
      tan_value: test.tan_value
    })
    setModalOpen('edit-test')
  }

  const handleSaveTest = async () => {
    setLoading(true)
    try {
      // Validate required fields
      if (!formData.machine_id) {
        alert('Please select a machine')
        setLoading(false)
        return
      }
      if (!formData.product_id) {
        alert('Please select a product')
        setLoading(false)
        return
      }
      
      let pdfPath = formData.pdf_path || null
      
      // Upload PDF if selected
      const pdfFile = formData.pdfFile
      if (pdfFile instanceof File) {
        const file = pdfFile
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const { data, error: uploadError } = await supabase.storage
          .from('lab-reports')
          .upload(fileName, file)
        
        if (uploadError) throw uploadError
        pdfPath = data.path
      }
      
      // Convert water content from PPM to decimal if needed
      let waterContentDecimal = parseFloat(String(formData.water_content ?? '')) || null
      if (waterContentDecimal !== null && formData.water_content_unit === 'PPM') {
        waterContentDecimal = waterContentDecimal / 10000 // PPM to decimal (198 PPM = 0.0198)
      } else if (waterContentDecimal !== null && formData.water_content_unit === 'PERCENT') {
        waterContentDecimal = waterContentDecimal / 100 // Percent to decimal (0.5% = 0.005)
      }
      
      const testData = {
        machine_id: formData.machine_id,
        product_id: formData.product_id || null,
        test_date: formData.test_date,
        viscosity_40c: parseFloat(String(formData.viscosity_40c ?? '')) || null,
        viscosity_100c: parseFloat(String(formData.viscosity_100c ?? '')) || null,
        water_content: waterContentDecimal,
        water_content_unit: formData.water_content_unit || 'PPM',
        tan_value: parseFloat(String(formData.tan_value ?? '')) || null,
        pdf_path: pdfPath,
      }
      
      if (modalOpen === 'add-test') {
        const { error } = await supabase
          .from('oil_lab_tests')
          .insert([testData])
        if (error) throw error
        alert('Lab test added successfully!')
      } else if (modalOpen === 'edit-test') {
        const selectedItemId = selectedItem?.id
        if (!selectedItemId) throw new Error('No lab test selected')
        const { error } = await supabase
          .from('oil_lab_tests')
          .update(testData)
          .eq('id', selectedItemId)
        if (error) throw error
        alert('Lab test updated successfully!')
      }
      
      // Reload tests immediately
      await loadTests()
      setModalOpen(null)
      clearLabTestDraft() // Clear draft after successful save
      refreshData()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lab test?')) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('oil_lab_tests')
        .delete()
        .eq('id', id)
      if (error) throw error
      alert('Lab test deleted successfully!')
      await loadTests()
      refreshData()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  // User CRUD
  const openAddUser = () => {
    setFormData({ 
      email: '', 
      password: '', 
      full_name: '', 
      role: 'customer', 
      customer_id: customers[0]?.id || '' 
    })
    setModalOpen('add-user')
  }

  const openEditUser = (user: AdminUser) => {
    setSelectedItem(user)
    setFormData({ 
      full_name: user.full_name, 
      role: user.role,
      customer_id: user.customer_id 
    })
    setModalOpen('edit-user')
  }

  const handleSaveUser = async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-user') {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            contact_email: formData.contact_email,
            phone_number: formData.phone_number,
            role: formData.role,
            customer_id: formData.customer_id,
          }),
        })
        
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        
        alert('User created successfully!')
        await loadUsers()
      } else if (modalOpen === 'edit-user') {
        const selectedItemId = selectedItem?.id
        if (!selectedItemId) throw new Error('No user selected')
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            userId: selectedItemId,
            full_name: formData.full_name,
            contact_email: formData.contact_email,
            phone_number: formData.phone_number,
            role: formData.role,
            customer_id: formData.customer_id,
          }),
        })
        
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        
        alert('User updated successfully!')
        await loadUsers()
      }
      setModalOpen(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          userId: id,
        }),
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      alert('User deleted successfully!')
      await loadUsers()
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const totalCustomers = customers.length
  const totalMachines = machines.length
  const totalTests = recentTests.length
  const activeCustomers = customers.filter(c => c.status === 'active').length

  // Date filter helper
  const filterByDate = (dateString: string) => {
    if (!dateString) return true
    
    const testDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Custom date range
    if (customDateFrom || customDateTo) {
      const fromDate = customDateFrom ? new Date(customDateFrom) : new Date('1900-01-01')
      const toDate = customDateTo ? new Date(customDateTo) : new Date('2100-12-31')
      toDate.setHours(23, 59, 59, 999)
      return testDate >= fromDate && testDate <= toDate
    }
    
    // Quick filters
    if (dateFilter === 'all') return true
    
    if (dateFilter === 'today') {
      return testDate >= today
    }
    
    if (dateFilter === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      return testDate >= weekAgo
    }
    
    if (dateFilter === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(today.getMonth() - 1)
      return testDate >= monthAgo
    }
    
    return true
  }

  const selectedCustomerForLogo =
    modalOpen === 'upload-logo' && selectedItem && 'company_name' in selectedItem
      ? (selectedItem as Customer)
      : null

  return (
    <div className="clean-ui admin-orange-icons admin-panel min-h-screen bg-gray-50 bg-grid-pattern flex flex-col" style={{ backgroundSize: '40px 40px' }}>
      <header className="bg-white shadow-lg backdrop-blur-sm sticky top-0 z-50 border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center">
                  OilTrack™ Admin
                  <span className="ml-2 sm:ml-3 inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5 sm:mr-2 animate-pulse"></span>
                    Active
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium truncate max-w-[250px] sm:max-w-none">{user.email} • {profile.role.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleSignOut}
                className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center w-full sm:w-auto justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <div className="w-full max-w-full grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-100 hover:border-primary-300 transition-all transform hover:scale-105">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wider">Total Customers</div>
              <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-2">{totalCustomers}</div>
            <div className="flex items-center text-xs font-black text-green-600">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {activeCustomers} active
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-secondary-100 hover:border-secondary-300 transition-all transform hover:scale-105">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wider">Total Machines</div>
              <svg className="w-8 h-8 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div className="text-4xl font-black text-gray-900">{totalMachines}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-primary-100 hover:border-primary-300 transition-all transform hover:scale-105">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wider">Recent Tests</div>
              <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="text-4xl font-black text-gray-900">{totalTests}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100 hover:border-green-300 transition-all transform hover:scale-105">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-wider">System Status</div>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-2xl font-black text-green-600 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Operational
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 bg-white rounded-2xl shadow-lg mb-6 border-2 border-primary-100 overflow-hidden">
          <div className="bg-gray-100 border-b-2 border-primary-200 overflow-x-auto sm:overflow-visible">
            <nav className="flex min-w-max sm:min-w-0 sm:w-full sm:justify-center">
              {[
                { key: 'overview', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14l3-3 3 2 5-6" /></svg>, label: 'Overview' },
                { key: 'customers', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Customers' },
                { key: 'machines', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Machines' },
                { key: 'products', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, label: 'Products' },
                { key: 'tests', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>, label: 'Tests' },
                { key: 'alerts', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, label: 'Alerts' },
                { key: 'purchases', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H6.4M7 13 6.4 5M7 13l-2 2m2-2 1.2 2.4M17 13l1.2 2.4M6 21a1 1 0 100-2 1 1 0 000 2zm11 0a1 1 0 100-2 1 1 0 000 2" /></svg>, label: 'Purchases' },
                { key: 'users', icon: <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A4 4 0 018 16h8a4 4 0 012.879 1.804M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Users' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as TabKey)
                    setSearchQuery('')
                    setDateFilter('all')
                    setCustomDateFrom('')
                    setCustomDateTo('')
                    setFilterCompany('all')
                    setFilterMachine('all')
                  }}
                  className={`px-6 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-black border-b-4 transition-all whitespace-nowrap uppercase tracking-wide ${
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-700 bg-white/50'
                      : 'border-transparent text-gray-600 hover:text-primary-600 hover:bg-white/30'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6 lg:p-8 motion-soft-enter">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3 flex items-center gap-3">
                  <svg className="w-8 h-8 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="tracking-tight">System</span>
                  <span className="tracking-tight text-red-600">Overview</span>
                </h2>
                <p className="mb-6 text-sm font-medium text-gray-500">Live summary of customers, machines, tests, and products.</p>

                {/* Stats Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                  {/* Total Customers */}
                  <div className="rounded-3xl border border-orange-100/80 bg-white p-6 shadow-lg ring-1 ring-orange-50 transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Customers</p>
                        <p className="mt-2 text-4xl font-black text-gray-900">{totalCustomers}</p>
                        <p className="mt-2 text-xs text-gray-500">{activeCustomers} active</p>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Machines */}
                  <div className="rounded-3xl border border-orange-100/80 bg-white p-6 shadow-lg ring-1 ring-orange-50 transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Machines</p>
                        <p className="mt-2 text-4xl font-black text-gray-900">{totalMachines}</p>
                        <p className="mt-2 text-xs text-gray-500">{machines.filter(m => m.status === 'active').length} active</p>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Tests */}
                  <div className="rounded-3xl border border-orange-100/80 bg-white p-6 shadow-lg ring-1 ring-orange-50 transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Lab Tests</p>
                        <p className="mt-2 text-4xl font-black text-gray-900">{totalTests}</p>
                        <p className="mt-2 text-xs text-gray-500">Total recorded</p>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Total Products */}
                  <div className="rounded-3xl border border-orange-200 bg-white p-6 shadow-lg ring-1 ring-orange-100 transition-all hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-orange-500">Products</p>
                        <p className="mt-2 text-4xl font-black text-gray-900">{products.length}</p>
                        <p className="mt-2 text-xs text-gray-500">In catalog</p>
                      </div>
                      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                  <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setActiveTab('customers')}
                      className="bg-white border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group"
                    >
                      <svg className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span className="text-sm font-bold text-gray-700">Add Customer</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('machines')}
                      className="bg-white border-2 border-green-200 hover:border-green-500 hover:bg-green-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group"
                    >
                      <svg className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-sm font-bold text-gray-700">Add Machine</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('tests')}
                      className="bg-white border-2 border-purple-200 hover:border-purple-500 hover:bg-purple-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group"
                    >
                      <svg className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <span className="text-sm font-bold text-gray-700">Add Test</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('products')}
                      className="bg-white border-2 border-orange-200 hover:border-orange-500 hover:bg-orange-50 rounded-xl p-4 transition-all flex flex-col items-center gap-2 group"
                    >
                      <svg className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="text-sm font-bold text-gray-700">Add Product</span>
                    </button>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Recent Activity */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recent Activity
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {recentTests.slice(0, 8).map((test) => (
                        <div key={test.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="bg-primary-100 p-2 rounded-lg flex-shrink-0">
                            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">Lab test for {test.machine?.machine_name || 'Unknown Machine'}</p>
                            <p className="text-xs text-gray-500">{formatDate(test.test_date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Performers */}
                  <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                      <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Top Customers by Tests
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const testsByCustomer = recentTests.reduce<Record<string, { name: string; count: number }>>((acc, test) => {
                          const customerId = test.machine?.customer_id
                          const companyName = test.machine?.customer?.company_name || 'Unknown'
                          if (customerId) {
                            if (!acc[customerId]) {
                              acc[customerId] = { name: companyName, count: 0 }
                            }
                            acc[customerId].count++
                          }
                          return acc
                        }, {})
                        
                        return Object.entries(testsByCustomer)
                          .sort(([, a], [, b]) => b.count - a.count)
                          .slice(0, 5)
                          .map(([id, data], idx) => (
                            <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="bg-red-600 text-white font-black text-sm w-8 h-8 rounded-lg flex items-center justify-center">
                                  {idx + 1}
                                </div>
                                <span className="font-bold text-gray-900 text-sm">{data.name}</span>
                              </div>
                              <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold">
                                {data.count} tests
                              </span>
                            </div>
                          ))
                      })()}
                    </div>
                  </div>
                </div>

                {/* Machine Status Distribution */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
                  <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Machine Status Overview
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-700 text-sm font-bold uppercase">Active</p>
                          <p className="text-green-900 text-3xl font-black mt-1">
                            {machines.filter(m => m.status === 'active').length}
                          </p>
                        </div>
                        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-yellow-700 text-sm font-bold uppercase">Maintenance</p>
                          <p className="text-yellow-900 text-3xl font-black mt-1">
                            {machines.filter(m => m.status === 'maintenance').length}
                          </p>
                        </div>
                        <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    </div>
                    <div className="bg-orange-100 border-2 border-orange-200 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-700 text-sm font-bold uppercase">Inactive</p>
                          <p className="text-gray-900 text-3xl font-black mt-1">
                            {machines.filter(m => m.status === 'inactive').length}
                          </p>
                        </div>
                        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customers' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    All <span className="text-red-600">Customers</span>
                  </h2>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setModalOpen('import-customers')}
                      className="flex-1 sm:flex-none px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Import CSV
                    </button>
                    <button
                      onClick={openAddCustomer}
                      className="flex-1 sm:flex-none px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Customer
                    </button>
                  </div>
                </div>
                
                {/* Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search customers by company name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
                  <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
                    <thead className="bg-orange-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Logo</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {customers.filter(customer => 
                        customer.company_name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((customer) => (
                        <tr key={customer.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-16 h-12 rounded-lg overflow-hidden bg-white border-2 border-gray-200 flex items-center justify-center p-2">
                              {customer.logo_url ? (
                                <Image
                                  src={customer.logo_url}
                                  alt={customer.company_name}
                                  width={64}
                                  height={48}
                                  className="max-w-full max-h-full object-contain"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-red-600 rounded flex items-center justify-center">
                                  <span className="text-white font-black text-xs">
                                    {customer.company_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              {customer.company_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${
                              customer.status === 'active' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}>
                              {customer.status === 'active' && (
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                              )}
                              {customer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {formatDate(customer.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-2">
                            <button
                              onClick={() => openLogoUpload(customer)}
                              className="inline-flex items-center px-3 py-1.5 text-blue-700 hover:text-white bg-blue-100 hover:bg-blue-600 rounded-lg transition-all"
                              title="Upload Logo"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Logo
                            </button>
                            <button
                              onClick={() => openEditCustomer(customer)}
                              className="inline-flex items-center px-3 py-1.5 text-primary-700 hover:text-white bg-primary-100 hover:bg-primary-600 rounded-lg transition-all"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="inline-flex items-center px-3 py-1.5 text-secondary-700 hover:text-white bg-secondary-100 hover:bg-secondary-600 rounded-lg transition-all"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'machines' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    All <span className="text-orange-600">Machines</span>
                  </h2>
                  <button
                    onClick={openAddMachine}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Machine
                  </button>
                </div>
                
                {/* Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search machines by name, serial number, or model..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
                  <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
                    <thead className="bg-orange-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Machine Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {machines.filter(machine => 
                        machine.machine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        machine.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        machine.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        machine.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((machine) => (
                        <tr key={machine.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{machine.machine_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {machine.customer?.company_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {machine.location || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              machine.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {machine.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                            <button
                              onClick={() => openEditMachine(machine)}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMachine(machine.id)}
                              className="text-secondary-600 hover:text-secondary-800 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {machines.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                            No machines found. Click "Add Machine" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    All <span className="text-red-600">Products</span>
                  </h2>
                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setModalOpen('import-products')}
                      className="flex-1 sm:flex-none px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Import CSV
                    </button>
                    <button
                      onClick={openAddProduct}
                      className="flex-1 sm:flex-none px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Product
                    </button>
                  </div>
                </div>
                
                {/* Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search products by name or type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
                  <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
                    <thead className="bg-orange-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Product Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Product Type</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Base Oil</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Viscosity Grade</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {products.filter(product => 
                        product.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        product.product_type?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((product) => (
                        <tr key={product.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{product.product_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-primary-100 text-primary-800">
                              {product.product_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {product.base_oil || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {product.viscosity_grade || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                            <button
                              onClick={() => openEditProduct(product)}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-secondary-600 hover:text-secondary-800 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                            No products found. Click "Add Product" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'tests' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Lab <span className="text-orange-600">Tests</span>
                  </h2>
                  <button
                    onClick={openAddTest}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Lab Test
                  </button>
                </div>
                
                {/* Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search tests by machine name or test type..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Company and Machine Filter */}
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Filter by Company</label>
                    <select
                      value={filterCompany}
                      onChange={(e) => setFilterCompany(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                    >
                      <option value="all">All Companies</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>{customer.company_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2">Filter by Machine</label>
                    <select
                      value={filterMachine}
                      onChange={(e) => setFilterMachine(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                    >
                      <option value="all">All Machines</option>
                      {machines
                        .filter(machine => filterCompany === 'all' || machine.customer_id === filterCompany)
                        .map(machine => (
                        <option key={machine.id} value={machine.id}>{machine.machine_name} - {machine.customer?.company_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date Filter */}
                <div className="mb-4 bg-white rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setDateFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'all'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Time
                      </button>
                      <button
                        onClick={() => setDateFilter('today')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'today'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setDateFilter('week')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'week'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        This Week
                      </button>
                      <button
                        onClick={() => setDateFilter('month')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'month'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        This Month
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">From:</label>
                        <input
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => {
                            setCustomDateFrom(e.target.value)
                            setDateFilter('all')
                          }}
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">To:</label>
                        <input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => {
                            setCustomDateTo(e.target.value)
                            setDateFilter('all')
                          }}
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
                  <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
                    <thead className="bg-orange-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Test Date</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Machine</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">PDF</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {recentTests.filter(test => {
                        const matchSearch = test.machine?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.test_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.product?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.machine?.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.machine?.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.machine?.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.machine?.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(test.viscosity_40c || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(test.viscosity_100c || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(test.water_content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          String(test.tan_value || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          test.test_date?.toLowerCase().includes(searchQuery.toLowerCase())
                        const matchDate = filterByDate(test.test_date)
                        const matchCompany = filterCompany === 'all' || String(test.machine?.customer_id) === filterCompany
                        const matchMachine = filterMachine === 'all' || String(test.machine_id) === filterMachine
                        return matchSearch && matchDate && matchCompany && matchMachine
                      }).map((test) => (
                        <tr key={test.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {formatDate(test.test_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {test.machine?.machine_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {test.machine?.customer?.company_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {test.product?.product_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {test.pdf_path ? (
                              <button
                                onClick={() => {
                                  // Generate public URL from Supabase Storage
                                  const pdfPath = test.pdf_path
                                  if (!pdfPath) return
                                  const { data } = supabase.storage.from('lab-reports').getPublicUrl(pdfPath)
                                  if (data?.publicUrl) {
                                    setCurrentPdfUrl(data.publicUrl)
                                    setPdfViewerOpen(true)
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View PDF
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                            <button
                              onClick={() => openEditTest(test)}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTest(test.id)}
                              className="text-secondary-600 hover:text-secondary-800 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {recentTests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            No lab tests found. Click "Add Lab Test" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Alert <span className="text-red-600">Queue</span>
                  </h2>
                  <button
                    onClick={loadAlertQueue}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Alerts
                  </button>
                </div>

                <div className="mb-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <select
                    value={alertSeverityFilter}
                    onChange={(e) => setAlertSeverityFilter(e.target.value as 'all' | 'critical' | 'warning')}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                  >
                    <option value="all">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                  </select>

                  <select
                    value={alertStatusFilter}
                    onChange={(e) => setAlertStatusFilter(e.target.value as 'all' | 'open' | 'reviewed' | 'emailed')}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="emailed">Emailed</option>
                  </select>

                  <select
                    value={alertCustomerFilter}
                    onChange={(e) => setAlertCustomerFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                  >
                    <option value="all">All Customers</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.company_name}</option>
                    ))}
                  </select>

                  <select
                    value={emailLanguage}
                    onChange={(e) => setEmailLanguage(e.target.value as 'id' | 'en')}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                  >
                    <option value="id">Email Template: Bahasa Indonesia</option>
                    <option value="en">Email Template: English</option>
                  </select>

                  <button
                    onClick={() => {
                      setAlertSeverityFilter('all')
                      setAlertStatusFilter('all')
                      setAlertCustomerFilter('all')
                    }}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Reset Filters
                  </button>
                </div>

                <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  In-app alert only. Admin can review and send manual email notification when needed.
                </div>

                <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
                  <table className="w-full min-w-[1080px] divide-y-2 divide-primary-200">
                    <thead className="bg-orange-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Severity</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Machine</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Summary</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Next Action</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {filteredAlertQueue.map((alertItem) => (
                        <tr key={alertItem.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${
                              alertItem.severity === 'critical'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            }`}>
                              {alertItem.severity.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                            <div>{alertItem.customerName}</div>
                            <div className="text-xs text-gray-500">{alertItem.customerEmail || '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-800 font-bold">{alertItem.machineName}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{alertItem.message}</td>
                          <td className="px-6 py-4 text-sm text-gray-700">{alertItem.recommendedAction}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-2">
                            <button
                              onClick={() => markAlertReviewed(alertItem.id)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                reviewedAlertIds.includes(alertItem.id)
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                              }`}
                            >
                              {reviewedAlertIds.includes(alertItem.id) ? 'Reviewed' : 'Mark Reviewed'}
                            </button>
                            <button
                              onClick={() => sendManualEmail(alertItem)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                emailedAlertIds.includes(alertItem.id)
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              {emailedAlertIds.includes(alertItem.id) ? 'Email Sent' : 'Send Email Manual'}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredAlertQueue.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No alerts match current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'purchases' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Purchase <span className="text-red-600">History</span>
                  </h2>
                  <button
                    onClick={openAddPurchase}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Purchase
                  </button>
                </div>
                
                {/* Search Box */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search purchases by customer or product..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Date Filter */}
                <div className="mb-4 bg-white rounded-xl p-4 border-2 border-gray-200">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setDateFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'all'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        All Time
                      </button>
                      <button
                        onClick={() => setDateFilter('today')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'today'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setDateFilter('week')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'week'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        This Week
                      </button>
                      <button
                        onClick={() => setDateFilter('month')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          dateFilter === 'month'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        This Month
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">From:</label>
                        <input
                          type="date"
                          value={customDateFrom}
                          onChange={(e) => {
                            setCustomDateFrom(e.target.value)
                            setDateFilter('all')
                          }}
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-600">To:</label>
                        <input
                          type="date"
                          value={customDateTo}
                          onChange={(e) => {
                            setCustomDateTo(e.target.value)
                            setDateFilter('all')
                          }}
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
                  <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
                    <thead className="bg-orange-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {purchases.filter(purchase => {
                        const matchSearch = purchase.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          purchase.product?.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
                        const matchDate = filterByDate(purchase.purchase_date)
                        return matchSearch && matchDate
                      }).map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {formatDate(purchase.purchase_date)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {purchase.customer?.company_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900">
                            {purchase.product?.product_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            {purchase.quantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                            Rp {purchase.unit_price?.toLocaleString('id-ID') || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            Rp {(purchase.total_price ?? ((purchase.quantity || 0) * (purchase.unit_price || 0)))?.toLocaleString('id-ID') || '0'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                              purchase.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : purchase.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {purchase.status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                            <button
                              onClick={() => openEditPurchase(purchase)}
                              className="text-primary-600 hover:text-primary-800 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePurchase(purchase.id)}
                              className="text-secondary-600 hover:text-secondary-800 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {purchases.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                            No purchase history found. Click "Add Purchase" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h2 className="text-2xl sm:text-4xl font-black text-gray-900 flex items-center">
                    <svg className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    All <span className="text-red-600">Users</span> <span className="text-xl text-gray-500 font-medium">({users.length})</span>
                  </h2>
                  <button
                    onClick={openAddUser}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add User
                  </button>
                </div>
                
                {/* Search Box */}
                {users.length > 0 && (
                  <div className="mb-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search users by name or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 font-medium"
                      />
                      <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                )}

                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No users found. Click "🔄 Reload" or "+ Add User" to create one.
                  </div>
                )}
                {users.length > 0 && (
                  <div className="w-full overflow-auto rounded-xl border-2 border-primary-100 max-h-[62vh]">
                    <table className="w-full min-w-[980px] divide-y-2 divide-primary-200">
                    <thead className="bg-orange-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-primary-900 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-primary-900 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {users.filter(user => 
                        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.customer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((user) => (
                        <tr key={user.id} className="hover:bg-primary-50/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{user.full_name || 'No name'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{user.email || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{user.phone_number || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border-2 ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                              user.role === 'sales' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              'bg-green-100 text-green-800 border-green-300'
                            }`}>
                              {user.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                            {user.customer?.company_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-2">
                            <button
                              onClick={() => openEditUser(user)}
                              className="text-primary-600 hover:text-primary-900 font-bold px-3 py-1 rounded hover:bg-primary-50 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-secondary-600 hover:text-secondary-900 font-bold px-3 py-1 rounded hover:bg-secondary-50 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals - Continued in next section due to length */}
      {(modalOpen === 'add-customer' || modalOpen === 'edit-customer') && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border-2 border-primary-200 overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-xl font-black text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {modalOpen === 'add-customer' ? 'Add New Customer' : 'Edit Customer'}
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.company_name || ''}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium transition-all"
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-medium transition-all"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveCustomer}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-bold shadow-lg transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <OilDropLoader compact label="Saving..." className="text-white" />
                  ) : (
                    <><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Save</>
                  )}
                </button>
                <button
                  onClick={() => setModalOpen(null)}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logo Upload Modal */}
      {selectedCustomerForLogo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border-2 border-primary-200 overflow-hidden">
            <div className="bg-orange-600 px-6 py-4">
              <h3 className="text-xl font-black text-white flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Company Logo
              </h3>
              <p className="text-blue-100 text-sm mt-1">{selectedCustomerForLogo.company_name}</p>
            </div>
            <div className="p-6">
              {/* Preview */}
              <div className="mb-6 flex justify-center">
                <div className="w-64 h-48 rounded-xl overflow-hidden bg-white border-4 border-gray-300 flex items-center justify-center p-6 shadow-lg">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={220}
                      height={150}
                      className="max-w-full max-h-full object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-red-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-black text-6xl">
                        {selectedCustomerForLogo.company_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* File Input */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Select Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Max 5MB • PNG, JPG, WebP • Auto-compressed to 400x400px
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleUploadLogo}
                  disabled={!logoFile || uploadingLogo}
                  className="flex-1 px-5 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg transition-all flex items-center justify-center"
                >
                  {uploadingLogo ? (
                    <OilDropLoader compact label="Uploading..." className="text-white" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload Logo
                    </>
                  )}
                </button>
                
                {selectedCustomerForLogo.logo_url && (
                  <button
                    onClick={handleDeleteLogo}
                    disabled={uploadingLogo}
                    className="px-5 py-3 bg-red-100 text-red-700 rounded-xl hover:bg-red-600 hover:text-white disabled:opacity-50 font-bold transition-all"
                    title="Delete Logo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={() => setModalOpen(null)}
                  disabled={uploadingLogo}
                  className="px-5 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(modalOpen === 'add-machine' || modalOpen === 'edit-machine') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modalOpen === 'add-machine' ? 'Add New Machine' : 'Edit Machine'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine Name</label>
                <input
                  type="text"
                  value={formData.machine_name || ''}
                  onChange={(e) => setFormData({...formData, machine_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select
                  value={formData.customer_id || ''}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveMachine}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setModalOpen(null)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(modalOpen === 'add-product' || modalOpen === 'edit-product') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modalOpen === 'add-product' ? 'Add New Product' : 'Edit Product'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.product_name || ''}
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mobil DTE 25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
                <input
                  type="text"
                  list="product-types-list"
                  value={formData.product_type || ''}
                  onChange={(e) => setFormData({...formData, product_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Hydraulic Oil, Engine Oil, Compressor Oil"
                />
                <datalist id="product-types-list">
                  {uniqueProductTypes.map(type => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Oil</label>
                <select
                  value={formData.base_oil || ''}
                  onChange={(e) => setFormData({...formData, base_oil: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Base Oil</option>
                  <option value="Mineral">Mineral</option>
                  <option value="Synthetic">Synthetic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Viscosity Grade</label>
                {!useCustomViscosity ? (
                  <select
                    value={formData.viscosity_grade || ''}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setUseCustomViscosity(true)
                        setFormData({...formData, viscosity_grade: ''})
                      } else {
                        setFormData({...formData, viscosity_grade: e.target.value})
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Viscosity Grade</option>
                    <optgroup label="ISO VG (Industrial)">
                      <option value="ISO VG 10">ISO VG 10</option>
                      <option value="ISO VG 15">ISO VG 15</option>
                      <option value="ISO VG 22">ISO VG 22</option>
                      <option value="ISO VG 32">ISO VG 32</option>
                      <option value="ISO VG 46">ISO VG 46</option>
                      <option value="ISO VG 68">ISO VG 68</option>
                      <option value="ISO VG 100">ISO VG 100</option>
                      <option value="ISO VG 150">ISO VG 150</option>
                      <option value="ISO VG 220">ISO VG 220</option>
                      <option value="ISO VG 320">ISO VG 320</option>
                      <option value="ISO VG 460">ISO VG 460</option>
                      <option value="ISO VG 680">ISO VG 680</option>
                      <option value="ISO VG 1000">ISO VG 1000</option>
                      <option value="ISO VG 1500">ISO VG 1500</option>
                    </optgroup>
                    <optgroup label="SAE (Engine)">
                      <option value="SAE 0W-20">SAE 0W-20</option>
                      <option value="SAE 5W-20">SAE 5W-20</option>
                      <option value="SAE 5W-30">SAE 5W-30</option>
                      <option value="SAE 10W-30">SAE 10W-30</option>
                      <option value="SAE 10W-40">SAE 10W-40</option>
                      <option value="SAE 15W-40">SAE 15W-40</option>
                      <option value="SAE 20W-50">SAE 20W-50</option>
                      <option value="SAE 10">SAE 10</option>
                      <option value="SAE 20">SAE 20</option>
                      <option value="SAE 30">SAE 30</option>
                      <option value="SAE 40">SAE 40</option>
                      <option value="SAE 50">SAE 50</option>
                    </optgroup>
                    <optgroup label="NLGI (Grease)">
                      <option value="NLGI 000">NLGI 000</option>
                      <option value="NLGI 00">NLGI 00</option>
                      <option value="NLGI 0">NLGI 0</option>
                      <option value="NLGI 1">NLGI 1</option>
                      <option value="NLGI 2">NLGI 2</option>
                      <option value="NLGI 3">NLGI 3</option>
                      <option value="NLGI 4">NLGI 4</option>
                      <option value="NLGI 5">NLGI 5</option>
                      <option value="NLGI 6">NLGI 6</option>
                    </optgroup>
                    <option value="OTHER">🔧 Other (Type Manually)</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.viscosity_grade || ''}
                      onChange={(e) => setFormData({...formData, viscosity_grade: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Custom HD 50"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomViscosity(false)
                        setFormData({...formData, viscosity_grade: ''})
                      }}
                      className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveProduct}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setModalOpen(null)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(modalOpen === 'add-purchase' || modalOpen === 'edit-purchase') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {modalOpen === 'add-purchase' ? 'Add New Purchase' : 'Edit Purchase'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select
                  value={formData.customer_id || ''}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select
                  value={formData.product_id || ''}
                  onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.product_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={String(formData.purchase_date ?? '')}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  step="1"
                  value={formData.quantity || ''}
                  onChange={(e) => {
                    const qty = parseFloat(e.target.value) || 0
                    const price = parseFloat(String(formData.unit_price ?? '')) || 0
                    setFormData({
                      ...formData, 
                      quantity: e.target.value,
                      total_price: (qty * price).toFixed(2)
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (Rp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.unit_price || ''}
                  onChange={(e) => {
                    const qty = parseFloat(String(formData.quantity ?? '')) || 0
                    const price = parseFloat(e.target.value) || 0
                    setFormData({
                      ...formData, 
                      unit_price: e.target.value,
                      total_price: (qty * price).toFixed(2)
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 250000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Price (Rp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.total_price || ''}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status || 'completed'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSavePurchase}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setModalOpen(null)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(modalOpen === 'add-test' || modalOpen === 'edit-test') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {modalOpen === 'add-test' ? 'Add New Lab Test' : 'Edit Lab Test'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
                <div className="flex gap-2">
                  <select
                    value={formData.machine_id || ''}
                    onChange={(e) => setFormData({...formData, machine_id: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.machine_name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openQuickAddMachine}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1 whitespace-nowrap"
                    title="Quick Add Machine"
                  >
                    <span className="text-lg">+</span>
                    <span className="text-sm">Add</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <div className="flex gap-2">
                  <select
                    value={formData.product_id || ''}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openQuickAddProduct}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1 whitespace-nowrap"
                    title="Quick Add Product"
                  >
                    <span className="text-lg">+</span>
                    <span className="text-sm">Add</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Date</label>
                <input
                  type="date"
                  value={formData.test_date || ''}
                  onChange={(e) => setFormData({...formData, test_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Viscosity (cSt @40°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.viscosity_40c || ''}
                  onChange={(e) => setFormData({...formData, viscosity_40c: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 46.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Viscosity (cSt @100°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.viscosity_100c || ''}
                  onChange={(e) => setFormData({...formData, viscosity_100c: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 6.8"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Water Content</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="1"
                    value={formData.water_content || ''}
                    onChange={(e) => setFormData({...formData, water_content: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 198"
                  />
                  <select
                    value={formData.water_content_unit || 'PPM'}
                    onChange={(e) => setFormData({...formData, water_content_unit: e.target.value as 'PPM' | 'PERCENT'})}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="PPM">PPM</option>
                    <option value="PERCENT">%</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.water_content_unit === 'PPM' 
                    ? `${formData.water_content || 0} PPM = ${((parseFloat(String(formData.water_content ?? '0')) / 10000) || 0).toFixed(4)}%`
                    : `${formData.water_content || 0}%`
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TAN Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tan_value || ''}
                  onChange={(e) => setFormData({...formData, tan_value: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lab Report PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setFormData({...formData, pdfFile: file})
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {formData.pdf_path && (
                  <p className="text-sm text-gray-500 mt-1">
                    Current: {formData.pdf_path.split('/').pop()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveTest}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  clearLabTestDraft()
                  setModalOpen(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {(modalOpen === 'add-user' || modalOpen === 'edit-user') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {modalOpen === 'add-user' ? 'Add New User' : 'Edit User'}
            </h3>
            <div className="space-y-4">
              {modalOpen === 'add-user' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={String(formData.full_name ?? '')}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.contact_email || ''}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+62 812-3456-7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role || 'customer'}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="customer">Customer</option>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formData.role === 'customer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    value={formData.customer_id || ''}
                    onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveUser}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setModalOpen(null)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t-2 border-gray-200 sticky bottom-0 z-40" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            {/* Left: Copyright */}
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <svg className="w-3.5 h-3.5 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">© 2026 <span className="font-bold text-gray-800">PT Nabel Sakha Gemilang</span></span>
            </div>
            
            {/* Right: TotalEnergies Logo with Label */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Authorized Distributor</span>
              <Image
                src="/logos/total-energies.png"
                alt="TotalEnergies"
                width={120}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </footer>

      {/* Import CSV Modal */}
      {modalOpen === 'import-customers' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b-2 border-primary-100">
              <h2 className="text-2xl font-black text-gray-900">Import Customers from CSV</h2>
              <p className="text-sm text-gray-600 mt-1">Upload a CSV file with company names (one per line or comma-separated)</p>
            </div>
            <div className="p-6">
              {!importResult ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">CSV File Format</label>
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-xs font-mono">
                      <div className="font-bold text-gray-800 mb-2">Option 1 - One company per line:</div>
                      <div className="text-gray-600">PT Example Corp</div>
                      <div className="text-gray-600">PT Another Company</div>
                      <div className="text-gray-600">CV Multi Jaya</div>
                      <div className="font-bold text-gray-800 mt-3 mb-2">Option 2 - Comma separated with header:</div>
                      <div className="text-gray-600">company_name</div>
                      <div className="text-gray-600">PT Example Corp</div>
                      <div className="text-gray-600">PT Another Company</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          // Parse CSV
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const text = event.target?.result as string
                            const lines = text.split('\n').filter(line => line.trim())
                            if (lines.length === 0) return
                            
                            // Skip header if it's exactly "company_name"
                            const startIdx = lines[0].toLowerCase().trim() === 'company_name' ? 1 : 0
                            
                            const data = lines.slice(startIdx).map(line => {
                              // Handle both comma-separated and single value per line
                              const companyName = line.split(',')[0].trim()
                              return {
                                company_name: companyName,
                                status: 'active'
                              }
                            }).filter(row => row.company_name) // Remove empty rows
                            setCsvData(data)
                          }
                          reader.readAsText(file)
                        }
                      }}
                      className="block w-full text-sm text-gray-900 border-2 border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none hover:bg-gray-100 p-3"
                    />
                  </div>

                  {csvData.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Preview ({csvData.length} customers)</label>
                      <div className="overflow-x-auto border-2 border-gray-200 rounded-lg max-h-60">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">#</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Company Name</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-xs text-gray-500">{idx + 1}</td>
                                <td className="px-3 py-2 text-xs text-gray-900 font-medium">{row.company_name}</td>
                                <td className="px-3 py-2 text-xs text-green-600 font-semibold">{row.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setModalOpen(null)
                        setCsvData([])
                        setImportResult(null)
                      }}
                      className="px-6 py-3 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 font-bold transition-colors"
                      disabled={importLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (csvData.length === 0) return
                        setImportLoading(true)
                        
                        const results = { success: 0, failed: 0, errors: [] as string[] }
                        
                        for (const row of csvData) {
                          if (!row.company_name) {
                            results.failed++
                            results.errors.push(`Row missing company_name`)
                            continue
                          }
                          
                          const { error } = await supabase
                            .from('oil_customers')
                            .insert([row])
                          
                          if (error) {
                            results.failed++
                            results.errors.push(`${row.company_name}: ${error.message}`)
                          } else {
                            results.success++
                          }
                        }
                        
                        setImportResult(results)
                        setImportLoading(false)
                        if (results.success > 0) loadCustomers()
                      }}
                      disabled={csvData.length === 0 || importLoading}
                      className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {importLoading ? 'Importing...' : `Import ${csvData.length} Customers`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className={`p-4 rounded-lg ${importResult.failed === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
                      <h3 className="font-bold text-lg mb-2">Import Complete</h3>
                      <p className="text-sm mb-2">
                        <span className="font-bold text-green-600">{importResult.success} customers</span> imported successfully
                      </p>
                      {importResult.failed > 0 && (
                        <>
                          <p className="text-sm mb-2">
                            <span className="font-bold text-red-600">{importResult.failed} customers</span> failed to import
                          </p>
                          <div className="mt-3 max-h-40 overflow-y-auto bg-white p-3 rounded border">
                            <p className="text-xs font-bold text-red-600 mb-2">Errors:</p>
                            {importResult.errors.map((err, idx) => (
                              <p key={idx} className="text-xs text-gray-700 mb-1">• {err}</p>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setModalOpen(null)
                        setCsvData([])
                        setImportResult(null)
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition-all"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Products CSV Modal */}
      {modalOpen === 'import-products' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b-2 border-primary-100">
              <h2 className="text-2xl font-black text-gray-900">Import Products from CSV</h2>
              <p className="text-sm text-gray-600 mt-1">Upload CSV with columns: product_name, product_type, base_oil, viscosity_grade</p>
            </div>
            <div className="p-6">
              {!importResult ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">CSV File Format</label>
                    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 text-xs font-mono">
                      <div className="font-bold text-gray-800 mb-2">Required format with header:</div>
                      <div className="text-gray-600">product_name,product_type,base_oil,viscosity_grade</div>
                      <div className="font-bold text-gray-800 mt-3 mb-2">Example data:</div>
                      <div className="text-gray-600">Mobil DTE 25,Industrial Oil,Mineral,ISO VG 46</div>
                      <div className="text-gray-600">Shell Tellus S2 M 46,Hydraulic Oil,Mineral,ISO VG 46</div>
                      <div className="text-gray-600">Castrol Hyspin AWH-M 68,Hydraulic Oil,Mineral,ISO VG 68</div>
                      <div className="text-yellow-700 mt-3 font-bold">Note: product_name and product_type are required</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select CSV File</label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const text = event.target?.result as string
                            const lines = text.split('\n').filter(line => line.trim())
                            if (lines.length < 2) return
                            
                            // Skip header row
                            const startIdx = lines[0].toLowerCase().includes('product_name') ? 1 : 0
                            
                            const data = lines.slice(startIdx).map(line => {
                              const values = line.split(',').map(v => v.trim())
                              return {
                                product_name: values[0] || '',
                                product_type: values[1] || '',
                                base_oil: values[2] || null,
                                viscosity_grade: values[3] || null
                              }
                            }).filter(row => row.product_name && row.product_type)
                            setCsvData(data)
                          }
                          reader.readAsText(file)
                        }
                      }}
                      className="block w-full text-sm text-gray-900 border-2 border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none hover:bg-gray-100 p-3"
                    />
                  </div>

                  {csvData.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Preview ({csvData.length} products)</label>
                      <div className="overflow-x-auto border-2 border-gray-200 rounded-lg max-h-60">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">#</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Product Name</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Product Type</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Base Oil</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-700">Viscosity Grade</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {csvData.map((row, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 text-xs text-gray-500">{idx + 1}</td>
                                <td className="px-3 py-2 text-xs text-gray-900 font-medium">{row.product_name}</td>
                                <td className="px-3 py-2 text-xs text-primary-600 font-semibold">{row.product_type}</td>
                                <td className="px-3 py-2 text-xs text-gray-600">{row.base_oil || '-'}</td>
                                <td className="px-3 py-2 text-xs text-gray-600">{row.viscosity_grade || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setModalOpen(null)
                        setCsvData([])
                        setImportResult(null)
                      }}
                      className="px-6 py-3 text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300 font-bold transition-colors"
                      disabled={importLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (csvData.length === 0) return
                        setImportLoading(true)
                        
                        const results = { success: 0, failed: 0, errors: [] as string[] }
                        
                        for (const row of csvData) {
                          if (!row.product_name || !row.product_type) {
                            results.failed++
                            results.errors.push(`Row missing required fields (product_name or product_type)`)
                            continue
                          }
                          
                          const { error } = await supabase
                            .from('oil_products')
                            .insert([row])
                          
                          if (error) {
                            results.failed++
                            results.errors.push(`${row.product_name}: ${error.message}`)
                          } else {
                            results.success++
                          }
                        }
                        
                        setImportResult(results)
                        setImportLoading(false)
                        if (results.success > 0) {
                          const { data: productsData } = await supabase
                            .from('oil_products')
                            .select('*')
                            .order('id')
                          setProducts(productsData || [])
                        }
                      }}
                      disabled={csvData.length === 0 || importLoading}
                      className="px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {importLoading ? 'Importing...' : `Import ${csvData.length} Products`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className={`p-4 rounded-lg ${importResult.failed === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-yellow-50 border-2 border-yellow-200'}`}>
                      <h3 className="font-bold text-lg mb-2">Import Complete</h3>
                      <p className="text-sm mb-2">
                        <span className="font-bold text-green-600">{importResult.success} products</span> imported successfully
                      </p>
                      {importResult.failed > 0 && (
                        <>
                          <p className="text-sm mb-2">
                            <span className="font-bold text-red-600">{importResult.failed} products</span> failed to import
                          </p>
                          <div className="mt-3 max-h-40 overflow-y-auto bg-white p-3 rounded border">
                            <p className="text-xs font-bold text-red-600 mb-2">Errors:</p>
                            {importResult.errors.map((err, idx) => (
                              <p key={idx} className="text-xs text-gray-700 mb-1">• {err}</p>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setModalOpen(null)
                        setCsvData([])
                        setImportResult(null)
                      }}
                      className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold transition-all"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Machine Modal */}
      {quickAddModal === 'machine' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Quick Add Machine</h3>
                  <p className="text-sm text-gray-500 mt-1">Add new machine without leaving form</p>
                </div>
                <button
                  onClick={cancelQuickAddMachine}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Machine Name *</label>
                  <input
                    type="text"
                    value={quickAddData.machine_name || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, machine_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Compressor BCU 12"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                  <select
                    value={quickAddData.customer_id || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, customer_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={quickAddData.serial_number || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, serial_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., SN123456"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={quickAddData.model || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Atlas Copco GA 200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={quickAddData.location || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Plant B"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={quickAddData.status || 'active'}
                    onChange={(e) => setQuickAddData({...quickAddData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelQuickAddMachine}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickSaveMachine}
                  disabled={loading || !quickAddData.machine_name || !quickAddData.customer_id}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-bold transition-colors"
                >
                  {loading ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {quickAddModal === 'product' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Quick Add Product</h3>
                  <p className="text-sm text-gray-500 mt-1">Add new product without leaving form</p>
                </div>
                <button
                  onClick={cancelQuickAddProduct}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={quickAddData.product_name || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, product_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Azolla ZS 46"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
                  <input
                    type="text"
                    list="quick-product-types-list"
                    value={quickAddData.product_type || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, product_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Hydraulic Oil, Engine Oil, Compressor Oil"
                  />
                  <datalist id="quick-product-types-list">
                    {uniqueProductTypes.map(type => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Oil</label>
                  <select
                    value={quickAddData.base_oil || ''}
                    onChange={(e) => setQuickAddData({...quickAddData, base_oil: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select Base Oil</option>
                    <option value="Mineral">Mineral</option>
                    <option value="Synthetic">Synthetic</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Viscosity Grade</label>
                  {!useCustomViscosityQuick ? (
                    <select
                      value={quickAddData.viscosity_grade || ''}
                      onChange={(e) => {
                        if (e.target.value === 'OTHER') {
                          setUseCustomViscosityQuick(true)
                          setQuickAddData({...quickAddData, viscosity_grade: ''})
                        } else {
                          setQuickAddData({...quickAddData, viscosity_grade: e.target.value})
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select Viscosity Grade</option>
                      <optgroup label="ISO VG (Industrial)">
                        <option value="ISO VG 10">ISO VG 10</option>
                        <option value="ISO VG 15">ISO VG 15</option>
                        <option value="ISO VG 22">ISO VG 22</option>
                        <option value="ISO VG 32">ISO VG 32</option>
                        <option value="ISO VG 46">ISO VG 46</option>
                        <option value="ISO VG 68">ISO VG 68</option>
                        <option value="ISO VG 100">ISO VG 100</option>
                        <option value="ISO VG 150">ISO VG 150</option>
                        <option value="ISO VG 220">ISO VG 220</option>
                        <option value="ISO VG 320">ISO VG 320</option>
                        <option value="ISO VG 460">ISO VG 460</option>
                        <option value="ISO VG 680">ISO VG 680</option>
                        <option value="ISO VG 1000">ISO VG 1000</option>
                        <option value="ISO VG 1500">ISO VG 1500</option>
                      </optgroup>
                      <optgroup label="SAE (Engine)">
                        <option value="SAE 0W-20">SAE 0W-20</option>
                        <option value="SAE 5W-20">SAE 5W-20</option>
                        <option value="SAE 5W-30">SAE 5W-30</option>
                        <option value="SAE 10W-30">SAE 10W-30</option>
                        <option value="SAE 10W-40">SAE 10W-40</option>
                        <option value="SAE 15W-40">SAE 15W-40</option>
                        <option value="SAE 20W-50">SAE 20W-50</option>
                        <option value="SAE 10">SAE 10</option>
                        <option value="SAE 20">SAE 20</option>
                        <option value="SAE 30">SAE 30</option>
                        <option value="SAE 40">SAE 40</option>
                        <option value="SAE 50">SAE 50</option>
                      </optgroup>
                      <optgroup label="NLGI (Grease)">
                        <option value="NLGI 000">NLGI 000 (Semi-fluid)</option>
                        <option value="NLGI 00">NLGI 00 (Very Soft)</option>
                        <option value="NLGI 0">NLGI 0 (Soft)</option>
                        <option value="NLGI 1">NLGI 1 (Soft - Low Temp)</option>
                        <option value="NLGI 2">NLGI 2 (Medium - Most Common)</option>
                        <option value="NLGI 3">NLGI 3 (Firm)</option>
                        <option value="NLGI 4">NLGI 4 (Hard)</option>
                        <option value="NLGI 5">NLGI 5 (Very Hard)</option>
                        <option value="NLGI 6">NLGI 6 (Block)</option>
                      </optgroup>
                      <option value="OTHER">🔧 Other (Type Manually)</option>
                    </select>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickAddData.viscosity_grade || ''}
                        onChange={(e) => setQuickAddData({...quickAddData, viscosity_grade: e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="e.g., Custom HD 50"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomViscosityQuick(false)
                          setQuickAddData({...quickAddData, viscosity_grade: ''})
                        }}
                        className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        Back
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelQuickAddProduct}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickSaveProduct}
                  disabled={loading || !quickAddData.product_name || !quickAddData.product_type}
                  className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg font-bold transition-colors"
                >
                  {loading ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && currentPdfUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPdfViewerOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">PDF Viewer</h2>
                  <p className="text-xs text-gray-500">Lab Test Report</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={currentPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in New Tab
                </a>
                <button
                  onClick={() => setPdfViewerOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* PDF Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={currentPdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
