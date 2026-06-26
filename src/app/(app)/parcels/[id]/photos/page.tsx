import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PhotosPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="min-h-full bg-secondary/30">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3 flex items-center gap-3">
        <Link href={`/parcels/${id}`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-semibold">Fotoğraflar</h1>
      </div>
      <div className="p-8 text-center text-muted-foreground text-sm">
        Fotoğraf yönetimi yakında eklenecek.
      </div>
    </div>
  )
}
