'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import imageCompression from 'browser-image-compression'
import OilDropLoader from '@/app/components/OilDropLoader'
import Image from 'next/image'
import type { AdminProfile, Customer, AdminMachine, AdminLabTest, AdminUser, AdminProduct, UserRole, LabRequest } from '@/lib/types'
import { useTabAutoLogout, signOutIfTabWasClosed } from '@/lib/hooks/useTabAutoLogout'
import toast from 'react-hot-toast'

import { createCustomer, updateCustomer, deleteCustomer, createMachine, updateMachine, deleteMachine, createUser, updateUser, deleteUser, createProduct, updateProduct, deleteProduct, createTest, updateTest, deleteTest, uploadAdminFile, getEmailLogs } from '@/app/actions/adminActions'

// Modular components
import AdminOverviewTab from './components/AdminOverviewTab'
import AdminCustomersTab from './components/AdminCustomersTab'
import AdminMachinesTab from './components/AdminMachinesTab'
import AdminProductsTab from './components/AdminProductsTab'
import AdminTestsTab from './components/AdminTestsTab'
import AdminUsersTab from './components/AdminUsersTab'
import AdminRequestsTab from './components/AdminRequestsTab'
import AdminOrdersTab, { AdminOrder, AdminComplaint } from './components/AdminOrdersTab'
import AdminEmailLogsTab from './components/AdminEmailLogsTab'

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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as any).message)
  return 'Unknown error'
}

const alert = (message: string) => {
  const lower = message.toLowerCase()
  if (lower.includes('error') || lower.includes('failed') || lower.includes('gagal') || lower.includes('tidak boleh') || lower.includes('terlalu besar')) {
    toast.error(message)
  } else {
    toast.success(message)
  }
}

type FormValue = string | number | undefined | null
type FormDataState = Record<string, FormValue>

const toEnumValue = <T extends readonly string[]>(value: FormValue, validValues: T, fallback?: T[number]): T[number] | undefined => {
  if (typeof value === 'string' && validValues.includes(value as T[number])) {
    return value as T[number]
  }
  return fallback
}

const toOptionalString = (value?: FormValue): string | undefined => {
  if (typeof value !== 'string' || !value) return undefined
  return value.trim() || undefined
}

const toOptionalNumber = (value?: FormValue): number | undefined => {
  if (typeof value === 'string') {
    if (value === '') return undefined
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : undefined
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  return undefined
}

const toStringValue = (value?: FormValue, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const toInputValue = (value?: FormValue): string | number => {
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  return ''
}

const buildMachinePayload = (data: FormDataState) => ({
  machine_name: toStringValue(data.machine_name),
  customer_id: toOptionalString(data.customer_id),
  serial_number: toOptionalString(data.serial_number),
  model: toOptionalString(data.model),
  location: toOptionalString(data.location),
  status: toStringValue(data.status, 'active'),
})

const buildProductPayload = (data: FormDataState) => ({
  product_name: toStringValue(data.product_name),
  product_type: toStringValue(data.product_type),
  base_oil: toOptionalString(data.base_oil),
  viscosity_grade: toOptionalString(data.viscosity_grade),
  baseline_viscosity_40c: toOptionalNumber(data.baseline_viscosity_40c),
  baseline_viscosity_100c: toOptionalNumber(data.baseline_viscosity_100c),
  baseline_tan: toOptionalNumber(data.baseline_tan),
  oil_grade: toOptionalString(data.oil_grade),
})

const buildTestPayload = (data: FormDataState) => ({
  machine_id: toOptionalString(data.machine_id),
  product_id: toOptionalString(data.product_id),
  test_date: toStringValue(data.test_date),
  viscosity_40c: toOptionalNumber(data.viscosity_40c),
  viscosity_100c: toOptionalNumber(data.viscosity_100c),
  water_content: toOptionalNumber(data.water_content),
  water_content_unit: toEnumValue(data.water_content_unit, ['PPM', 'PERCENT'] as const),
  tan_value: toOptionalNumber(data.tan_value),
  notes: toOptionalString(data.notes),
  pdf_path: toOptionalString(data.pdf_path),
})

const buildCreateUserPayload = (data: FormDataState) => ({
  email: toStringValue(data.email).trim(),
  password: toStringValue(data.password),
  full_name: toStringValue(data.full_name).trim(),
  phone_number: toOptionalString(data.phone_number),
  role: toStringValue(data.role, 'customer'),
  customer_id: toOptionalString(data.customer_id),
  contact_email: toOptionalString(data.contact_email),
})

const buildUpdateUserPayload = (data: FormDataState) => ({
  full_name: toOptionalString(data.full_name),
  phone_number: toOptionalString(data.phone_number),
  role: toStringValue(data.role),
  customer_id: toOptionalString(data.customer_id),
  contact_email: toOptionalString(data.contact_email),
})

const filterByDate = (testDate: string | null | undefined, dateFilter: string = 'all', customFrom?: string, customTo?: string): boolean => {
  if (!testDate || dateFilter === 'all') return true
  
  const date = new Date(testDate)
  const today = new Date()
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  if (dateFilter === 'today') {
    return date.toDateString() === today.toDateString()
  } else if (dateFilter === 'week') {
    return date >= oneWeekAgo && date <= today
  } else if (dateFilter === 'month') {
    return date >= oneMonthAgo && date <= today
  } else if (dateFilter === 'custom' && customFrom && customTo) {
    const from = new Date(customFrom)
    const to = new Date(customTo)
    return date >= from && date <= to
  }
  return true
}

export interface AdminClientProps {
  user: User
  profile: AdminProfile | null
  customers: Customer[]
  machines: AdminMachine[]
  recentTests: AdminLabTest[]
  initialProducts: AdminProduct[]
  initialUsers: AdminUser[]
  initialLabRequests: LabRequest[]
  initialOrders: AdminOrder[]
  initialComplaints: AdminComplaint[]
}

type ModalType =
  | 'add-customer'
  | 'edit-customer'
  | 'import-customers'
  | 'add-machine'
  | 'edit-machine'
  | 'add-test'
  | 'edit-test'
  | 'add-product'
  | 'edit-product'
  | 'import-products'
  | 'add-user'
  | 'edit-user'
  | 'upload-logo'
  | null

type SelectedItemType = Customer | AdminMachine | AdminLabTest | AdminProduct | AdminUser | null

type TabKey =
  | 'overview'
  | 'customers'
  | 'machines'
  | 'products'
  | 'tests'
  | 'users'
  | 'requests'
  | 'orders'
  | 'email_logs'

export default function AdminClient({
  user,
  profile,
  customers: initialCustomers,
  machines: initialMachines,
  recentTests: initialRecentTests,
  initialProducts,
  initialUsers,
  initialLabRequests,
  initialOrders,
  initialComplaints,
}: AdminClientProps) {
  const supabase = createClient()
  const router = useRouter()
  useTabAutoLogout()
  useEffect(() => { signOutIfTabWasClosed() }, [])

  // Set up real-time subscription for lab requests
  useEffect(() => {
    const channel = supabase
      .channel('admin-requests-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'oil_lab_requests'
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  // Synchronize products state when server components refresh
  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])
  
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  const customers = initialCustomers
  const machines = initialMachines
  const recentTests = initialRecentTests
  const labRequests = initialLabRequests

  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [modalOpen, setModalOpen] = useState<ModalType>(null)
  const [selectedItem, setSelectedItem] = useState<SelectedItemType>(null)
  const [formData, setFormData] = useState<FormDataState>({})
  const [quickAddData, setQuickAddData] = useState<FormDataState>({})
  const [quickAddModal, setQuickAddModal] = useState<'machine' | 'product' | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  
  const [filterCompany, setFilterCompany] = useState('all')
  const [filterMachine, setFilterMachine] = useState('all')
  const [csvData, setCsvData] = useState<Array<Record<string, string>>>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts)
  const [useCustomViscosity, setUseCustomViscosity] = useState(false)
  const [useCustomViscosityQuick, setUseCustomViscosityQuick] = useState(false)
  
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [emailLogs, setEmailLogs] = useState<any[]>([])
  const [emailLogsLoading, setEmailLogsLoading] = useState(false)

  const fetchEmailLogs = async () => {
    setEmailLogsLoading(true)
    try {
      const logs = await getEmailLogs()
      setEmailLogs(logs)
    } catch (e: any) {
      toast.error('Gagal memuat log email: ' + e.message)
    } finally {
      setEmailLogsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'email_logs') {
      fetchEmailLogs()
    }
  }, [activeTab])

  // --- Computed Variables ---
  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => c.status === 'active').length
  const totalMachines = machines.length
  const totalTests = recentTests.length
  const users = initialUsers

  const uniqueProductTypes = useMemo(() => {
    return Array.from(new Set(products.map(p => p.product_type))).filter(Boolean).sort()
  }, [products])

  const openAddCustomer = () => {
    setFormData({ company_name: '', status: 'active' })
    setModalOpen('add-customer')
  }

  const handleDeleteLogo = async () => {
    if (!selectedItem || !('company_name' in selectedItem)) return
    const selectedCustomer = selectedItem as Customer
    if (!selectedCustomer.logo_url) return
    if (!confirm('Are you sure you want to delete this logo?')) return
    
    setUploadingLogo(true)
    try {
      const oldPath = selectedCustomer.logo_url.split('/').slice(-2).join('/')
      await supabase.storage
        .from('customer-logos')
        .remove([oldPath])
      
      const { error } = await supabase
        .from('oil_customers')
        .update({ logo_url: null, logo_updated_at: new Date().toISOString() })
        .eq('id', selectedCustomer.id)
      
      if (error) throw error
      
      alert('Logo deleted successfully!')
      setModalOpen(null)
      router.refresh()
    } catch (error: unknown) {
      alert('Error deleting logo: ' + getErrorMessage(error))
    } finally {
      setUploadingLogo(false)
    }
  }

  // Customer CRUD
  const openEditCustomer = (customer: Customer) => {
    setSelectedItem(customer)
    setFormData({
      company_name: customer.company_name,
      status: customer.status
    })
    setModalOpen('edit-customer')
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return
    setLoading(true)
    try {
      await deleteCustomer(id)
      router.refresh()
    } catch (error) {
      alert('Error deleting customer: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCustomer = async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-customer') {
        await createCustomer({ 
          company_name: String(formData.company_name), 
          status: String(formData.status) 
        })
        alert('Customer added successfully!')
      } else if (modalOpen === 'edit-customer') {
        if (!selectedItem?.id) throw new Error('No customer selected')
        await updateCustomer(selectedItem.id, { 
          company_name: String(formData.company_name), 
          status: String(formData.status) 
        })
        alert('Customer updated successfully!')
      }
      setModalOpen(null)
      router.refresh()
    } catch (error) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const openLogoUpload = (customer: Customer) => {
    setSelectedItem(customer)
    setLogoFile(null)
    setLogoPreview(customer.logo_url || null)
    setModalOpen('upload-logo')
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadLogo = async () => {
    if (!logoFile || !selectedItem || !('company_name' in selectedItem)) return
    
    // Client-side validation: MIME type and file size (Saran D)
    if (!logoFile.type.startsWith('image/')) {
      alert('Hanya diperbolehkan mengunggah file gambar (JPEG/PNG/GIF/WEBP) untuk logo.')
      return
    }
    if (logoFile.size > 2 * 1024 * 1024) {
      alert('Ukuran file logo tidak boleh melebihi 2MB.')
      return
    }

    const customer = selectedItem as Customer
    setUploadingLogo(true)
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 400,
        useWebWorker: true
      }
      const compressedFile = await imageCompression(logoFile, options)
      
      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${customer.id}-${Date.now()}.${fileExt}`
      
      const formDataPayload = new FormData()
      formDataPayload.append('bucket', 'customer-logos')
      formDataPayload.append('path', fileName)
      formDataPayload.append('file', compressedFile)

      const uploadResult = await uploadAdminFile(formDataPayload)
      
      const { data: { publicUrl } } = supabase.storage
        .from('customer-logos')
        .getPublicUrl(uploadResult.path)
      
      const { error: updateError } = await supabase
        .from('oil_customers')
        .update({ 
          logo_url: publicUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', customer.id)
      
      if (updateError) throw updateError
      
      alert('Logo uploaded successfully!')
      setModalOpen(null)
      router.refresh()
    } catch (error) {
      alert('Error uploading logo: ' + getErrorMessage(error))
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
      status: machine.status,
      serial_number: machine.serial_number || '',
      model: machine.model || ''
    })
    setModalOpen('edit-machine')
  }

  const handleSaveMachine = async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-machine') {
        await createMachine(buildMachinePayload(formData))
        alert('Machine added successfully!')
      } else if (modalOpen === 'edit-machine') {
        if (!selectedItem?.id) throw new Error('No machine selected')
        await updateMachine(selectedItem.id, buildMachinePayload(formData))
        alert('Machine updated successfully!')
      }
      setModalOpen(null)
      router.refresh()
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMachine = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) return
    setLoading(true)
    try {
      await deleteMachine(id)
      router.refresh()
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  // Quick Add Machine (from Lab Test modal)
  const openQuickAddMachine = () => {
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
      const { error } = await supabase
        .from('oil_machines')
        .insert([quickAddData])
        .select()
        .single()
      
      if (error) throw error
      
      router.refresh()
      alert('Machine added successfully!')
      setQuickAddModal(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const cancelQuickAddMachine = () => {
    setQuickAddModal(null)
  }

  // Quick Add Product (from Lab Test modal)
  const openQuickAddProduct = () => {
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
      const { error } = await supabase
        .from('oil_products')
        .insert([quickAddData])
        .select()
        .single()
      
      if (error) throw error
      
      router.refresh()
      alert('Product added successfully!')
      setQuickAddModal(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const cancelQuickAddProduct = () => {
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
        await createProduct(buildProductPayload(formData))
        alert('Product added successfully!')
      } else if (modalOpen === 'edit-product') {
        if (!selectedItem?.id) throw new Error('No product selected')
        await updateProduct(selectedItem.id, buildProductPayload(formData))
        alert('Product updated successfully!')
      }
      setModalOpen(null)
      router.refresh()
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    setLoading(true)
    try {
      await deleteProduct(id)
      router.refresh()
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  // Lab Test CRUD
  const openAddTest = async () => {
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
      tan_value: '',
      pdf_path: ''
    })
    setPdfFile(null)
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
      tan_value: test.tan_value,
      pdf_path: test.pdf_path || ''
    })
    setPdfFile(null)
    setModalOpen('edit-test')
  }

  const handleSaveTest = async () => {
    setLoading(true)
    try {
      let currentPdfPath = formData.pdf_path

      if (pdfFile) {
        // Client-side validation: type must be PDF and size <= 10MB (Saran D)
        if (pdfFile.type !== 'application/pdf') {
          alert('Hanya diperbolehkan mengunggah file PDF untuk Laporan Lab.')
          setLoading(false)
          return
        }
        if (pdfFile.size > 10 * 1024 * 1024) {
          alert('Ukuran file PDF Laporan Lab tidak boleh melebihi 10MB.')
          setLoading(false)
          return
        }

        const fileExt = pdfFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        
        const uploadData = new FormData()
        uploadData.append('bucket', 'lab-reports')
        uploadData.append('path', fileName)
        uploadData.append('file', pdfFile)
        
        const uploadResult = await uploadAdminFile(uploadData)
        currentPdfPath = uploadResult.path
      }

      const payload = buildTestPayload({ ...formData, pdf_path: currentPdfPath })

      if (modalOpen === 'add-test') {
        await createTest(payload)
        alert('Lab test recorded successfully!')
      } else if (modalOpen === 'edit-test') {
        if (!selectedItem?.id) throw new Error('No test selected')
        await updateTest(selectedItem.id, payload)
        alert('Lab test updated successfully!')
      }
      setPdfFile(null)
      setModalOpen(null)
      router.refresh()
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTest = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return
    setLoading(true)
    try {
      await deleteTest(id)
      router.refresh()
    } catch (error) {
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
      customer_id: user.customer_id,
      contact_email: user.email,
      phone_number: user.phone_number
    })
    setModalOpen('edit-user')
  }

  const handleSaveUser = async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-user') {
        await createUser(buildCreateUserPayload(formData) as any)
        alert('User created successfully!')
      } else if (modalOpen === 'edit-user') {
        if (!selectedItem?.id) throw new Error('No user selected')
        await updateUser(selectedItem.id, buildUpdateUserPayload(formData) as any)
        alert('User updated successfully!')
      }
      setModalOpen(null)
      router.refresh()
    } catch (error) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    setLoading(true)
    try {
      await deleteUser(id)
      router.refresh()
    } catch (error) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const selectedCustomerForLogo =
    modalOpen === 'upload-logo' && selectedItem && 'company_name' in selectedItem
      ? (selectedItem as Customer)
      : null

  return (
    <div className="clean-ui customer-panel min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 bg-grid-pattern flex flex-col relative" style={{ backgroundSize: '40px 40px' }}>
      
      {/* Premium Header */}
      <header className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.015)] border-b border-slate-100 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center select-none">
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 select-none">
                  <Image
                    src="/teks logo.webp"
                    alt="OilTrack"
                    width={3186}
                    height={881}
                    className="h-5 w-auto object-contain inline-block"
                  />
                  <span className="text-slate-800 font-extrabold text-sm sm:text-base">Admin</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1 animate-pulse"></span>
                    Active
                  </span>
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-bold uppercase tracking-wider truncate max-w-[250px] sm:max-w-none">
                  {user.email} • {profile?.role?.toUpperCase() ?? 'ADMIN'}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleSignOut}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center w-full sm:w-auto justify-center gap-1.5 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        
        {/* Tab Selection */}
        <div className="w-full bg-white rounded-[2rem] border border-slate-100 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.03)] mb-6 overflow-hidden select-none">
          <div className="bg-slate-50/50 border-b border-slate-100 overflow-x-auto sm:overflow-visible">
            <nav className="flex min-w-max sm:min-w-0 sm:w-full sm:justify-center">
              {[
                { key: 'overview', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3v18h18" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 14l3-3 3 2 5-6" /></svg>, label: 'Overview' },
                { key: 'customers', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Customers' },
                { key: 'machines', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Machines' },
                { key: 'products', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>, label: 'Products' },
                { key: 'tests', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, label: 'Tests' },
                { key: 'orders', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>, label: 'Orders' },
                { key: 'users', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.121 17.804A4 4 0 018 16h8a4 4 0 012.879 1.804M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Users' },
                { key: 'requests', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, label: 'Requests' },
                { key: 'email_logs', icon: <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>, label: 'Emails' }
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
                  }}                  className={`px-6 py-4.5 text-[10px] font-black border-b-2 transition-all whitespace-nowrap uppercase tracking-widest flex items-center justify-center gap-1 ${
                    activeTab === tab.key
                      ? 'border-orange-500 text-orange-600 bg-white/70 shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-orange-500 hover:bg-white/30'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Workspaces */}
          <div className="p-6 sm:p-8">
            
            {activeTab === 'overview' && (
              <AdminOverviewTab
                totalCustomers={totalCustomers}
                activeCustomers={activeCustomers}
                totalMachines={totalMachines}
                machines={machines}
                totalTests={totalTests}
                products={products}
                recentTests={recentTests}
                setActiveTab={(tab) => setActiveTab(tab)}
                formatDate={formatDate}
              />
            )}

            {activeTab === 'customers' && (
              <AdminCustomersTab
                customers={customers}

                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenImport={() => setModalOpen('import-customers')}
                onOpenAdd={openAddCustomer}
                onOpenEdit={openEditCustomer}
                onOpenLogo={openLogoUpload}
                onDelete={handleDeleteCustomer}
                formatDate={formatDate}
              />
            )}

            {activeTab === 'machines' && (
              <AdminMachinesTab
                machines={machines}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenAdd={openAddMachine}
                onOpenEdit={openEditMachine}
                onDelete={handleDeleteMachine}
              />
            )}

            {activeTab === 'products' && (
              <AdminProductsTab
                products={products}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenImport={() => setModalOpen('import-products')}
                onOpenAdd={openAddProduct}
                onOpenEdit={openEditProduct}
                onDelete={handleDeleteProduct}
              />
            )}

            {activeTab === 'tests' && (
              <AdminTestsTab
                recentTests={recentTests}
                customers={customers}
                machines={machines}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                filterMachine={filterMachine}
                setFilterMachine={setFilterMachine}
                dateFilter={dateFilter}
                setDateFilter={(val) => setDateFilter(val as 'all' | 'today' | 'week' | 'month')}
                customDateFrom={customDateFrom}
                setCustomDateFrom={setCustomDateFrom}
                customDateTo={customDateTo}
                setCustomDateTo={setCustomDateTo}
                filterByDate={(testDate) => filterByDate(testDate, dateFilter, customDateFrom, customDateTo)}
                onOpenAdd={openAddTest}
                onOpenEdit={openEditTest}
                onDelete={handleDeleteTest}
                onOpenPdf={(pdfPath) => {
                  if (!pdfPath) return
                  const { data } = supabase.storage.from('lab-reports').getPublicUrl(pdfPath)
                  if (data?.publicUrl) {
                    setCurrentPdfUrl(data.publicUrl)
                    setPdfViewerOpen(true)
                  }
                }}
                formatDate={formatDate}
              />
            )}

            {activeTab === 'users' && (
              <AdminUsersTab
                users={users}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onOpenAdd={openAddUser}
                onOpenEdit={openEditUser}
                onDelete={handleDeleteUser}
              />
            )}

            {activeTab === 'requests' && (
              <AdminRequestsTab 
                labRequests={labRequests} 
                onRefresh={() => router.refresh()} 
              />
            )}

            {activeTab === 'orders' && (
              <AdminOrdersTab
                initialOrders={initialOrders}
                initialComplaints={initialComplaints}
                products={products}
              />
            )}

            {activeTab === 'email_logs' && (
              <AdminEmailLogsTab
                logs={emailLogs}
                loading={emailLogsLoading}
                onRefresh={fetchEmailLogs}
              />
            )}

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 select-none py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase tracking-widest font-black">
            <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            <span>© 2026 PT Nabel Sakha Gemilang</span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Authorized Distributor</span>
            <Image
              src="/logos/total-energies.png"
              alt="TotalEnergies"
              width={100}
              height={26}
              className="h-6 w-auto object-contain brightness-95 hover:brightness-100 transition-all"
            />
          </div>
        </div>
      </footer>

      {/* --- Premium Modals --- */}
      
      {/* Customer Add/Edit Modal */}
      {(modalOpen === 'add-customer' || modalOpen === 'edit-customer') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {modalOpen === 'add-customer' ? 'Add New Customer' : 'Edit Customer'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Corporate Client Configuration</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Company Name</label>
                  <input
                    type="text"
                    value={toInputValue(formData.company_name)}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                    placeholder="PT Contoh Indonesia"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select
                    value={toInputValue(formData.status)}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
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
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {loading ? (
                    <OilDropLoader compact label="Saving..." className="text-white" />
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Save</>
                  )}
                </button>
                <button
                  onClick={() => setModalOpen(null)}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Upload Company Logo</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{selectedCustomerForLogo.company_name}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6">
              <div className="mb-6 flex justify-center">
                <div className="relative w-64 h-48 rounded-[1.5rem] overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-md">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-contain p-6"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                      <span className="text-white font-black text-4xl">
                        {selectedCustomerForLogo.company_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Select Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                />
                <p className="text-[10px] font-medium text-slate-400 mt-2">
                  Max 5MB • PNG, JPG, WebP • Auto-compressed to 400x400px
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUploadLogo}
                  disabled={!logoFile || uploadingLogo}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {uploadingLogo ? (
                    <OilDropLoader compact label="Uploading..." className="text-white" />
                  ) : (
                    <>
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload
                    </>
                  )}
                </button>
                
                {selectedCustomerForLogo.logo_url && (
                  <button
                    onClick={handleDeleteLogo}
                    disabled={uploadingLogo}
                    className="px-4 py-3 bg-slate-100 hover:bg-red-500 hover:text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-250 flex items-center justify-center active:scale-95 shadow-sm text-slate-700"
                    title="Delete Logo"
                  >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                
                <button
                  onClick={() => setModalOpen(null)}
                  disabled={uploadingLogo}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Machine Add/Edit Modal */}
      {(modalOpen === 'add-machine' || modalOpen === 'edit-machine') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {modalOpen === 'add-machine' ? 'Add New Machine' : 'Edit Machine'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mechanical Asset Profile</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Machine Name *</label>
                <input
                  type="text"
                  value={String(formData.machine_name ?? '')}
                  onChange={(e) => setFormData({...formData, machine_name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Compressor BCU 12"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer *</label>
                <select
                  value={toInputValue(formData.customer_id)}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                <input
                  type="text"
                  value={String(formData.location ?? '')}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Plant B"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                <select
                  value={toInputValue(formData.status)}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveMachine}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {loading ? (
                    <OilDropLoader compact label="Saving..." className="text-white" />
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Save</>
                  )}
                </button>
                <button
                  onClick={() => setModalOpen(null)}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {(modalOpen === 'add-product' || modalOpen === 'edit-product') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {modalOpen === 'add-product' ? 'Add New Product' : 'Edit Product'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lubricant Product Catalog</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Name *</label>
                <input
                  type="text"
                  value={String(formData.product_name ?? '')}
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Mobil DTE 25"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Type *</label>
                <input
                  type="text"
                  list="product-types-list"
                  value={String(formData.product_type ?? '')}
                  onChange={(e) => setFormData({...formData, product_type: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Hydraulic Oil, Engine Oil"
                />
                <datalist id="product-types-list">
                  {uniqueProductTypes.map(type => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Base Oil</label>
                <select
                  value={toInputValue(formData.base_oil)}
                  onChange={(e) => setFormData({...formData, base_oil: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                >
                  <option value="">Select Base Oil</option>
                  <option value="Mineral">Mineral</option>
                  <option value="Synthetic">Synthetic</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Viscosity Grade</label>
                {!useCustomViscosity ? (
                  <select
                    value={toInputValue(formData.viscosity_grade)}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setUseCustomViscosity(true)
                        setFormData({...formData, viscosity_grade: ''})
                      } else {
                        setFormData({...formData, viscosity_grade: e.target.value})
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none animate-in fade-in duration-200"
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
                  <div className="flex gap-2 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={String(formData.viscosity_grade ?? '')}
                      onChange={(e) => setFormData({...formData, viscosity_grade: e.target.value})}
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                      placeholder="e.g., Custom HD 50"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomViscosity(false)
                        setFormData({...formData, viscosity_grade: ''})
                      }}
                      className="px-3 py-2 text-xs font-black uppercase bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-xl transition-all"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveProduct}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {loading ? (
                    <OilDropLoader compact label="Saving..." className="text-white" />
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Save</>
                  )}
                </button>
                <button
                  onClick={() => setModalOpen(null)}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lab Test Add/Edit Modal */}
      {(modalOpen === 'add-test' || modalOpen === 'edit-test') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {modalOpen === 'add-test' ? 'Add New Lab Test' : 'Edit Lab Test'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Oil Analysis Report Configuration</p>
                </div>
              </div>
              <button onClick={() => { setFormData({}); setModalOpen(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Machine</label>
                <div className="flex gap-2">
                  <select
                    value={toInputValue(formData.machine_id)}
                    onChange={(e) => setFormData({...formData, machine_id: e.target.value})}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id}>{m.machine_name} ({m.customer?.company_name})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openQuickAddMachine}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:opacity-90 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-1 active:scale-95 shadow-md shadow-orange-500/10"
                    title="Quick Add Machine"
                  >
                    <span>+</span>
                    <span>Add</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product</label>
                <div className="flex gap-2">
                  <select
                    value={toInputValue(formData.product_id)}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.product_name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openQuickAddProduct}
                    className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:opacity-90 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-1 active:scale-95 shadow-md shadow-orange-500/10"
                    title="Quick Add Product"
                  >
                    <span>+</span>
                    <span>Add</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Test Date</label>
                <input
                  type="date"
                  value={String(formData.test_date ?? '')}
                  onChange={(e) => setFormData({...formData, test_date: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Viscosity 40°C</label>
                  <input
                    type="number"
                    step="0.1"
                    value={toInputValue(formData.viscosity_40c)}
                    onChange={(e) => setFormData({...formData, viscosity_40c: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                    placeholder="e.g., 46.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Viscosity 100°C</label>
                  <input
                    type="number"
                    step="0.1"
                    value={toInputValue(formData.viscosity_100c)}
                    onChange={(e) => setFormData({...formData, viscosity_100c: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                    placeholder="e.g., 6.8"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Water Content</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="1"
                    value={toInputValue(formData.water_content)}
                    onChange={(e) => setFormData({...formData, water_content: e.target.value})}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                    placeholder="e.g., 198"
                  />
                  <select
                    value={toInputValue(formData.water_content_unit)}
                    onChange={(e) => setFormData({...formData, water_content_unit: e.target.value})}
                    className="bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl px-3 py-3 text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="PPM">PPM</option>
                    <option value="PERCENT">%</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TAN Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={toInputValue(formData.tan_value)}
                  onChange={(e) => setFormData({...formData, tan_value: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., 0.85"
                />
              </div>

              {/* Bukti Foto Sampel Fisik (jika ada) */}
              {(() => {
                const selectedMachineId = formData.machine_id
                if (!selectedMachineId) return null
                
                // Cari data permintaan lab untuk mesin ini yang memiliki path foto sampel
                const reqWithPhoto = labRequests.find(r => 
                  r.machine_id === selectedMachineId && 
                  r.sample_photo_path && 
                  (r.status === 'sampling' || r.status === 'assigned' || r.status === 'pending' || r.status === 'completed')
                )
                
                if (!reqWithPhoto || !reqWithPhoto.sample_photo_path) return null
                
                const url = supabase.storage.from('sample-photos').getPublicUrl(reqWithPhoto.sample_photo_path).data.publicUrl
                
                return (
                  <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center select-none">
                      <div>
                        <h4 className="text-[10px] font-black text-orange-700 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                          Foto Bukti Sampel Fisik
                        </h4>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          Diambil oleh: {reqWithPhoto.requested_by?.full_name || 'Sales Representative'}
                        </p>
                      </div>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[9px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-wider transition-colors"
                      >
                        Buka Penuh ↗
                      </a>
                    </div>
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-orange-100/60 shadow-sm bg-white">
                      <Image 
                        src={url} 
                        alt="Bukti Botol Sampel" 
                        fill
                        className="object-cover" 
                        unoptimized
                      />
                    </div>
                  </div>
                )
              })()}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lab Report PDF</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    if (file && file.size > 2 * 1024 * 1024) {
                      alert('Berkas PDF terlalu besar! Batas maksimal adalah 2MB agar hemat ruang penyimpanan. Silakan gunakan PDF yang sudah dikompresi.')
                      e.target.value = ''
                      setPdfFile(null)
                    } else {
                      setPdfFile(file)
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                />
                {formData.pdf_path && typeof formData.pdf_path === 'string' && (
                  <p className="text-[10px] text-slate-500 mt-2 font-bold font-mono truncate">
                    Current: {formData.pdf_path.split('/').pop()}
                  </p>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveTest}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {loading ? (
                    <OilDropLoader compact label="Saving..." className="text-white" />
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Save</>
                  )}
                </button>
                <button
                  onClick={() => {
                    setFormData({})
                    setModalOpen(null)
                  }}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
      {(modalOpen === 'add-user' || modalOpen === 'edit-user') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {modalOpen === 'add-user' ? 'Add New User' : 'Edit User'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Access Control Profile</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 space-y-4">
              {modalOpen === 'add-user' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                    <input
                      type="email"
                      value={String(formData.email ?? '')}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                    <input
                      type="password"
                      value={String(formData.password ?? '')}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                <input
                  type="text"
                  value={String(formData.full_name ?? '')}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="Nama Lengkap"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email (Optional)</label>
                <input
                  type="email"
                  value={String(formData.contact_email ?? '')}
                  onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={String(formData.phone_number ?? '')}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="+62 812-xxxx-xxxx"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role</label>
                <select
                  value={toInputValue(formData.role)}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                >
                  <option value="customer">Customer</option>
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formData.role === 'customer' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Company</label>
                  <select
                    value={toInputValue(formData.customer_id)}
                    onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  >
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveUser}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {loading ? (
                    <OilDropLoader compact label="Saving..." className="text-white" />
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Save</>
                  )}
                </button>
                <button
                  onClick={() => setModalOpen(null)}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Customers CSV Modal */}
      {modalOpen === 'import-customers' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Import Customers</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Upload corporate client CSV file</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(null); setCsvData([]); setImportResult(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6">
              {!importResult ? (
                <>
                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CSV File Format Guidance</label>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[11px] font-mono select-all">
                      <div className="font-black text-slate-700 mb-1">Option 1 - Plain (One company name per line):</div>
                      <div className="text-slate-500">PT Nabel Sakha Gemilang</div>
                      <div className="text-slate-500">PT Astra Agro Lestari</div>
                      <div className="text-slate-500">PT United Tractors</div>
                      <div className="font-black text-slate-700 mt-3 mb-1">Option 2 - Column structure with header:</div>
                      <div className="text-slate-650 font-bold">company_name</div>
                      <div className="text-slate-500">PT Nabel Sakha Gemilang</div>
                      <div className="text-slate-500">PT Astra Agro Lestari</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select CSV File</label>
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
                            if (lines.length === 0) return
                            
                            const startIdx = lines[0].toLowerCase().trim() === 'company_name' ? 1 : 0
                            
                            const data = lines.slice(startIdx).map(line => {
                              const companyName = line.split(',')[0].trim()
                              return {
                                company_name: companyName,
                                status: 'active'
                              }
                            }).filter(row => row.company_name)
                            setCsvData(data)
                          }
                          reader.readAsText(file)
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                    />
                  </div>

                  {csvData.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Import Preview ({csvData.length} records)</label>
                      <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-60 shadow-inner bg-slate-50/50">
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">#</th>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Company Name</th>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Default Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100 text-xs font-bold">
                            {csvData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2 text-slate-800">{row.company_name}</td>
                                <td className="px-3 py-2 text-emerald-600">{row.status}</td>
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
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
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
                        if (results.success > 0) router.refresh()
                      }}
                      disabled={csvData.length === 0 || importLoading}
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                    >
                      {importLoading ? 'Importing...' : `Import ${csvData.length} Customers`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className={`p-4.5 rounded-2xl ${importResult.failed === 0 ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-amber-50/50 border border-amber-100'}`}>
                      <h3 className="font-black text-slate-800 text-sm mb-2">Import completed successfully</h3>
                      <p className="text-xs font-bold text-slate-600 mb-1">
                        🟢 <span className="text-emerald-700">{importResult.success} customers</span> successfully imported.
                      </p>
                      {importResult.failed > 0 && (
                        <>
                          <p className="text-xs font-bold text-slate-600 mb-3">
                            🔴 <span className="text-red-600">{importResult.failed} customers</span> failed to process.
                          </p>
                          <div className="mt-3 max-h-40 overflow-y-auto bg-white p-3 rounded-xl border border-slate-150 font-mono text-[10px] space-y-1">
                            <p className="font-black text-red-600 mb-2">Detailed Error Logs:</p>
                            {importResult.errors.map((err, idx) => (
                              <p key={idx} className="text-slate-500">• {err}</p>
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
                      className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:opacity-90 font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                    >
                      Close Window
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
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Import Products</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Upload lubricant product CSV file</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(null); setCsvData([]); setImportResult(null); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6">
              {!importResult ? (
                <>
                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CSV File Format Guidance</label>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-[11px] font-mono select-all">
                      <div className="font-black text-slate-700 mb-1">Required format with column headers:</div>
                      <div className="text-slate-650 font-bold">product_name,product_type,base_oil,viscosity_grade</div>
                      <div className="font-black text-slate-750 mt-3 mb-1">Example Rows:</div>
                      <div className="text-slate-500">Mobil DTE 25,Industrial Oil,Mineral,ISO VG 46</div>
                      <div className="text-slate-500">Shell Tellus S2 M 46,Hydraulic Oil,Mineral,ISO VG 46</div>
                      <div className="text-[10px] text-amber-700 font-bold mt-3">⚠️ Note: product_name and product_type columns must be filled for every row.</div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select CSV File</label>
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
                            
                            const startIdx = lines[0].toLowerCase().includes('product_name') ? 1 : 0
                            
                            const data = lines.slice(startIdx).map(line => {
                              const values = line.split(',').map(v => v.trim())
                              return {
                                product_name: values[0] || '',
                                product_type: values[1] || '',
                                base_oil: values[2] || '',
                                viscosity_grade: values[3] || ''
                              }
                            }).filter(row => row.product_name && row.product_type)
                            setCsvData(data)
                          }
                          reader.readAsText(file)
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-250 focus:border-orange-500 rounded-xl px-4 py-3 text-xs font-semibold text-slate-800 outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                    />
                  </div>

                  {csvData.length > 0 && (
                    <div className="mb-6">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Import Preview ({csvData.length} records)</label>
                      <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-60 shadow-inner bg-slate-50/50">
                        <table className="min-w-full divide-y divide-slate-100">
                          <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">#</th>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Name</th>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Product Type</th>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Oil</th>
                              <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Viscosity</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100 text-xs font-bold">
                            {csvData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2 text-slate-800">{row.product_name}</td>
                                <td className="px-3 py-2 text-orange-600">{row.product_type}</td>
                                <td className="px-3 py-2 text-slate-500">{row.base_oil || '-'}</td>
                                <td className="px-3 py-2 text-slate-500">{row.viscosity_grade || '-'}</td>
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
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
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
                            results.errors.push(`Row missing required fields`)
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
                      className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                    >
                      {importLoading ? 'Importing...' : `Import ${csvData.length} Products`}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <div className={`p-4.5 rounded-2xl ${importResult.failed === 0 ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-amber-50/50 border border-amber-100'}`}>
                      <h3 className="font-black text-slate-800 text-sm mb-2">Import completed successfully</h3>
                      <p className="text-xs font-bold text-slate-600 mb-1">
                        🟢 <span className="text-emerald-700">{importResult.success} products</span> successfully imported.
                      </p>
                      {importResult.failed > 0 && (
                        <>
                          <p className="text-xs font-bold text-slate-600 mb-3">
                            🔴 <span className="text-red-600">{importResult.failed} products</span> failed to process.
                          </p>
                          <div className="mt-3 max-h-40 overflow-y-auto bg-white p-3 rounded-xl border border-slate-150 font-mono text-[10px] space-y-1">
                            <p className="font-black text-red-600 mb-2">Detailed Error Logs:</p>
                            {importResult.errors.map((err, idx) => (
                              <p key={idx} className="text-slate-500">• {err}</p>
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
                      className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:opacity-90 font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                    >
                      Close Window
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Quick Add Machine</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Configure assets directly from lab form</p>
                </div>
              </div>
              <button onClick={cancelQuickAddMachine} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Machine Name *</label>
                <input
                  type="text"
                  value={String(quickAddData.machine_name ?? '')}
                  onChange={(e) => setQuickAddData({...quickAddData, machine_name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Compressor BCU 12"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer *</label>
                <select
                  value={toInputValue(quickAddData.customer_id)}
                  onChange={(e) => setQuickAddData({...quickAddData, customer_id: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                <input
                  type="text"
                  value={String(quickAddData.location ?? '')}
                  onChange={(e) => setQuickAddData({...quickAddData, location: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Plant B"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                <select
                  value={toInputValue(quickAddData.status)}
                  onChange={(e) => setQuickAddData({...quickAddData, status: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleQuickSaveMachine}
                  disabled={loading || !quickAddData.machine_name || !quickAddData.customer_id}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
                >
                  {loading ? 'Saving...' : 'Save & Select'}
                </button>
                <button
                  onClick={cancelQuickAddMachine}
                  className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {quickAddModal === 'product' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Quick Add Product</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Configure products directly from lab form</p>
                </div>
              </div>
              <button onClick={cancelQuickAddProduct} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Name *</label>
                <input
                  type="text"
                  value={String(quickAddData.product_name ?? '')}
                  onChange={(e) => setQuickAddData({...quickAddData, product_name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Azolla ZS 46"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Type *</label>
                <input
                  type="text"
                  list="quick-product-types-list"
                  value={String(quickAddData.product_type ?? '')}
                  onChange={(e) => setQuickAddData({...quickAddData, product_type: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                  placeholder="e.g., Hydraulic Oil, Compressor Oil"
                />
                <datalist id="quick-product-types-list">
                  {uniqueProductTypes.map(type => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Base Oil</label>
                <select
                  value={toInputValue(quickAddData.base_oil)}
                  onChange={(e) => setQuickAddData({...quickAddData, base_oil: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                >
                  <option value="">Select Base Oil</option>
                  <option value="Mineral">Mineral</option>
                  <option value="Synthetic">Synthetic</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Viscosity Grade</label>
                {!useCustomViscosityQuick ? (
                  <select
                    value={toInputValue(quickAddData.viscosity_grade)}
                    onChange={(e) => {
                      if (e.target.value === 'OTHER') {
                        setUseCustomViscosityQuick(true)
                        setQuickAddData({...quickAddData, viscosity_grade: ''})
                      } else {
                        setQuickAddData({...quickAddData, viscosity_grade: e.target.value})
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none animate-in fade-in duration-200"
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
                      <option value="SAE 5W-20">SAE 5W-25</option>
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
                  <div className="flex gap-2 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={String(quickAddData.viscosity_grade ?? '')}
                      onChange={(e) => setQuickAddData({...quickAddData, viscosity_grade: e.target.value})}
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 transition-all outline-none"
                      placeholder="e.g., Custom HD 50"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUseCustomViscosityQuick(false)
                        setQuickAddData({...quickAddData, viscosity_grade: ''})
                      }}
                      className="px-3 py-2 text-xs font-black uppercase bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-xl transition-all"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleQuickSaveProduct}
                disabled={loading || !quickAddData.product_name || !quickAddData.product_type}
                className="flex-1 px-5 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl disabled:opacity-50 font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20"
              >
                {loading ? 'Saving...' : 'Save & Select'}
              </button>
              <button
                onClick={cancelQuickAddProduct}
                className="flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfViewerOpen && currentPdfUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={() => setPdfViewerOpen(false)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-100 overflow-hidden animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between text-slate-900 select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">PDF Viewer</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lab Test Report Analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={currentPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Open In New Tab
                </a>
                <button
                  onClick={() => setPdfViewerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                >
                  <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-900">
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
