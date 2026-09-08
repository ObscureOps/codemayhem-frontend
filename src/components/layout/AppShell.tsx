import { Outlet } from 'react-router-dom'
import NavRail from './NavRail'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-chalk text-ink md:flex">
      <NavRail />
      <main className="min-h-screen flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
