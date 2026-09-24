import { Outlet, useLocation } from 'react-router-dom'
import NavRail from './NavRail'

export default function AppShell() {
  const location = useLocation()
  const isFreestyle = location.pathname === '/freestyle'

  return (
    <div className="min-h-screen bg-[#070a0f] text-[#e8e5dc] md:flex">
      <NavRail />

      <main
        className={
          isFreestyle
            ? 'min-w-0 flex-1 overflow-hidden pb-16 md:h-screen md:pb-0'
            : 'min-h-screen flex-1 pb-20 md:pb-0'
        }
      >
        {isFreestyle ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
