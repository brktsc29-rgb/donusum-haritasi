import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function UnitsPage({ params }: Props) {
  const { id } = await params
  redirect(`/parcels/${id}`)
}
