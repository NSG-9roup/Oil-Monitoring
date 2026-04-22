const fs = require('fs');
const path = 'c:/Users/Acuel/Oil-Monitoring/app/admin/AdminClient.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '  recentTests: AdminLabTest[]\r\n}',
  '  recentTests: AdminLabTest[]\r\n  initialProducts: AdminProduct[]\r\n  initialUsers: AdminUser[]\r\n  initialPurchases: AdminPurchase[]\r\n}'
);
content = content.replace(
  '  recentTests: AdminLabTest[]\n}',
  '  recentTests: AdminLabTest[]\n  initialProducts: AdminProduct[]\n  initialUsers: AdminUser[]\n  initialPurchases: AdminPurchase[]\n}'
);

content = content.replace(
  'import { logger } from \'@/lib/logger\'',
  'import { logger } from \'@/lib/logger\'\nimport { createCustomer, updateCustomer, deleteCustomer, createMachine, updateMachine, deleteMachine, createUser, updateUser, deleteUser, createProduct, updateProduct, deleteProduct, createTest, updateTest, deleteTest, createPurchase, updatePurchase, deletePurchase } from \'@/app/actions/adminActions\''
);

content = content.replace(
  /export default function AdminClient\(\{\s*user,\s*profile,\s*customers:\s*initialCustomers,\s*machines:\s*initialMachines,\s*recentTests:\s*initialTests,?\s*\}\s*:\s*AdminClientProps\)\s*\{/,
  `export default function AdminClient({
  user,
  profile,
  customers: initialCustomers,
  machines: initialMachines,
  recentTests: initialTests,
  initialProducts,
  initialUsers,
  initialPurchases,
}: AdminClientProps) {`
);

content = content.replace(
  'const [products, setProducts] = useState<AdminProduct[]>([])',
  'const [products, setProducts] = useState<AdminProduct[]>(initialProducts)'
);
content = content.replace(
  'const [users, setUsers] = useState<AdminUser[]>([])',
  'const [users, setUsers] = useState<AdminUser[]>(initialUsers)'
);
content = content.replace(
  'const [purchases, setPurchases] = useState<AdminPurchase[]>([])',
  'const [purchases, setPurchases] = useState<AdminPurchase[]>(initialPurchases)'
);

content = content.replace(
  'const [useCustomViscosity, setUseCustomViscosity] = useState(false)',
  `const [useCustomViscosity, setUseCustomViscosity] = useState(false)

  // Sync props to state on Server Action revalidation
  useEffect(() => {
    setCustomers(normalizeCustomers(initialCustomers as CustomerWithPinHash[]))
    setMachines(initialMachines)
    setRecentTests(initialTests)
    setProducts(initialProducts)
    setUsers(initialUsers)
    setPurchases(initialPurchases)
  }, [initialCustomers, initialMachines, initialTests, initialProducts, initialUsers, initialPurchases])`
);

const oldHandleSaveCustomer = /const handleSaveCustomer = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\}/;
content = content.replace(oldHandleSaveCustomer, 
`const handleSaveCustomer = async () => {
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
  }`);

content = content.replace(/const handleDeleteCustomer = async \(id: string\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\}/, 
`const handleDeleteCustomer = async (id: string) => {
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
  }`);

content = content.replace(/const handleSaveMachine = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\}/, 
`const handleSaveMachine = async () => {
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
  }`);

content = content.replace(/const handleDeleteMachine = async \(id: string\) => \{[\s\S]*?catch \(error: unknown\) \{\s*alert\('Error: ' \+ getErrorMessage\(error\)\)\s*\}\s*\}/, 
`const handleDeleteMachine = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this machine?')) return
    setLoading(true)
    try {
      await deleteMachine(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    }
  }`);

content = content.replace(/const handleSaveProduct = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\}/, 
`const handleSaveProduct = async () => {
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
  }`);

content = content.replace(/const handleDeleteProduct = async \(id: string\) => \{[\s\S]*?setLoading\(false\)\s*\}\s*\}/, 
`const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    setLoading(true)
    try {
      await deleteProduct(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }`);

content = content.replace(/const handleSavePurchase = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\}/, 
`const handleSavePurchase = async () => {
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
  }`);

content = content.replace(/const handleDeletePurchase = async \(id: string\) => \{[\s\S]*?setLoading\(false\)\s*\}\s*\}/, 
`const handleDeletePurchase = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this purchase?')) return
    setLoading(true)
    try {
      await deletePurchase(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }`);

content = content.replace(/const handleSaveTest = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\}/, 
`const handleSaveTest = async () => {
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
  }`);

content = content.replace(/const handleDeleteTest = async \(id: string\) => \{[\s\S]*?setLoading\(false\)\s*\}\s*\}/, 
`const handleDeleteTest = async (id: string) => {
    if (!window.confirm('Area you sure you want to delete this test record?')) return
    setLoading(true)
    try {
      await deleteTest(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }`);

// Finally for handleSaveUser and handleDeleteUser
content = content.replace(/const handleSaveUser = async \(\) => \{[\s\S]*?finally \{\s*setLoading\(false\)\s*\}\s*\}/, 
`const handleSaveUser = async () => {
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
  }`);

content = content.replace(/const handleDeleteUser = async \(id: string\) => \{[\s\S]*?setLoading\(false\)\s*\}\s*\}/, 
`const handleDeleteUser = async (id: string) => {
    if (id === user.id) {
      alert('You cannot delete yourself')
      return
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return
    setLoading(true)
    try {
      await deleteUser(id)
      if (selectedItem?.id === id) setSelectedItem(null)
    } catch (error: unknown) {
      alert('Error: ' + getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }`);

// Remove load* functions that were replaced
content = content.replace(/const loadCustomers = async \(\) => \{[\s\S]*?\}\n/, '');
content = content.replace(/const loadMachines = async \(\) => \{[\s\S]*?\}\n/, '');
content = content.replace(/const loadUsers = useCallback\(async \(\) => \{[\s\S]*?\}\, \[supabase\]\)/, '');
content = content.replace(/const loadProducts = useCallback\(async \(\) => \{[\s\S]*?\}\, \[supabase\]\)/, '');
content = content.replace(/const loadTests = useCallback\(async \(\) => \{[\s\S]*?\}\, \[supabase\]\)/, '');
content = content.replace(/const loadPurchases = useCallback\(async \(\) => \{[\s\S]*?\}\, \[supabase\]\)/, '');

fs.writeFileSync(path, content, 'utf8');
console.log('Modified AdminClient phase 2 step 1 successfully');
