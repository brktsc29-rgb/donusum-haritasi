'use client'

import { useState } from 'react'
import { useUpdateProfile } from '@/hooks/useProfiles'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { Profile, UserRole } from '@/types'

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  field: 'Saha',
  company: 'Firma',
}

const roleBadge: Record<UserRole, 'default' | 'secondary' | 'orange'> = {
  admin: 'default',
  field: 'secondary',
  company: 'orange',
}

interface Props {
  profiles: (Profile & { companies?: { name: string } | null })[]
  companies: { id: string; name: string }[]
}

export function UserManager({ profiles: initial, companies }: Props) {
  const [profiles, setProfiles] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<UserRole>('field')
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null)
  const [editActive, setEditActive] = useState(true)
  const updateProfile = useUpdateProfile()

  const startEdit = (p: Profile & { companies?: { name: string } | null }) => {
    setEditing(p.id)
    setEditRole(p.role)
    setEditCompanyId(p.company_id ?? null)
    setEditActive(p.is_active)
  }

  const cancelEdit = () => setEditing(null)

  const saveEdit = async (id: string) => {
    const updated = await updateProfile.mutateAsync({
      id,
      updates: {
        role: editRole,
        company_id: editRole === 'company' ? editCompanyId : null,
        is_active: editActive,
      },
    })
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)))
    setEditing(null)
  }

  return (
    <div className="space-y-3">
      {profiles.map((profile) => (
        <Card key={profile.id}>
          <CardContent className="pt-4 pb-4">
            {editing === profile.id ? (
              <div className="space-y-3">
                <p className="font-medium">{profile.full_name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Rol</p>
                    <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="field">Saha</SelectItem>
                        <SelectItem value="company">Firma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editRole === 'company' && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Firma</p>
                      <Select
                        value={editCompanyId ?? ''}
                        onValueChange={(v) => setEditCompanyId(v || null)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`active-${profile.id}`}
                    checked={editActive}
                    onCheckedChange={(v) => setEditActive(!!v)}
                  />
                  <label htmlFor={`active-${profile.id}`} className="text-sm cursor-pointer">
                    Aktif kullanıcı
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveEdit(profile.id)}
                    disabled={updateProfile.isPending}
                    className="gap-2"
                  >
                    Kaydet
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{profile.full_name}</p>
                    {!profile.is_active && (
                      <Badge variant="secondary" className="text-xs">Pasif</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={roleBadge[profile.role]} className="text-xs">
                      {roleLabel[profile.role]}
                    </Badge>
                    {profile.companies?.name && (
                      <span className="text-xs text-muted-foreground">{profile.companies.name}</span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => startEdit(profile)}>
                  Düzenle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {profiles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Kullanıcı bulunamadı.</p>
      )}
    </div>
  )
}
