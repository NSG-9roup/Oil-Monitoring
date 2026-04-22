import sys, re

with open('c:/Users/Acuel/Oil-Monitoring/app/admin/AdminClient.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

def remove_function_by_name(source, func_name):
    # Find start of function
    start_index = source.find(f'const {func_name} = ')
    if start_index == -1:
        return source
    
    # Find the first opening brace after start_index
    brace_index = source.find('{', start_index)
    if brace_index == -1:
        return source

    bracket_count = 1
    i = brace_index + 1
    while i < len(source):
        if source[i] == '{':
            bracket_count += 1
        elif source[i] == '}':
            bracket_count -= 1
        
        if bracket_count == 0:
            break
        i += 1
    
    return source[:start_index] + source[i+1:]

funcs_to_remove = [
    'renderOverviewTab', 'renderCustomersTab', 'renderMachinesTab',
    'renderProductsTab', 'renderTestsTab', 'renderAlertsTab',
    'renderPurchasesTab', 'renderUsersTab',
    'loadCustomers', 'loadMachines', 'loadUsers',
    'loadProducts', 'loadTests', 'loadPurchases'
]

for fn in funcs_to_remove:
    text = remove_function_by_name(text, fn)

# 1. Update Props and Initial State setup
text = text.replace(
  '  recentTests: AdminLabTest[]\n}',
  '  recentTests: AdminLabTest[]\n  initialProducts: AdminProduct[]\n  initialUsers: AdminUser[]\n  initialPurchases: AdminPurchase[]\n}'
)
text = text.replace(
  '  recentTests: AdminLabTest[]\r\n}',
  '  recentTests: AdminLabTest[]\r\n  initialProducts: AdminProduct[]\r\n  initialUsers: AdminUser[]\r\n  initialPurchases: AdminPurchase[]\r\n}'
)

imports = 'import { logger } from \'@/lib/logger\'\nimport { createCustomer, updateCustomer, deleteCustomer, createMachine, updateMachine, deleteMachine, createUser, updateUser, deleteUser, createProduct, updateProduct, deleteProduct, createTest, updateTest, deleteTest, createPurchase, updatePurchase, deletePurchase } from \'@/app/actions/adminActions\'\nimport { AdminOverviewTab } from \'./components/AdminOverviewTab\'\nimport { AdminCustomersTab } from \'./components/AdminCustomersTab\'\nimport { AdminMachinesTab } from \'./components/AdminMachinesTab\'\nimport { AdminProductsTab } from \'./components/AdminProductsTab\'\nimport { AdminTestsTab } from \'./components/AdminTestsTab\'\nimport { AdminAlertsTab } from \'./components/AdminAlertsTab\'\nimport { AdminPurchasesTab } from \'./components/AdminPurchasesTab\'\nimport { AdminUsersTab } from \'./components/AdminUsersTab\''
text = text.replace('import { logger } from \'@/lib/logger\'', imports)

text = re.sub(
  r'export default function AdminClient\(\{[\s\S]*?\}\s*:\s*AdminClientProps\)\s*\{',
  '''export default function AdminClient({
  user,
  profile,
  customers: initialCustomers,
  machines: initialMachines,
  recentTests: initialTests,
  initialProducts,
  initialUsers,
  initialPurchases,
}: AdminClientProps) {''', text)

text = text.replace('const [products, setProducts] = useState<AdminProduct[]>([])', 'const [products, setProducts] = useState<AdminProduct[]>(initialProducts)')
text = text.replace('const [users, setUsers] = useState<AdminUser[]>([])', 'const [users, setUsers] = useState<AdminUser[]>(initialUsers)')
text = text.replace('const [purchases, setPurchases] = useState<AdminPurchase[]>([])', 'const [purchases, setPurchases] = useState<AdminPurchase[]>(initialPurchases)')

sync_effect = '''const [useCustomViscosity, setUseCustomViscosity] = useState(false)

  // Sync props to state on Server Action revalidation
  useEffect(() => {
    setCustomers(normalizeCustomers(initialCustomers as CustomerWithPinHash[]))
    setMachines(initialMachines)
    setRecentTests(initialTests)
    setProducts(initialProducts)
    setUsers(initialUsers)
    setPurchases(initialPurchases)
  }, [initialCustomers, initialMachines, initialTests, initialProducts, initialUsers, initialPurchases])'''
text = text.replace('const [useCustomViscosity, setUseCustomViscosity] = useState(false)', sync_effect)

# Override the old active tab effect using bracket matcher
text = remove_function_by_name(text, 'refreshData')

# Now fix the server actions.
# We will just replace the inner contents of handleSave/Delete with regex.
def replace_func_body(source, func_name, new_body):
    start_index = source.find(f'const {func_name} = ')
    if start_index == -1: return source
    brace_index = source.find('{', start_index)
    
    bracket_count = 1
    i = brace_index + 1
    while i < len(source):
        if source[i] == '{': bracket_count += 1
        elif source[i] == '}': bracket_count -= 1
        if bracket_count == 0: break
        i += 1
    
    return source[:start_index] + f'const {func_name} = ' + new_body + source[i+1:]

text = replace_func_body(text, 'handleSaveCustomer', '''async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-customer') {
        await createCustomer(formData)
        alert('Customer added successfully!')
      } else if (modalOpen === 'edit-customer') {
        const selectedItemId = selectedItem?.id
        if (!selectedItemId) throw new Error('No customer selected')
        await updateCustomer(selectedItemId, formData)
        alert('Customer updated successfully!')
      }
      setModalOpen(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleDeleteCustomer', '''async (id: string) => {
    const confirmMessage = "Menghapus customer ini juga akan MENGHAPUS SELURUH.\\nAnda yakin 100%?"
    if (!window.confirm(confirmMessage)) return
    setLoading(true)
    try {
      await deleteCustomer(id)
      alert("Customer dan seluruh relasi berhasil dihapus.")
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: any) {
      alert("Gagal menghapus: " + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleSaveMachine', '''async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-machine') {
        await createMachine(formData)
        alert('Machine added successfully!')
      } else if (modalOpen === 'edit-machine') {
        if (!selectedItem?.id) throw new Error('No machine selected')
        await updateMachine(selectedItem.id, formData)
        alert('Machine updated successfully!')
      }
      setModalOpen(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleDeleteMachine', '''async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) return
    setLoading(true)
    try {
      await deleteMachine(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleSaveProduct', '''async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-product') {
        await createProduct(formData)
        alert('Product added successfully!')
      } else if (modalOpen === 'edit-product') {
        if (!selectedItem?.id) throw new Error('No product selected')
        await updateProduct(selectedItem.id, formData)
        alert('Product updated successfully!')
      }
      setModalOpen(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleDeleteProduct', '''async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    setLoading(true)
    try {
      await deleteProduct(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleSavePurchase', '''async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-purchase') {
        await createPurchase(formData)
        alert('Purchase record added successfully!')
      } else if (modalOpen === 'edit-purchase') {
        if (!selectedItem?.id) throw new Error('No record selected')
        await updatePurchase(selectedItem.id, formData)
        alert('Purchase record updated successfully!')
      }
      setModalOpen(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleDeletePurchase', '''async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase?')) return
    setLoading(true)
    try {
      await deletePurchase(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleSaveTest', '''async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-test') {
        await createTest(formData)
        alert('Lab test recorded successfully!')
      } else if (modalOpen === 'edit-test') {
        if (!selectedItem?.id) throw new Error('No test selected')
        await updateTest(selectedItem.id, formData)
        alert('Lab test updated successfully!')
      }
      setModalOpen(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleDeleteTest', '''async (id: string) => {
    if (!window.confirm('Area you sure you want to delete this test record?')) return
    setLoading(true)
    try {
      await deleteTest(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleSaveUser', '''async () => {
    setLoading(true)
    try {
      if (modalOpen === 'add-user') {
        await createUser({ ...formData, action: 'create' })
        alert('User profile added successfully!')
      } else if (modalOpen === 'edit-user') {
        if (!selectedItem?.id) throw new Error('No user selected')
        await updateUser(selectedItem.id, { ...formData, action: 'update' })
        alert('User profile updated successfully!')
      }
      setModalOpen(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

text = replace_func_body(text, 'handleDeleteUser', '''async (id: string) => {
    if (id === user.id) {
      alert('You cannot delete yourself')
      return
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return
    setLoading(true)
    try {
      await deleteUser(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: any) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }''')

# Clean out specific useEffect that breaks compile
text = re.sub(r'useEffect\(\(\) => \{\n\s*if \(activeTab === \'overview\'\) \{[\s\S]*?\}, \[activeTab, loadAlertQueue, loadProducts, loadPurchases, loadTests, loadUsers\]\)\n', '', text)

text = text.replace('{activeTab === \'overview\' && renderOverviewTab()}', '''{activeTab === 'overview' && (
              <AdminOverviewTab
                dashboardStats={{
                  totalCustomers: customers.length,
                  totalMachines: machines.length,
                  recentAlerts: recentTests.length, // Placeholder for alerts
                  activeTests: recentTests.length,
                }}
                recentTests={recentTests}
                user={user}
              />
            )}''')

text = text.replace('{activeTab === \'customers\' && renderCustomersTab()}', '''{activeTab === 'customers' && (
              <AdminCustomersTab
                customers={customers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                customerPinFilter={customerPinFilter}
                setCustomerPinFilter={setCustomerPinFilter}
                onAdd={() => { setFormData({}); setSelectedItem(null); setModalOpen('add-customer'); }}
                onEdit={(c) => { setFormData({ ...c, company_name: c.company_name, status: c.status }); setSelectedItem(c); setModalOpen('edit-customer'); }}
                onDelete={(c) => handleDeleteCustomer(c.id)}
                onManageUsers={(c) => { setActiveTab('users'); setFilterCompany(c.id); }}
                onSetPin={(c) => { setFormData({ password: '' }); setSelectedItem(c); setModalOpen('set-customer-pin'); }}
                onUploadLogo={(c) => { setSelectedItem(c); setLogoFile(null); setLogoPreview(null); setModalOpen('upload-logo'); }}
                userRole={profile.role}
              />
            )}''')

text = text.replace('{activeTab === \'machines\' && renderMachinesTab()}', '''{activeTab === 'machines' && (
              <AdminMachinesTab
                machines={machines}
                customers={customers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                onAdd={() => { setFormData({}); setSelectedItem(null); setModalOpen('add-machine'); }}
                onEdit={(m) => { setFormData(m); setSelectedItem(m); setModalOpen('edit-machine'); }}
                onDelete={(m) => handleDeleteMachine(m.id)}
                userRole={profile.role}
              />
            )}''')

text = text.replace('{activeTab === \'products\' && renderProductsTab()}', '''{activeTab === 'products' && (
              <AdminProductsTab
                products={products}
                uniqueProductTypes={uniqueProductTypes}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                onAdd={() => { setFormData({}); setSelectedItem(null); setModalOpen('add-product'); }}
                onEdit={(p) => { setFormData(p); setSelectedItem(p); setModalOpen('edit-product'); }}
                onDelete={(p) => handleDeleteProduct(p.id)}
                onImport={() => { setCsvData([]); setModalOpen('import-products'); }}
                userRole={profile.role}
              />
            )}''')

text = text.replace('{activeTab === \'tests\' && renderTestsTab()}', '''{activeTab === 'tests' && (
              <AdminTestsTab
                recentTests={recentTests}
                machines={machines}
                products={products}
                customers={customers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                filterMachine={filterMachine}
                setFilterMachine={setFilterMachine}
                customDateFrom={customDateFrom}
                setCustomDateFrom={setCustomDateFrom}
                customDateTo={customDateTo}
                setCustomDateTo={setCustomDateTo}
                onAdd={() => { setFormData({ test_date: new Date().toISOString().split('T')[0] }); setSelectedItem(null); setModalOpen('add-test'); }}
                onEdit={(t) => { setFormData({ ...t, test_date: new Date(t.test_date).toISOString().split('T')[0] }); setSelectedItem(t); setModalOpen('edit-test'); }}
                onDelete={(t) => handleDeleteTest(t.id)}
                onViewPdf={(t) => {
                  if (t.pdf_path) {
                    const { data } = supabase.storage.from('lab-reports').getPublicUrl(t.pdf_path)
                    setCurrentPdfUrl(data.publicUrl)
                    setPdfViewerOpen(true)
                  }
                }}
                userRole={profile.role}
              />
            )}''')

text = text.replace('{activeTab === \'alerts\' && renderAlertsTab()}', '''{activeTab === 'alerts' && (
              <AdminAlertsTab
                alertQueue={alertQueue}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                alertSeverityFilter={alertSeverityFilter}
                setAlertSeverityFilter={setAlertSeverityFilter}
                alertStatusFilter={alertStatusFilter}
                setAlertStatusFilter={setAlertStatusFilter}
                customers={customers}
                onDismiss={(a) => {}}
                onReview={(a) => {}}
                onNotify={(a) => {}}
                userRole={profile.role}
              />
            )}''')

text = text.replace('{activeTab === \'purchases\' && renderPurchasesTab()}', '''{activeTab === 'purchases' && (
              <AdminPurchasesTab
                purchases={purchases}
                customers={customers}
                products={products}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                customDateFrom={customDateFrom}
                setCustomDateFrom={setCustomDateFrom}
                customDateTo={customDateTo}
                setCustomDateTo={setCustomDateTo}
                onAdd={() => { setFormData({ purchase_date: new Date().toISOString().split('T')[0] }); setSelectedItem(null); setModalOpen('add-purchase'); }}
                onEdit={(p) => { setFormData({ ...p, purchase_date: p.purchase_date.split('T')[0] }); setSelectedItem(p); setModalOpen('edit-purchase'); }}
                onDelete={(p) => handleDeletePurchase(p.id)}
                userRole={profile.role}
              />
            )}''')

text = text.replace('{activeTab === \'users\' && renderUsersTab()}', '''{activeTab === 'users' && (
              <AdminUsersTab
                users={users}
                customers={customers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterCompany={filterCompany}
                setFilterCompany={setFilterCompany}
                onAdd={() => { setFormData({ role: 'customer' }); setSelectedItem(null); setModalOpen('add-user'); }}
                onEdit={(u) => { setFormData({ ...u, password: '' }); setSelectedItem(u); setModalOpen('edit-user'); }}
                onDelete={(u) => handleDeleteUser(u.id)}
                userRole={profile.role}
              />
            )}''')

with open('c:/Users/Acuel/Oil-Monitoring/app/admin/AdminClient.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Successfully rewritten Phase 2 AdminClient.tsx')
