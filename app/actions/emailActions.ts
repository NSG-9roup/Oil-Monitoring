'use server'

// Hardcoded purchasing email — all proposals go here
const PURCHASING_EMAIL = 'warehouse@nabelsakha.com'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[]
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[Resend Email] RESEND_API_KEY is not set in .env.local. Skipping sending email.')
    return { success: false, error: 'API Key not set' }
  }

  const toArray = Array.isArray(to) ? to : [to]

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OilTrack <onboarding@resend.dev>',
        to: toArray,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Resend Email] Resend API error response:', errorText)
      return { success: false, error: errorText }
    }

    const data = await res.json()
    console.log('[Resend Email] Email sent successfully:', data)
    return { success: true, data }
  } catch (err) {
    console.error('[Resend Email] Failed to send email:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * On-demand action to email chemical lab test metrics to the customer.
 * Fixes: fetches email from auth.users if oil_profiles.email is empty.
 */
export async function sendLabTestResultEmailAction(testId: string) {
  try {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const supabaseService = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Fetch test details, machine, and product
    const { data: test, error: testError } = await supabaseService
      .from('oil_lab_tests')
      .select(`
        *,
        machine:oil_machines (
          machine_name,
          customer_id,
          serial_number,
          model,
          location,
          customer:oil_customers (company_name)
        ),
        product:oil_products (
          product_name,
          baseline_viscosity_40c,
          baseline_viscosity_100c,
          baseline_tan
        )
      `)
      .eq('id', testId)
      .single()

    if (testError || !test) {
      throw new Error(`Lab test not found: ${testError?.message}`)
    }

    const customerId = test.machine?.customer_id
    if (!customerId) {
      throw new Error('Customer ID not found for this test')
    }

    // 2. Fetch customer profiles
    const { data: profiles, error: profilesError } = await supabaseService
      .from('oil_profiles')
      .select('id, email, full_name')
      .eq('customer_id', customerId)
      .eq('role', 'customer')

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      throw new Error('No customer profiles found to email')
    }

    // 3. Gather emails — prioritize profile email, fallback to auth.users email
    const profileEmails = profiles.map(p => p.email).filter(Boolean) as string[]
    const emails: string[] = [...profileEmails]

    if (emails.length === 0) {
      // Fallback: fetch from Supabase Auth directly using service role
      console.log('[Email] Profile emails empty, fetching from auth.users...')
      const profileIds = profiles.map(p => p.id).filter(Boolean)

      for (const profileId of profileIds) {
        try {
          const { data: authUser } = await supabaseService.auth.admin.getUserById(profileId)
          if (authUser?.user?.email) {
            emails.push(authUser.user.email)
          }
        } catch (authErr) {
          console.warn(`[Email] Could not fetch auth email for profile ${profileId}:`, authErr)
        }
      }
    }

    if (emails.length === 0) {
      throw new Error('No valid customer email addresses found')
    }

    const machineName = test.machine?.machine_name || 'N/A'
    const companyName = test.machine?.customer?.company_name || 'Customer'
    const productName = test.product?.product_name || 'N/A'

    // 4. Build a beautiful HTML email layout
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f1f5f9; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #be185d; margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Laporan Hasil Uji Lab</h2>
          <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Oil Condition Monitoring System</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Halo Tim <strong>${companyName}</strong>,</p>
        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Hasil analisis laboratorium terbaru untuk mesin Anda telah selesai diproses. Berikut ringkasan metrik yang diperoleh:</p>
        
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 15px; margin: 20px 0;">
          <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600; width: 45%;">Nama Mesin:</td>
              <td style="padding: 6px 0; color: #0f172a;">${machineName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Model / SN:</td>
              <td style="padding: 6px 0; color: #0f172a;">${test.machine?.model || '-'} / ${test.machine?.serial_number || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Produk Oli:</td>
              <td style="padding: 6px 0; color: #0f172a;">${productName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600;">Tanggal Pengujian:</td>
              <td style="padding: 6px 0; color: #0f172a;">${new Date(test.test_date).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</td>
            </tr>
          </table>
        </div>

        <h3 style="color: #0f172a; font-size: 14px; font-weight: 700; margin: 25px 0 10px 0;">Metrik Analisis Kondisi:</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 8px 12px; text-align: left; font-weight: 700; color: #475569;">Parameter</th>
              <th style="padding: 8px 12px; text-align: right; font-weight: 700; color: #475569;">Hasil Uji</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; color: #334155;">Viscosity @ 40°C</td>
              <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">${test.viscosity_40c !== null ? `${test.viscosity_40c} cSt` : '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; color: #334155;">Viscosity @ 100°C</td>
              <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">${test.viscosity_100c !== null ? `${test.viscosity_100c} cSt` : '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; color: #334155;">Water Content</td>
              <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">${test.water_content !== null ? `${test.water_content} ${test.water_content_unit || 'PPM'}` : '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; color: #334155;">Total Acid Number (TAN)</td>
              <td style="padding: 10px 12px; text-align: right; font-weight: bold; color: #0f172a;">${test.tan_value !== null ? `${test.tan_value} mgKOH/g` : '-'}</td>
            </tr>
          </tbody>
        </table>

        ${test.notes ? `
          <div style="border-left: 4px solid #be185d; padding-left: 15px; margin: 20px 0; font-style: italic; color: #475569; font-size: 13px;">
            <strong>Catatan Analis:</strong> "${test.notes}"
          </div>
        ` : ''}

        ${test.pdf_path ? `
          <p style="font-size: 14px; color: #334155; line-height: 1.5; margin-top: 25px;">Laporan PDF hasil uji resmi dapat diunduh melalui tombol di bawah atau dengan mengakses portal dashboard Anda.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/lab-reports/${test.pdf_path}" style="background-color: #be185d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 13px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(190,24,93,0.2);">Unduh Laporan PDF</a>
          </div>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Laporan Rahasia OilTrack • Sistem Pemantauan Kondisi Oli Industri</p>
      </div>
    `

    // 5. Send email
    const result = await sendEmail({
      to: emails,
      subject: `[OilTrack] Laporan Hasil Uji Lab Selesai: ${machineName} - ${companyName}`,
      html
    })

    if (!result.success) throw new Error(result.error)

    return { success: true }
  } catch (err) {
    console.error('Error in sendLabTestResultEmailAction:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send product proposal email to the purchasing department.
 * Triggered by sales when a customer requests a product quote.
 */
export async function sendPurchasingProposalEmail({
  salesName,
  customerName,
  companyPT,
  productName,
  quantity,
  customerPhone,
  customerEmail,
  notes,
}: {
  salesName: string
  customerName: string
  companyPT: string
  productName: string
  quantity: number
  customerPhone?: string
  customerEmail?: string
  notes?: string
}) {
  const now = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); padding: 32px 28px; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(255,255,255,0.7);">OilTrack System</p>
        <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">Permintaan Penawaran Produk</h1>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.75);">${now}</p>
      </div>

      <!-- Body -->
      <div style="background: #ffffff; padding: 28px;">
        
        <p style="font-size: 14px; color: #475569; margin: 0 0 20px 0; line-height: 1.6;">
          Halo Tim <strong style="color: #0f172a;">Purchasing / Warehouse</strong>,<br>
          Berikut adalah permintaan penawaran produk oli yang dikirimkan oleh tim sales untuk ditindaklanjuti.
        </p>

        <!-- Request Info Card -->
        <div style="background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8;">Detail Permintaan</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-weight: 600; width: 40%; vertical-align: top;">Nama Produk</td>
              <td style="padding: 7px 0; color: #0f172a; font-weight: 700;">${productName}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Jumlah</td>
              <td style="padding: 7px 0; color: #0f172a; font-weight: 700; border-top: 1px solid #f1f5f9;">${quantity} unit / liter</td>
            </tr>
          </table>
        </div>

        <!-- Customer Info Card -->
        <div style="background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8;">Data Customer</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-weight: 600; width: 40%;">Nama Customer</td>
              <td style="padding: 7px 0; color: #0f172a; font-weight: 700;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Perusahaan (PT)</td>
              <td style="padding: 7px 0; color: #0f172a; font-weight: 700; border-top: 1px solid #f1f5f9;">${companyPT}</td>
            </tr>
            ${customerPhone ? `
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">No. Telepon</td>
              <td style="padding: 7px 0; color: #0f172a; border-top: 1px solid #f1f5f9;">${customerPhone}</td>
            </tr>
            ` : ''}
            ${customerEmail ? `
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-weight: 600; border-top: 1px solid #f1f5f9;">Email</td>
              <td style="padding: 7px 0; color: #0f172a; border-top: 1px solid #f1f5f9;">${customerEmail}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${notes ? `
        <!-- Notes -->
        <div style="background: #fff7ed; border-left: 4px solid #ea580c; border-radius: 0 12px 12px 0; padding: 14px 16px; margin-bottom: 20px;">
          <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #ea580c;">Catatan Tambahan</p>
          <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.5;">${notes}</p>
        </div>
        ` : ''}

        <!-- Sales Info -->
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 4px;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            Dikirim oleh Sales: <strong style="color: #475569;">${salesName}</strong> melalui OilTrack System
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 16px 28px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">OilTrack • PT Nabel Sakha Gemilang • Sistem Pemantauan Kondisi Oli Industri</p>
      </div>
    </div>
  `

  const result = await sendEmail({
    to: PURCHASING_EMAIL,
    subject: `[OilTrack] Permintaan Penawaran: ${productName} — ${companyPT}`,
    html,
  })

  return result
}
