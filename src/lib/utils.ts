import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ColorStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateColorStatus(
  positiveCount: number,
  totalUnits: number
): ColorStatus {
  if (totalUnits === 0) return 'grey'
  const ratio = positiveCount / totalUnits
  return ratio >= 0.5 ? 'green' : 'orange'
}

export function colorStatusToHex(status: ColorStatus): string {
  switch (status) {
    case 'green':
      return '#22c55e'
    case 'orange':
      return '#f97316'
    case 'grey':
    default:
      return '#9ca3af'
  }
}

export function formatRatio(ratio: number | null): string {
  if (ratio === null) return '—'
  return `%${Math.round(ratio * 100)}`
}

export function generateAutoParcelCode(neighborhoodName: string, sequence: number): string {
  const slug = neighborhoodName
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/\s+/g, '')
  return `${slug}-AUTO-${String(sequence).padStart(3, '0')}`
}
