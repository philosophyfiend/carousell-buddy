import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  disabled,
  className,
}: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      )}
      <RadixSelect.Root value={value} onValueChange={onChange} disabled={disabled}>
        <RadixSelect.Trigger
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border',
            'border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-800',
            'px-3 py-2 text-sm',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-150'
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className={cn(
              'relative z-50 min-w-[8rem] overflow-hidden rounded-md',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'shadow-md',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'relative flex cursor-default select-none items-center rounded-sm',
                    'py-1.5 pl-8 pr-2 text-sm',
                    'text-gray-900 dark:text-gray-100',
                    'outline-none',
                    'focus:bg-brand-50 dark:focus:bg-brand-900/20 focus:text-brand-700 dark:focus:text-brand-300',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <RadixSelect.ItemIndicator>
                      <Check className="h-4 w-4 text-brand-500" />
                    </RadixSelect.ItemIndicator>
                  </span>
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  )
}
