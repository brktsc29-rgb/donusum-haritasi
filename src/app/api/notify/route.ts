import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { parcelId, companyIds, customNote, sentById } = await request.json()

  if (!parcelId || !companyIds?.length) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: parcel } = await supabase
    .from('parcels')
    .select('*, neighborhoods(name), blocks(block_no)')
    .eq('id', parcelId)
    .single()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, email, contact_person')
    .in('id', companyIds)

  const results = []
  const resendApiKey = process.env.RESEND_API_KEY

  for (const company of companies ?? []) {
    if (!company.email) {
      results.push({ companyId: company.id, success: false, error: 'No email' })
      continue
    }

    const neighborhoodName = (parcel?.neighborhoods as unknown as { name: string } | null)?.name ?? ''
    const blockNo = (parcel?.blocks as unknown as { block_no: string } | null)?.block_no ?? ''

    const emailBody = buildEmailHtml({
      companyName: company.name,
      contactPerson: company.contact_person,
      parcelNo: parcel?.parcel_no ?? '',
      neighborhoodName,
      blockNo,
      positiveRatio: parcel?.positive_ratio ?? null,
      positiveCount: parcel?.positive_count ?? 0,
      totalUnits: parcel?.total_units ?? 0,
      customNote,
    })

    try {
      if (resendApiKey) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Dönüşüm Haritası <noreply@donusumharitasi.com>',
            to: [company.email],
            subject: `Kentsel Dönüşüm Bilgilendirmesi — Parsel ${parcel?.parcel_no}`,
            html: emailBody,
          }),
        })

        if (!emailRes.ok) {
          const err = await emailRes.text()
          results.push({ companyId: company.id, success: false, error: err })
          continue
        }
      }

      await supabase.from('company_notifications').insert({
        company_id: company.id,
        parcel_id: parcelId,
        sent_by: sentById,
        email_body: emailBody,
        status: resendApiKey ? 'sent' : 'pending',
      })

      results.push({ companyId: company.id, success: true })
    } catch (err) {
      results.push({
        companyId: company.id,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ results })
}

function buildEmailHtml(opts: {
  companyName: string
  contactPerson: string | null
  parcelNo: string
  neighborhoodName: string
  blockNo: string
  positiveRatio: number | null
  positiveCount: number
  totalUnits: number
  customNote?: string
}) {
  const ratioText =
    opts.positiveRatio !== null
      ? `${Math.round(opts.positiveRatio * 100)}%`
      : 'Veri yok'

  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <h2 style="color: #111; margin-bottom: 4px;">Kentsel Dönüşüm Bilgilendirmesi</h2>
  <p style="color: #666; margin-top: 0;">Sayın ${opts.contactPerson ?? opts.companyName},</p>

  <p>Aşağıdaki parsele ilişkin güncel saha bilgileri tarafınızla paylaşılmaktadır.</p>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <tr style="background: #f9fafb;">
      <td style="padding: 10px 16px; font-size: 13px; color: #666; border-bottom: 1px solid #e5e7eb;">Mahalle</td>
      <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${opts.neighborhoodName}</td>
    </tr>
    <tr>
      <td style="padding: 10px 16px; font-size: 13px; color: #666; border-bottom: 1px solid #e5e7eb;">Ada No</td>
      <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${opts.blockNo}</td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 10px 16px; font-size: 13px; color: #666; border-bottom: 1px solid #e5e7eb;">Parsel No</td>
      <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${opts.parcelNo}</td>
    </tr>
    <tr>
      <td style="padding: 10px 16px; font-size: 13px; color: #666; border-bottom: 1px solid #e5e7eb;">Toplam BB</td>
      <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${opts.totalUnits}</td>
    </tr>
    <tr style="background: #f9fafb;">
      <td style="padding: 10px 16px; font-size: 13px; color: #666;">Olumlu Görüş</td>
      <td style="padding: 10px 16px; font-size: 13px; font-weight: 600;">${opts.positiveCount} bağımsız bölüm (${ratioText})</td>
    </tr>
  </table>

  ${opts.customNote ? `<p style="background: #f9fafb; border-left: 3px solid #6366f1; padding: 12px 16px; border-radius: 4px; font-size: 13px;">${opts.customNote}</p>` : ''}

  <p style="font-size: 12px; color: #9ca3af; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
    Bu e-posta Dönüşüm Haritası sistemi tarafından otomatik olarak gönderilmiştir.
  </p>
</body>
</html>`
}
