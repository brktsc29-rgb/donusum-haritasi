import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Home, Store, TrendingUp, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatRatio } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [parcelsResult, unitsResult] = await Promise.all([
    supabase.from('parcels').select('color_status, positive_ratio, neighborhood_id'),
    supabase.from('units').select('unit_type, decision_status'),
  ])

  const parcels = parcelsResult.data ?? []
  const units = unitsResult.data ?? []

  const stats = {
    totalParcels: parcels.length,
    greenParcels: parcels.filter((p) => p.color_status === 'green').length,
    orangeParcels: parcels.filter((p) => p.color_status === 'orange').length,
    greyParcels: parcels.filter((p) => p.color_status === 'grey').length,
    totalUnits: units.length,
    apartments: units.filter((u) => u.unit_type === 'apartment').length,
    shops: units.filter((u) => u.unit_type === 'shop').length,
    positive: units.filter((u) => u.decision_status === 'positive').length,
    negative: units.filter((u) => u.decision_status === 'negative').length,
    undecided: units.filter((u) => u.decision_status === 'undecided').length,
    noData: units.filter((u) => !u.decision_status).length,
  }

  const overallRatio =
    stats.totalUnits > 0 ? formatRatio(stats.positive / stats.totalUnits) : '—'

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Kağıthane genel durumu</p>
        </div>
        <Link href="/map">
          <Button className="gap-2">
            <MapPin className="h-4 w-4" />
            Haritayı Aç
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium">Toplam Parsel</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold">{stats.totalParcels}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium">Yeşil Parsel</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-green-600">{stats.greenParcels}</p>
            <p className="text-xs text-muted-foreground mt-1">≥%50 olumlu</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium">Turuncu Parsel</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-orange-600">{stats.orangeParcels}</p>
            <p className="text-xs text-muted-foreground mt-1">&lt;%50 olumlu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground font-medium">Veri Yok</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-3xl font-bold text-gray-400">{stats.greyParcels}</p>
            <p className="text-xs text-muted-foreground mt-1">henüz görüş girilmemiş</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bağımsız Bölümler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Home className="h-3.5 w-3.5" /> Daire
              </span>
              <span className="font-semibold">{stats.apartments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Store className="h-3.5 w-3.5" /> Dükkan
              </span>
              <span className="font-semibold">{stats.shops}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-sm font-medium">Toplam</span>
              <span className="font-bold">{stats.totalUnits}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Görüş Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Olumlu</span>
              <Badge variant="green">{stats.positive}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Olumsuz</span>
              <Badge variant="destructive">{stats.negative}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Kararsız</span>
              <Badge variant="secondary">{stats.undecided}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Görüş Girilmemiş</span>
              <Badge variant="grey">{stats.noData}</Badge>
            </div>
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-sm font-medium">Genel Olumlu Oran</span>
              <span className="font-bold text-primary">{overallRatio}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
