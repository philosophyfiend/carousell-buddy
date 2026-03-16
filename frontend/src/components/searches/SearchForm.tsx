import { useState, useEffect, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { SavedSearch, SearchFormValues, Condition, SortBy } from '@/types'

interface SearchFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: SearchFormValues) => void
  isLoading?: boolean
  editSearch?: SavedSearch | null
}

const intervalOptions = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '180', label: '3 hours' },
  { value: '360', label: '6 hours' },
  { value: '720', label: '12 hours' },
  { value: '1440', label: '24 hours' },
]

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[]
  onAdd: (tag: string) => void
  onRemove: (tag: string) => void
  placeholder?: string
}) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && input.trim()) {
      e.preventDefault()
      onAdd(input.trim())
      setInput('')
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }

  return (
    <div className="min-h-[38px] w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition-colors">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs px-2 py-0.5"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="hover:text-brand-900 dark:hover:text-brand-200"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
      />
    </div>
  )
}

export function SearchForm({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  editSearch,
}: SearchFormProps) {
  const [name, setName] = useState(editSearch?.name ?? '')
  const [keyword, setKeyword] = useState(editSearch?.keyword ?? '')
  const [categoryInput, setCategoryInput] = useState(
    editSearch?.category_id
      ? `https://www.carousell.com.hk/categories/${editSearch.category_name ?? 'category'}-${editSearch.category_id}/`
      : (editSearch?.category_name ?? '')
  )
  const [brandFilters, setBrandFilters] = useState<string[]>(editSearch?.brand_filters ?? [])
  const [sizeFilters, setSizeFilters] = useState<string[]>(editSearch?.size_filters ?? [])
  const [condition, setCondition] = useState<Condition>(editSearch?.condition ?? 'BOTH')
  const [minPrice, setMinPrice] = useState<string>(editSearch?.min_price?.toString() ?? '')
  const [maxPrice, setMaxPrice] = useState<string>(editSearch?.max_price?.toString() ?? '')
  const [sortBy, setSortBy] = useState<SortBy>(editSearch?.sort_by ?? 'newest')
  const [intervalMinutes, setIntervalMinutes] = useState<string>(
    editSearch?.interval_minutes?.toString() ?? '60'
  )

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setName(editSearch?.name ?? '')
    setKeyword(editSearch?.keyword ?? '')
    setCategoryInput(
      editSearch?.category_id
        ? `https://www.carousell.com.hk/categories/${editSearch.category_name ?? 'category'}-${editSearch.category_id}/`
        : (editSearch?.category_name ?? '')
    )
    setBrandFilters(editSearch?.brand_filters ?? [])
    setSizeFilters(editSearch?.size_filters ?? [])
    setCondition(editSearch?.condition ?? 'BOTH')
    setMinPrice(editSearch?.min_price?.toString() ?? '')
    setMaxPrice(editSearch?.max_price?.toString() ?? '')
    setSortBy(editSearch?.sort_by ?? 'newest')
    setIntervalMinutes(editSearch?.interval_minutes?.toString() ?? '60')
  }, [editSearch])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!keyword.trim()) errs.keyword = 'Keyword is required'
    return errs
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})

    // Parse category: accept full Carousell URL or bare numeric ID
    let categoryId: string | undefined
    let categoryName: string | undefined
    const catInput = categoryInput.trim()
    if (catInput) {
      const urlMatch = catInput.match(/\/categories\/(.+?)-(\d+)(?:[/?].*)?$/)
      if (urlMatch) {
        categoryName = urlMatch[1].replace(/-/g, ' ')
        categoryId = urlMatch[2]
      } else if (/^\d+$/.test(catInput)) {
        categoryId = catInput
      } else {
        categoryName = catInput
      }
    }

    onSubmit({
      name: name.trim(),
      keyword: keyword.trim(),
      category_id: categoryId,
      category_name: categoryName,
      brand_filters: brandFilters,
      size_filters: sizeFilters,
      condition,
      min_price: minPrice ? Number(minPrice) : null,
      max_price: maxPrice ? Number(maxPrice) : null,
      sort_by: sortBy,
      interval_minutes: Number(intervalMinutes),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editSearch ? 'Edit Search' : 'Create New Search'}
      description="Configure what to search for on Carousell"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Search Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nike Air Max"
            error={errors.name}
          />
          <Input
            label="Keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="e.g. nike air max 90"
            error={errors.keyword}
          />
        </div>

        <Input
          label="Category (optional)"
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          placeholder="Paste Carousell category URL or numeric ID"
          hint="Browse carousell.com.hk/categories/, open a category, paste its URL here"
        />

        {/* Brand filters */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Brand Filters{' '}
            <span className="font-normal text-gray-400">(press Enter to add)</span>
          </label>
          <TagInput
            tags={brandFilters}
            onAdd={(b) => setBrandFilters([...brandFilters, b])}
            onRemove={(b) => setBrandFilters(brandFilters.filter((x) => x !== b))}
            placeholder="e.g. Nike, Adidas..."
          />
        </div>

        {/* Size filters */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Size Filters{' '}
            <span className="font-normal text-gray-400">(press Enter to add)</span>
          </label>
          <TagInput
            tags={sizeFilters}
            onAdd={(s) => setSizeFilters([...sizeFilters, s])}
            onRemove={(s) => setSizeFilters(sizeFilters.filter((x) => x !== s))}
            placeholder="e.g. US10, L, 42..."
          />
        </div>

        {/* Condition */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            Condition
          </label>
          <div className="flex items-center gap-4">
            {(['BOTH', 'NEW', 'USED'] as Condition[]).map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={c}
                  checked={condition === c}
                  onChange={() => setCondition(c)}
                  className="accent-brand-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {c === 'BOTH' ? 'Both' : c === 'NEW' ? 'New only' : 'Used only'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Price range */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min Price (HKD)"
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="e.g. 100"
            min="0"
          />
          <Input
            label="Max Price (HKD)"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="e.g. 2000"
            min="0"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Sort By"
            options={sortOptions}
            value={sortBy}
            onChange={(v) => setSortBy(v as SortBy)}
          />
          <Select
            label="Check Interval"
            options={intervalOptions}
            value={intervalMinutes}
            onChange={setIntervalMinutes}
          />
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {editSearch ? 'Save Changes' : 'Create Search'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
