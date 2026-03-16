import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Shell } from '@/components/layout/Shell'
import { PageHeader } from '@/components/layout/PageHeader'
import { SearchCard } from '@/components/searches/SearchCard'
import { SearchForm } from '@/components/searches/SearchForm'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { SearchCardSkeleton } from '@/components/ui/Skeleton'
import {
  useSearches,
  useCreateSearch,
  useUpdateSearch,
  useDeleteSearch,
  useRunSearch,
} from '@/hooks/useSearches'
import type { SavedSearch, SearchFormValues } from '@/types'

export default function SearchesPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editSearch, setEditSearch] = useState<SavedSearch | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: searches = [], isLoading } = useSearches()
  const createSearch = useCreateSearch()
  const updateSearch = useUpdateSearch()
  const deleteSearch = useDeleteSearch()
  const runSearch = useRunSearch()

  const handleCreate = (values: SearchFormValues) => {
    createSearch.mutate(values, {
      onSuccess: () => setFormOpen(false),
    })
  }

  const handleEdit = (values: SearchFormValues) => {
    if (!editSearch) return
    updateSearch.mutate(
      { id: editSearch.id, data: values },
      { onSuccess: () => setEditSearch(null) }
    )
  }

  const handleDelete = () => {
    if (!deleteId) return
    deleteSearch.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    })
  }

  const handleRun = (id: string) => {
    setRunningId(id)
    runSearch.mutate(id, {
      onSettled: () => setRunningId(null),
    })
  }

  const handleToggle = (id: string, enabled: boolean) => {
    setTogglingId(id)
    updateSearch.mutate(
      { id, data: { enabled } },
      { onSettled: () => setTogglingId(null) }
    )
  }

  return (
    <Shell>
      <PageHeader
        title="My Searches"
        subtitle={`${searches.length} saved ${searches.length === 1 ? 'search' : 'searches'}`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Search
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SearchCardSkeleton key={i} />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No searches yet"
          description="Create your first search to start tracking listings on Carousell."
          action={{ label: 'Create your first search', onClick: () => setFormOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {searches.map((search) => (
            <SearchCard
              key={search.id}
              search={search}
              onEdit={setEditSearch}
              onDelete={setDeleteId}
              onRun={handleRun}
              onToggle={handleToggle}
              isRunning={runningId === search.id}
              isToggling={togglingId === search.id}
            />
          ))}
        </div>
      )}

      {/* Create form */}
      <SearchForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        isLoading={createSearch.isPending}
      />

      {/* Edit form */}
      <SearchForm
        open={!!editSearch}
        onClose={() => setEditSearch(null)}
        onSubmit={handleEdit}
        isLoading={updateSearch.isPending}
        editSearch={editSearch}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Search"
        description="Are you sure you want to delete this search? All associated listings and run history will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
        loading={deleteSearch.isPending}
      />
    </Shell>
  )
}
