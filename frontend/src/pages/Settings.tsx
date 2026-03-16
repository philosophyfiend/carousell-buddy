import { useState, useEffect } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Bell,
  User,
  Plus,
  X,
  Send,
  Eye,
  EyeOff,
  MessageSquare,
} from 'lucide-react'
import { Shell } from '@/components/layout/Shell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'
import {
  useNotificationConfig,
  useUpdateNotificationConfig,
  useTestNotification,
} from '@/hooks/useNotifications'
import { useCurrentUser } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const { data: config, isLoading } = useNotificationConfig()
  const updateConfig = useUpdateNotificationConfig()
  const testNotification = useTestNotification()

  const [enabled, setEnabled] = useState(false)
  const [notifyNew, setNotifyNew] = useState(true)
  const [notifyPriceDrop, setNotifyPriceDrop] = useState(false)
  const [threshold, setThreshold] = useState('10')
  const [urls, setUrls] = useState<string[]>([])
  const [newUrl, setNewUrl] = useState('')
  const [testingUrl, setTestingUrl] = useState<string | null>(null)

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled)
      setNotifyNew(config.notify_new_listings)
      setNotifyPriceDrop(config.notify_price_drop)
      setThreshold(config.price_drop_threshold_pct.toString())
      setUrls(config.apprise_urls)
    }
  }, [config])

  const handleAddUrl = () => {
    const trimmed = newUrl.trim()
    if (!trimmed) return
    if (urls.includes(trimmed)) {
      toast.error('URL already added')
      return
    }
    setUrls([...urls, trimmed])
    setNewUrl('')
  }

  const handleRemoveUrl = (url: string) => {
    setUrls(urls.filter((u) => u !== url))
  }

  const handleTest = (url: string) => {
    setTestingUrl(url)
    testNotification.mutate(url, {
      onSettled: () => setTestingUrl(null),
    })
  }

  const handleSave = () => {
    updateConfig.mutate({
      enabled,
      notify_new_listings: notifyNew,
      notify_price_drop: notifyPriceDrop,
      price_drop_threshold_pct: Number(threshold),
      apprise_urls: urls,
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notification Settings</CardTitle>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              label="Enable notifications"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              'space-y-3 transition-opacity',
              !enabled && 'opacity-50 pointer-events-none'
            )}
          >
            <Switch
              checked={notifyNew}
              onCheckedChange={setNotifyNew}
              label="New listings"
              description="Get notified when new listings are found"
            />
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <Switch
                checked={notifyPriceDrop}
                onCheckedChange={setNotifyPriceDrop}
                label="Price drops"
                description="Get notified when listing prices drop"
              />
              {notifyPriceDrop && (
                <div className="mt-3 pl-1">
                  <Input
                    label="Price drop threshold (%)"
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    min="1"
                    max="99"
                    className="w-32"
                    hint="Notify when price drops by at least this percentage"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apprise URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Notification URLs</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add{' '}
            <a
              href="https://github.com/caronc/apprise"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-500 hover:underline"
            >
              Apprise-compatible
            </a>{' '}
            URLs to receive notifications (e.g. Discord webhooks, Telegram, Slack, etc.)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add URL */}
          <div className="flex gap-2">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="e.g. discord://webhook-id/token"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              className="flex-1"
            />
            <Button onClick={handleAddUrl} variant="outline" disabled={!newUrl.trim()}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* URL list */}
          {urls.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic py-3 text-center">
              No notification URLs added yet
            </p>
          ) : (
            <div className="space-y-2">
              {urls.map((url) => (
                <div
                  key={url}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2"
                >
                  <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate font-mono">
                    {url}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(url)}
                    loading={testingUrl === url}
                    disabled={!!testingUrl}
                    className="text-gray-500 hover:text-brand-500 shrink-0"
                  >
                    {testingUrl !== url && <Send className="h-3.5 w-3.5" />}
                    Test
                  </Button>
                  <button
                    onClick={() => handleRemoveUrl(url)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={updateConfig.isPending}>
          Save Settings
        </Button>
      </div>
    </div>
  )
}

// ─── Telegram Tab ─────────────────────────────────────────────────────────────

function TelegramTab() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Telegram Bot</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Receive notifications and run commands via Telegram
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
              To receive Telegram notifications, set <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded text-xs">TELEGRAM_BOT_TOKEN</code> and{' '}
              <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded text-xs">TELEGRAM_CHAT_ID</code> in your <code className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded text-xs">.env</code> file and restart the service.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Supported bot commands:
            </p>
            <div className="space-y-2">
              {[
                { cmd: '/searches', desc: 'List all your saved searches' },
                { cmd: '/run <name>', desc: 'Manually trigger a search by name' },
                { cmd: '/stats <name>', desc: 'Show price statistics for a search' },
              ].map(({ cmd, desc }) => (
                <div
                  key={cmd}
                  className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-4 py-3"
                >
                  <code className="font-mono text-sm text-brand-600 dark:text-brand-400 shrink-0">
                    {cmd}
                  </code>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Account Tab ─────────────────────────────────────────────────────────────

function AccountTab() {
  const { data: user, isLoading } = useCurrentUser()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isChanging, setIsChanging] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!currentPassword) errs.current = 'Current password is required'
    if (!newPassword) errs.new = 'New password is required'
    if (newPassword.length < 8) errs.new = 'Password must be at least 8 characters'
    if (newPassword !== confirmPassword) errs.confirm = 'Passwords do not match'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setIsChanging(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to change password.'
      toast.error(msg)
    } finally {
      setIsChanging(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-md space-y-6">
      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Username
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
              {user?.username}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Email
            </p>
            <p className="text-base text-gray-700 dark:text-gray-300 mt-0.5">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              error={errors.current}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <Input
              label="New Password"
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              error={errors.new}
            />
            <Input
              label="Confirm New Password"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              error={errors.confirm}
            />
            <Button type="submit" loading={isChanging} size="sm">
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Shell>
      <PageHeader
        title="Settings"
        subtitle="Manage your account and notification preferences"
      />

      <Tabs.Root defaultValue="notifications">
        <Tabs.List className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
          {[
            { value: 'notifications', label: 'Notifications', icon: Bell },
            { value: 'telegram', label: 'Telegram Bot', icon: MessageSquare },
            { value: 'account', label: 'Account', icon: User },
          ].map(({ value, label, icon: Icon }) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                'data-[state=active]:border-brand-500 data-[state=active]:text-brand-600 dark:data-[state=active]:text-brand-400',
                'data-[state=inactive]:border-transparent data-[state=inactive]:text-gray-500 dark:data-[state=inactive]:text-gray-400',
                'hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="notifications">
          <NotificationsTab />
        </Tabs.Content>
        <Tabs.Content value="telegram">
          <TelegramTab />
        </Tabs.Content>
        <Tabs.Content value="account">
          <AccountTab />
        </Tabs.Content>
      </Tabs.Root>
    </Shell>
  )
}
