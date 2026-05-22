import React from 'react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  color?: 'blue' | 'yellow' | 'orange' | 'green' | 'red' | 'purple' | 'teal'
}

const colorClasses: Record<NonNullable<StatsCardProps['color']>, { icon: string; bg: string }> = {
  blue:   { icon: 'text-blue-600',   bg: 'bg-blue-50' },
  yellow: { icon: 'text-yellow-600', bg: 'bg-yellow-50' },
  orange: { icon: 'text-orange-600', bg: 'bg-orange-50' },
  green:  { icon: 'text-green-600',  bg: 'bg-green-50' },
  red:    { icon: 'text-red-600',    bg: 'bg-red-50' },
  purple: { icon: 'text-purple-600', bg: 'bg-purple-50' },
  teal:   { icon: 'text-teal-600',   bg: 'bg-teal-50' },
}

export function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
  const { icon, bg } = colorClasses[color]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'mt-2 text-xs font-medium',
                trend.positive !== false ? 'text-green-600' : 'text-red-500'
              )}
            >
              {trend.positive !== false ? '↑' : '↓'} {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('ml-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', bg)}>
          <Icon className={cn('h-6 w-6', icon)} />
        </div>
      </div>
    </div>
  )
}
