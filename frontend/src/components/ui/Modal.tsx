import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: keyof typeof sizes
  description?: string
}

export function Modal({ open, onClose, title, children, size = 'md', description }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full rounded-xl bg-white dark:bg-gray-800 shadow-xl',
            'border border-gray-200 dark:border-gray-700',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'max-h-[90vh] overflow-y-auto scrollbar-thin',
            'mx-4',
            sizes[size]
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close
                onClick={onClose}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
          )}
          <div className="px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
