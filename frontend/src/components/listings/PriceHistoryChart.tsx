import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { usePriceHistory } from '@/hooks/useListings'
import { formatPrice } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { TrendingUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface PriceHistoryChartProps {
  listingId: string
}

export function PriceHistoryChart({ listingId }: PriceHistoryChartProps) {
  const { data, isLoading } = usePriceHistory(listingId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    )
  }

  if (!data || data.history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500">
        <TrendingUp className="h-8 w-8 mb-2" />
        <p className="text-sm">No price history recorded yet</p>
        <p className="text-xs mt-1">Price changes will appear here after future scrapes</p>
      </div>
    )
  }

  const chartData = data.history.map((point) => ({
    date: format(parseISO(point.recorded_at), 'MMM d'),
    fullDate: format(parseISO(point.recorded_at), 'MMM d, yyyy HH:mm'),
    price: point.price,
  }))

  // If only one data point, add the current price as a second point to show a line
  if (chartData.length === 1 && data.current_price != null) {
    chartData.push({
      date: 'Now',
      fullDate: 'Current',
      price: data.current_price,
    })
  }

  const prices = chartData.map((d) => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const padding = Math.max(Math.round((maxPrice - minPrice) * 0.1), 1)

  const priceChange = chartData.length >= 2
    ? chartData[chartData.length - 1].price - chartData[0].price
    : 0

  return (
    <div>
      {priceChange !== 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`text-sm font-medium ${priceChange < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
          >
            {priceChange < 0 ? '↓' : '↑'} {formatPrice(Math.abs(priceChange))}
            {' '}since first seen
          </span>
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="text-gray-500"
          />
          <YAxis
            domain={[minPrice - padding, maxPrice + padding]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `$${v}`}
            className="text-gray-500"
            width={60}
          />
          <Tooltip
            formatter={(value: number) => [formatPrice(value), 'Price']}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.fullDate ?? ''
            }
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '13px',
            }}
          />
          <Line
            type="stepAfter"
            dataKey="price"
            stroke="#4DB6AC"
            strokeWidth={2}
            dot={{ fill: '#4DB6AC', r: 4 }}
            activeDot={{ r: 6, fill: '#4DB6AC' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
