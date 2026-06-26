import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserManager } from '@/components/admin/UserManager'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') notFound()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, companies(name)')
    .order('full_name')

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-full bg-secondary/30">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <h1 className="font-semibold">Kullanıcı Yönetimi</h1>
      </div>
      <div className="p-4 max-w-3xl mx-auto">
        <UserManager
          profiles={profiles ?? []}
          companies={(companies ?? []) as { id: string; name: string }[]}
        />
      </div>
    </div>
  )
}
