import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  secondary: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  outline: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
