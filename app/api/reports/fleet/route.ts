import { type NextRequest, NextResponse } from 'next/server'
import { generateFleetReportPdfServer } from '@/lib/pdf/generateFleetReportServer'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { meta, rows, language } = body

    if (!meta || !rows) {
      return NextResponse.json({ error: 'Missing meta or rows data' }, { status: 400 })
    }

    const pdfBuffer = await generateFleetReportPdfServer(meta, rows, language || 'en')

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=fleet_report.pdf',
      },
    })
  } catch (err) {
    console.error('Error generating server PDF report:', err)
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
