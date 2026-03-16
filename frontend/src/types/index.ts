export interface User {
  id: string
  username: string
  email: string
  is_active: boolean
  created_at: string
}

export interface Token {
  access_token: string
  refresh_token: string
  token_type: string
}

export type Condition = 'NEW' | 'USED' | 'BOTH'
export type SortBy = 'newest' | 'price_asc' | 'price_desc'
export type ListingStatus = 'active' | 'sold' | 'deleted'
export type ScrapeRunStatus = 'running' | 'ok' | 'error'

export interface SavedSearch {
  id: string
  user_id: string
  name: string
  keyword: string
  category_id: string | null
  category_name: string | null
  brand_filters: string[]
  size_filters: string[]
  condition: Condition
  min_price: number | null
  max_price: number | null
  sort_by: SortBy
  interval_minutes: number
  enabled: boolean
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface ScrapeRun {
  id: string
  search_id: string
  started_at: string
  finished_at: string | null
  status: ScrapeRunStatus
  listings_found: number
  new_listings: number
  error_message: string | null
}

export interface Listing {
  id: string
  carousell_id: string
  search_id: string
  title: string
  price: number | null
  condition: string | null
  seller_name: string | null
  seller_url: string | null
  listing_url: string
  image_url: string | null
  description: string | null
  status: ListingStatus
  first_seen_at: string
  last_seen_at: string
  sold_at: string | null
}

export interface PaginatedListings {
  items: Listing[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface NotificationConfig {
  id: string
  user_id: string
  apprise_urls: string[]
  notify_new_listings: boolean
  notify_price_drop: boolean
  price_drop_threshold_pct: number
  enabled: boolean
}

export interface PriceStats {
  count: number
  min: number
  max: number
  mean: number
  median: number
  p10: number
  p25: number
  p75: number
  p90: number
}

export interface SearchFormValues {
  name: string
  keyword: string
  category_id?: string
  category_name?: string
  brand_filters: string[]
  size_filters: string[]
  condition: Condition
  min_price: number | null
  max_price: number | null
  sort_by: SortBy
  interval_minutes: number
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
}
