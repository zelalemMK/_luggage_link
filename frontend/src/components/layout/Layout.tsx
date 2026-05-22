import { Outlet } from '@tanstack/react-router'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'

/** Public layout — just navbar + main content */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-100 bg-white py-6 text-center text-xs text-gray-400">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-2 flex justify-center">
            <div className="h-1 w-32 rounded-full" style={{ background: 'linear-gradient(to right, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%)' }} />
          </div>
          &copy; {new Date().getFullYear()} Luggage Link. All rights reserved.
          &nbsp;&nbsp;|&nbsp;&nbsp;Shipping from the US to Ethiopia with care.
        </div>
      </footer>
    </div>
  )
}

/** App shell layout — sidebar + content area (dashboard / admin) */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
