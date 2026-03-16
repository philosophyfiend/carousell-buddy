import { ComponentType } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-gray-100 dark:bg-gray-800 p-4">
          <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}
