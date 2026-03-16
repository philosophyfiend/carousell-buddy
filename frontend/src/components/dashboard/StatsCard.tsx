import { ComponentType } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface StatsCardProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
  trend?: {
    value: number
    label?: string
  }
  color?: 'orange' | 'green' | 'blue' | 'purple'
  isLoading?: boolean
}

const colorMap = {
  orange: {
    icon: 'text-brand-500',
    bg: 'bg-brand-50 dark:bg-brand-900/20',
  },
  green: {
    icon: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  blue: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  purple: {
    icon: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'orange',
  isLoading = false,
}: StatsCardProps) {
  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-11 w-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </Card>
    )
  }

  const colors = colorMap[color]

  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', colors.bg)}>
          <Icon className={cn('h-5 w-5', colors.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {trend.value > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : trend.value < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend.value > 0 && 'text-green-500',
              trend.value < 0 && 'text-red-500',
              trend.value === 0 && 'text-gray-400'
            )}
          >
            {trend.value > 0 ? '+' : ''}{trend.value}
          </span>
          {trend.label && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{trend.label}</span>
          )}
        </div>
      )}
    </Card>
  )
}
