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
    'cyber-nav-link group relative flex h-full flex-col items-center justify-center gap-1 px-2 font-body text-[11px] transition-none md:h-auto md:flex-row md:justify-start md:gap-3 md:px-4 md:py-3 md:text-sm',
    isActive ? 'cyber-nav-link-active text-signal' : 'text-[#7d8592]',
  ].join(' ')

function LogoMark() {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <span className="absolute h-7 w-7 rounded-full border border-signal/90 rotate-[-26deg]" />
      <span className="absolute h-4 w-7 rounded-full border border-signal/70 rotate-[22deg]" />
      <span className="relative h-2.5 w-4.5 rounded-full bg-signal/90 rotate-[-18deg]" />
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
      className="cyber-nav fixed inset-x-0 bottom-0 z-50 flex h-16 w-full items-stretch border-t border-[#26303c] bg-[#070a0f] md:static md:h-screen md:w-[222px] md:flex-col md:border-r md:border-t-0"
    >
      <div className="cyber-nav-noise pointer-events-none absolute inset-0" />

      <div className="relative hidden px-5 pb-7 pt-6 md:block">
        <div className="flex items-center gap-2.5">
          <LogoMark />

          <div>
            <div className="font-display text-[17px] font-semibold tracking-[0.05em] text-[#edeae2]">
              CISCODE
            </div>

            <div className="mt-0.5 font-mono text-[7px] uppercase tracking-[0.18em] text-[#545d69]">
              coding intelligence
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

              <span className="tracking-[0.01em]">{label}</span>

              <span className="cyber-nav-corner cyber-nav-corner-left" />
              <span className="cyber-nav-corner cyber-nav-corner-right" />
            </NavLink>
          </li>
        ))}

        <li className="flex-1 md:hidden">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 font-body text-[11px] text-[#7d8592] transition-none hover:text-[#edeae2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
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
        <div className="mb-4 h-px bg-[#1e2630]" />

        {user && (
          <div className="mb-2 px-2.5">
            <div className="font-mono text-[7px] uppercase tracking-[0.16em] text-[#4d5663]">
              operator
            </div>

            <p
              className="mt-1 truncate font-mono text-[10px] text-[#707987]"
              title={user.email}
            >
              {user.email}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left font-body text-sm text-[#747d89] transition-none hover:bg-white/[0.025] hover:text-[#edeae2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
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
