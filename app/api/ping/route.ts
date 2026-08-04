import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = createServiceClient()
    // Query ringan untuk memicu keaktifan DB Supabase
    const { data, error } = await supabase
      .from('oil_products')
      .select('id')
      .limit(1)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Supabase keep-alive ping successful',
      timestamp: new Date().toISOString(),
      data
    })
  } catch (error: any) {
    console.error('Supabase Ping Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
