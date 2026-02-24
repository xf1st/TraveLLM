import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a cost string (in any format) to a RUB number.
 * Returns 0 for free/included, null for unknown/unparseable.
 */
export function parseCostRub(cost: string): number | null {
  if (!cost) return null
  const s = cost.toLowerCase().trim()
  if (/бесплат|free|включ|входит|complimentary/.test(s)) return 0
  // range "2 000 – 3 500 ₽" or "~500-800"
  const rangeM = s.match(/(\d[\d\s]*)[\s]*[-–—][\s]*(\d[\d\s]*)/)
  if (rangeM) {
    const lo = parseInt(rangeM[1].replace(/\s/g, ''))
    const hi = parseInt(rangeM[2].replace(/\s/g, ''))
    if (!isNaN(lo) && !isNaN(hi)) return Math.round((lo + hi) / 2)
  }
  const m = s.match(/\d[\d\s]*/)
  if (m) return parseInt(m[0].replace(/\s/g, ''))
  return null
}
