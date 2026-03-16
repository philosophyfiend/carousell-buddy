import * as RadixSwitch from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id,
}: SwitchProps) {
  const switchId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <label
              htmlFor={switchId}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
          )}
        </div>
      )}
      <RadixSwitch.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full',
          'border-2 border-transparent transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-brand-500',
          'data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600'
        )}
      >
        <RadixSwitch.Thumb
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-md',
            'ring-0 transition-transform duration-200',
            'data-[state=checked]:translate-x-4',
            'data-[state=unchecked]:translate-x-0'
          )}
        />
      </RadixSwitch.Root>
    </div>
  )
}
