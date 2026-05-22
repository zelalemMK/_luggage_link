import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { Toaster } from 'react-hot-toast'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#1e3a8a',
            color: '#fff',
            fontSize: '14px',
          },
          success: {
            style: {
              background: '#065f46',
            },
            iconTheme: {
              primary: '#34d399',
              secondary: '#fff',
            },
          },
          error: {
            style: {
              background: '#991b1b',
            },
            iconTheme: {
              primary: '#fca5a5',
              secondary: '#fff',
            },
          },
        }}
      />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </>
  )
}
