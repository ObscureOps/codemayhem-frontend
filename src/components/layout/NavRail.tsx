import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  GraduationCap,
  ListChecks,
  Swords,
  Trophy,
  ShieldCheck,
  Terminal,
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
  { to: '/security', label: 'Security', icon: ShieldCheck },
  { to: '/freestyle', label: 'Freestyle', icon: Terminal },
]

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  [
    'cyber-nav-link group relative flex h-full flex-col items-center justify-center gap-1 px-2 font-body text-[11px] transition-[background-color,color,border-color] duration-200 motion-reduce:transition-none md:h-auto md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm',
    isActive
      ? 'cyber-nav-link-active text-signal'
      : 'text-[#a7b8ca] hover:text-[#edf5ff] hover:bg-[#0d1a29]',
  ].join(' ')

function LogoMark() {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <span className="absolute h-7 w-7 rotate-[-26deg] rounded-full border border-signal/90" />
      <span className="absolute h-4 w-7 rotate-[22deg] rounded-full border border-signal/70" />
      <span className="relative h-2.5 w-[1.125rem] rotate-[-18deg] rounded-full bg-signal/90" />
    </div>
  )
}

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
      className="cyber-nav fixed inset-x-0 bottom-0 z-50 flex h-16 w-full items-stretch border-t border-[#233b56] bg-[#07111d] md:static md:h-screen md:w-[222px] md:flex-col md:border-r md:border-t-0"
    >
      <div className="cyber-nav-noise pointer-events-none absolute inset-0" />

      <div className="relative hidden px-5 pb-7 pt-6 md:block">
        <div className="flex items-center gap-2.5">
          <LogoMark />

          <div>
            <div className="font-display text-[17px] font-semibold tracking-[0.05em] text-[#edf5ff]">
              CODEMAYHEM
            </div>

            <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.18em] text-[#7f96ad]">
              code · learn · compete
            </div>
          </div>
        </div>
      </div>

      <ul className="relative flex w-full items-stretch justify-around md:flex-col md:items-stretch md:justify-start md:gap-1 md:px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1 md:flex-none">
            <NavLink
              to={to}
              end={to === '/'}
              className={navLinkClasses}
            >
              <Icon
                className="h-[18px] w-[18px]"
                strokeWidth={1.65}
                aria-hidden="true"
              />

              <span className="tracking-[0.01em]">
                {label}
              </span>

              <span className="cyber-nav-corner cyber-nav-corner-left" />
              <span className="cyber-nav-corner cyber-nav-corner-right" />
            </NavLink>
          </li>
        ))}

        <li className="flex-1 md:hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 font-body text-[11px] text-[#a7b8ca] transition-[color,background-color] duration-200 hover:bg-[#0d1a29] hover:text-[#edf5ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transition-none"
          >
            <LogOut
              className="h-[18px] w-[18px]"
              strokeWidth={1.65}
              aria-hidden="true"
            />

            <span>Log out</span>
          </button>
        </li>
      </ul>

      <div className="relative hidden md:mt-auto md:block md:px-3 md:pb-5">
        <div className="mb-4 h-px bg-[#21364e]" />

        {user && (
          <div className="mb-2 px-2.5">
            <div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#7188a0]">
              operator
            </div>

            <p
              className="mt-1 truncate font-mono text-[10px] text-[#a6b8ca]"
              title={user.email}
            >
              {user.email}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left font-body text-sm text-[#9cafc2] transition-[background-color,color] duration-200 hover:bg-[#0d1a29] hover:text-[#edf5ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transition-none"
        >
          <LogOut
            className="h-[18px] w-[18px]"
            strokeWidth={1.65}
            aria-hidden="true"
          />

          <span>Log out</span>
        </button>
      </div>
    </nav>
  )
}
