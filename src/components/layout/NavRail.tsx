import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  GraduationCap,
  ListChecks,
  Swords,
  Trophy,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tutorial', label: 'Tutorial', icon: GraduationCap },
  { to: '/problems', label: 'Problems', icon: ListChecks },
  { to: '/battle', label: 'Battle', icon: Swords },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    'group flex h-full flex-col items-center justify-center gap-1 px-2 text-[11px] font-body transition-colors motion-reduce:transition-none md:h-auto md:flex-row md:justify-start md:gap-3 md:rounded-md md:px-3 md:py-2 md:text-sm',
    isActive
      ? 'text-signal md:bg-graphite/30 md:text-signal'
      : 'text-chalk/60 hover:text-chalk md:hover:bg-graphite/20',
  ].join(' ')

export default function NavRail() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 flex h-16 w-full items-stretch justify-around border-t border-graphite/40 bg-ink md:static md:h-screen md:w-56 md:flex-col md:justify-start md:border-r md:border-t-0 md:py-6"
    >
      <div className="hidden px-5 pb-6 md:block">
        <span className="font-display text-lg font-semibold tracking-tight text-chalk">
          CISCODE
        </span>
      </div>

      <ul className="flex w-full items-stretch justify-around md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1 md:flex-none">
            <NavLink to={to} end={to === '/'} className={navLinkClasses}>
              <Icon
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}

        <li className="flex-1 md:hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-[11px] font-body text-chalk/60 transition-colors hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk motion-reduce:transition-none"
          >
            <LogOut
              className="h-5 w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>Log out</span>
          </button>
        </li>
      </ul>

      <div className="hidden md:mt-auto md:block md:px-3">
        {user && (
          <p
            className="truncate px-3 pb-2 font-mono text-[11px] text-graphite"
            title={user.email}
          >
            {user.email}
          </p>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-body text-sm text-chalk/60 transition-colors hover:bg-graphite/20 hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk motion-reduce:transition-none"
        >
          <LogOut
            className="h-5 w-5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>Log out</span>
        </button>
      </div>
    </nav>
  )
}
