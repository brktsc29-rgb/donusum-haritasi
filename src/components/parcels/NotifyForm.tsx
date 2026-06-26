'use client'

import { useState } from 'react'
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatRatio } from '@/lib/utils'
import type { Parcel } from '@/types'

interface Company {
  id: string
  name: string
  email: string
  contact_person: string | null
}

interface Props {
  parcel: Parcel
  parcelId: string
  neighborhoodName: string
  blockNo: string
  companies: Company[]
  sentById: string
}

interface SendResult {
  companyId: string
  success: boolean
  error?: string
}

export function NotifyForm({ parcel, parcelId, neighborhoodName, blockNo, companies, sentById }: Props) {
  const [selected, setSelected] = useState<string[]>(companies.map((c) => c.id))
  const [customNote, setCustomNote] = useState('')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)

  const toggleCompany = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSend = async () => {
    if (selected.length === 0) return
    setSending(true)
    setResults(null)

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId,
          companyIds: selected,
          customNote,
          sentById,
        }),
      })
      const json = await res.json()
      setResults(json.results ?? [])
    } catch {
      setResults(selected.map((id) => ({ companyId: id, success: false, error: 'Ağ hatası' })))
    } finally {
      setSending(false)
    }
  }

  const allSent = results !== null && results.every((r) => r.success)

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-xs text-muted-foreground">{neighborhoodName} • Ada {blockNo}</p>
          <p className="font-semibold text-lg">Parsel {parcel.parcel_no}</p>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant={parcel.color_status === 'green' ? 'green' : parcel.color_status === 'orange' ? 'orange' : 'grey'}>
              {formatRatio(parcel.positive_ratio)} Olumlu
            </Badge>
            <span className="text-muted-foreground">{parcel.total_units} bağımsız bölüm</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Bildirim Alacak Firmalar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu parsele erişim yetkili ve e-posta adresi olan firma bulunamadı.
            </p>
          ) : (
            companies.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={() => toggleCompany(c.id)}
                  disabled={!!results}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
                {results && (
                  <div>
                    {results.find((r) => r.companyId === c.id)?.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : selected.includes(c.id) ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : null}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label>Ek Not (opsiyonel)</Label>
        <Textarea
          placeholder="E-postaya eklenecek not..."
          rows={3}
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          disabled={!!results}
        />
      </div>

      {allSent && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          ✓ Tüm firmalar başarıyla bilgilendirildi.
        </div>
      )}
      {results && !allSent && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          Bazı firmalar bilgilendirilemedi. Lütfen tekrar deneyin.
        </div>
      )}

      <Button
        className="w-full gap-2"
        onClick={handleSend}
        disabled={sending || selected.length === 0 || allSent || companies.length === 0}
      >
        {sending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {sending ? 'Gönderiliyor...' : `${selected.length} Firmaya Bildirim Gönder`}
      </Button>
    </div>
  )
}
