import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Package,
  Plus,
  Users,
  BarChart3,
  Package2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const customerNav: NavItem[] = [
  { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, exact: true },
  { label: 'My Shipments', to: '/dashboard', icon: Package, exact: true },
  { label: 'Book Shipment', to: '/dashboard/shipments/new', icon: Plus },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: BarChart3, exact: true },
  { label: 'Shipments', to: '/admin/shipments', icon: Package },
  { label: 'Users', to: '/admin/users', icon: Users },
]

function NavLink({ item }: { item: NavItem }) {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname
  const active = item.exact ? pathname === item.to : pathname.startsWith(item.to)
  const Icon = item.icon

  return (
    <Link
      to={item.to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-brand-700 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
      {active && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
    </Link>
  )
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const { isAdmin } = useAuth()
  const navItems = isAdmin ? adminNav : customerNav

  return (
    <aside
      className={cn(
        'flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white px-3 py-6',
        className
      )}
    >
      {/* Logo mark */}
      <div className="mb-6 flex items-center gap-2 px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-700">
          <Package2 className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-brand-900">
          {isAdmin ? 'Admin Panel' : 'My Account'}
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink key={item.to + item.label} item={item} />
        ))}
      </nav>

      {/* Ethiopian color accent strip at bottom */}
      <div className="mt-auto pt-4">
        <div className="h-1 rounded-full" style={{ background: 'linear-gradient(to right, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%)' }} />
        <p className="mt-2 text-center text-xs text-gray-400">Luggage Link &copy; 2025</p>
      </div>
    </aside>
  )
}
