import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'Price N/A'
  return `HK$${price.toLocaleString()}`
}

export function timeAgo(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, 'MMM d, yyyy HH:mm')
  } catch {
    return dateStr
  }
}

export function isRecentListing(dateStr: string): boolean {
  try {
    const date = parseISO(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    return diffMs < 60 * 60 * 1000 // less than 1 hour
  } catch {
    return false
  }
}

export function minutesToHuman(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  if (minutes === 60) return '1h'
  if (minutes < 1440) return `${minutes / 60}h`
  return `${minutes / 1440}d`
}

export function getNextRunTime(lastRunAt: string | null, intervalMinutes: number): string {
  if (!lastRunAt) return 'Not run yet'
  try {
    const last = parseISO(lastRunAt)
    const next = new Date(last.getTime() + intervalMinutes * 60 * 1000)
    const now = new Date()
    if (next <= now) return 'Due now'
    return formatDistanceToNow(next, { addSuffix: false }) + ' remaining'
  } catch {
    return 'Unknown'
  }
}

export function getDurationSeconds(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return 'Running...'
  try {
    const start = parseISO(startedAt)
    const end = parseISO(finishedAt)
    const diffMs = end.getTime() - start.getTime()
    const secs = Math.round(diffMs / 1000)
    if (secs < 60) return `${secs}s`
    return `${Math.floor(secs / 60)}m ${secs % 60}s`
  } catch {
    return 'N/A'
  }
}
