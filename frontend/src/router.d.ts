// Augment TanStack Router's FileRoutesByPath so createFileRoute path strings
// are recognized as valid without running the CLI codegen.

import type { Route as rootRoute } from './routes/__root'
import type { Route as IndexImport } from './routes/index'
import type { Route as LoginImport } from './routes/login'
import type { Route as RegisterImport } from './routes/register'
import type { Route as TrackImport } from './routes/track'
import type { Route as DashboardIndexImport } from './routes/dashboard/index'
import type { Route as DashboardShipmentsNewImport } from './routes/dashboard/shipments/new'
import type { Route as DashboardShipmentsIdImport } from './routes/dashboard/shipments/$id'
import type { Route as AdminIndexImport } from './routes/admin/index'
import type { Route as AdminShipmentsIndexImport } from './routes/admin/shipments/index'
import type { Route as AdminShipmentsIdImport } from './routes/admin/shipments/$id'
import type { Route as AdminUsersIndexImport } from './routes/admin/users/index'

declare module '@tanstack/router-core' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/register': {
      id: '/register'
      path: '/register'
      fullPath: '/register'
      preLoaderRoute: typeof RegisterImport
      parentRoute: typeof rootRoute
    }
    '/track': {
      id: '/track'
      path: '/track'
      fullPath: '/track'
      preLoaderRoute: typeof TrackImport
      parentRoute: typeof rootRoute
    }
    '/dashboard/': {
      id: '/dashboard/'
      path: '/dashboard/'
      fullPath: '/dashboard/'
      preLoaderRoute: typeof DashboardIndexImport
      parentRoute: typeof rootRoute
    }
    '/dashboard/shipments/new': {
      id: '/dashboard/shipments/new'
      path: '/dashboard/shipments/new'
      fullPath: '/dashboard/shipments/new'
      preLoaderRoute: typeof DashboardShipmentsNewImport
      parentRoute: typeof rootRoute
    }
    '/dashboard/shipments/$id': {
      id: '/dashboard/shipments/$id'
      path: '/dashboard/shipments/$id'
      fullPath: '/dashboard/shipments/$id'
      preLoaderRoute: typeof DashboardShipmentsIdImport
      parentRoute: typeof rootRoute
    }
    '/admin/': {
      id: '/admin/'
      path: '/admin/'
      fullPath: '/admin/'
      preLoaderRoute: typeof AdminIndexImport
      parentRoute: typeof rootRoute
    }
    '/admin/shipments/': {
      id: '/admin/shipments/'
      path: '/admin/shipments/'
      fullPath: '/admin/shipments/'
      preLoaderRoute: typeof AdminShipmentsIndexImport
      parentRoute: typeof rootRoute
    }
    '/admin/shipments/$id': {
      id: '/admin/shipments/$id'
      path: '/admin/shipments/$id'
      fullPath: '/admin/shipments/$id'
      preLoaderRoute: typeof AdminShipmentsIdImport
      parentRoute: typeof rootRoute
    }
    '/admin/users/': {
      id: '/admin/users/'
      path: '/admin/users/'
      fullPath: '/admin/users/'
      preLoaderRoute: typeof AdminUsersIndexImport
      parentRoute: typeof rootRoute
    }
  }
}
