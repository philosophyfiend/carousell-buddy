import { ReactNode, useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  ShoppingBag,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCurrentUser, useLogout } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { CarousellBuddyLogo } from '@/components/CarousellBuddyLogo'

interface NavItem {
  label: string
  to: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'All Items', to: '/items', icon: <ShoppingBag className="h-4 w-4" /> },
  { label: 'Searches', to: '/searches', icon: <Search className="h-4 w-4" /> },
  { label: 'Settings', to: '/settings', icon: <Settings className="h-4 w-4" /> },
]

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}

interface ShellProps {
  children: ReactNode
}

export function Shell({ children }: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { dark, toggle: toggleDark } = useDarkMode()
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const location = useLocation()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-white dark:bg-gray-800',
          'border-r border-gray-200 dark:border-gray-700',
          'transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center px-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <CarousellBuddyLogo iconSize={24} textSize="text-base" />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    )
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User + Logout */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.username ?? 'Loading...'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email ?? ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            className="mt-1 justify-start text-gray-600 dark:text-gray-400"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 lg:px-6 shrink-0">
          <button
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <button
            onClick={toggleDark}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          {sidebarOpen && (
            <button
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
