import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  return (
    <div className="min-h-full bg-secondary/30">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <h1 className="font-semibold">Ayarlar</h1>
      </div>
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Ad Soyad</p>
          <p className="font-medium">{profile?.full_name ?? '—'}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Rol</p>
          <p className="font-medium capitalize">{profile?.role ?? '—'}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground">Kullanıcı ID</p>
          <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
        </div>
      </div>
    </div>
  )
}
