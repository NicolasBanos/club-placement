import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, Trophy, ClipboardList, List, FileCheck, CalendarCheck, BarChart2, MessageSquare, Upload, LogOut, ChevronDown, UserPlus, School } from 'lucide-react'
import theme from '../theme'

const coordinatorLinks = [
  { label: 'Dashboard', icon: Home, path: '/coordinator' },
  { label: 'Clubs', icon: School, path: '/coordinator/clubs' },
  { label: 'Lottery', icon: Trophy, path: '/coordinator/lottery' },
  { label: 'Assignments', icon: ClipboardList, path: '/coordinator/assignments' },
  { label: 'Waitlist', icon: List, path: '/coordinator/waitlist' },
  { label: 'Excuses', icon: FileCheck, path: '/coordinator/excuses' },
  { label: 'Attendance', icon: CalendarCheck, path: '/coordinator/attendance' },
  { label: 'Reports', icon: BarChart2, path: '/coordinator/reports' },
  { label: 'Messages', icon: MessageSquare, path: '/coordinator/messages', badge: 3 },
  { label: 'Import Data', icon: Upload, path: '/coordinator/import' },
]

const teacherLinks = [
  { label: 'Dashboard', icon: Home, path: '/teacher' },
  { label: 'My Club', icon: School, path: '/teacher/club' },
  { label: 'All Clubs', icon: ClipboardList, path: '/teacher/all-clubs' },
  { label: 'Attendance', icon: CalendarCheck, path: '/teacher/attendance' },
  { label: 'Messages', icon: MessageSquare, path: '/teacher/messages' },
  { label: 'Students', icon: Users, path: '/teacher/students' },
]

const parentLinks = [
  { label: 'Dashboard', icon: Home, path: '/parent' },
  { label: 'My Children', icon: Users, path: '/parent/children' },
  { label: 'Excuses', icon: FileCheck, path: '/parent/excuses' },
  { label: 'Pickup Info', icon: ClipboardList, path: '/parent/pickup' },
  { label: 'Messages', icon: MessageSquare, path: '/parent/messages' },
]

function OwlLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="10" r="7" fill="#1a5c1a"/>
      <circle cx="10" cy="9" r="3" fill="white"/>
      <circle cx="16" cy="9" r="3" fill="white"/>
      <circle cx="10.5" cy="9.5" r="1.5" fill="#1a5c1a"/>
      <circle cx="16.5" cy="9.5" r="1.5" fill="#1a5c1a"/>
      <circle cx="11" cy="9" r="0.6" fill="white"/>
      <circle cx="17" cy="9" r="0.6" fill="white"/>
      <polygon points="12,11 14,11 13,13" fill="#F9A825"/>
      <path d="M9 6 Q10 4 11 6" stroke="white" strokeWidth="1" fill="none"/>
      <path d="M15 6 Q16 4 17 6" stroke="white" strokeWidth="1" fill="none"/>
      <path d="M8 14 Q6 16 8 18 Q10 21 13 22 Q16 21 18 18 Q20 16 18 14 Q16 12 13 13 Q10 12 8 14Z" fill="#2e7d32"/>
    </svg>
  )
}

function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = localStorage.getItem('role')
  const firstName = localStorage.getItem('first_name')

  const getInitial = () => firstName ? firstName[0].toUpperCase() : '?'

  const getRoleLabel = () => {
    if (role === 'coordinator') return 'COORDINATOR'
    if (role === 'teacher') return 'TEACHER'
    return 'PARENT'
  }

  const getLinks = () => {
    if (role === 'coordinator') return coordinatorLinks
    if (role === 'teacher') return teacherLinks
    return parentLinks
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('first_name')
    navigate('/login')
  }

  return (
    <div style={styles.sidebar}>

      {/* Logo */}
      <div style={styles.logoArea}>
        <div style={styles.owlBadge}>
          <OwlLogo size={28} />
        </div>
        <div>
          <div style={styles.appName}>ClubsForKids</div>
          <div style={styles.tagline}>After school, made easy.</div>
        </div>
      </div>

      {/* School badge */}
      <div style={styles.schoolBadge}>
        <div style={styles.schoolDot}>
          <OwlLogo size={12} />
        </div>
        <span style={styles.schoolName}>Plantation Park Elementary</span>
      </div>

      {/* User */}
      <div style={styles.userArea}>
        <div style={styles.avatar}>{getInitial()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.userName}>{firstName}</div>
          <div style={styles.roleBadge}>{getRoleLabel()}</div>
        </div>
        <ChevronDown size={14} color="rgba(255,255,255,0.3)" />
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        <div style={styles.navLabel}>MAIN MENU</div>
        {getLinks().map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.path
          return (
            <div
              key={link.path}
              onClick={() => navigate(link.path)}
              style={isActive ? styles.navItemActive : styles.navItem}
            >
              <Icon size={18} color={isActive ? theme.colors.secondary : 'rgba(255,255,255,0.5)'} />
              <span style={isActive ? styles.navTextActive : styles.navText}>
                {link.label}
              </span>
              {link.badge && (
                <div style={styles.badge}>{link.badge}</div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div style={styles.logoutArea} onClick={handleLogout}>
        <LogOut size={16} color="rgba(255,255,255,0.3)" />
        <span style={styles.logoutText}>Sign out</span>
      </div>

    </div>
  )
}

const styles = {
  sidebar: {
    width: '260px',
    minHeight: '100vh',
    backgroundColor: theme.colors.sidebarBg,
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  logoArea: {
    padding: '24px 20px 18px',
    borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  owlBadge: {
    width: '48px',
    height: '48px',
    backgroundColor: theme.colors.secondary,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  appName: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '800',
    lineHeight: '1.1',
    fontFamily: theme.fonts.primary,
    letterSpacing: '-0.3px',
  },
  tagline: {
    color: theme.colors.secondary,
    fontSize: '10px',
    fontWeight: '500',
    fontFamily: theme.fonts.primary,
    marginTop: '2px',
  },
  schoolBadge: {
    margin: '12px 16px',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: '8px',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  schoolDot: {
    width: '20px',
    height: '20px',
    backgroundColor: theme.colors.secondary,
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  schoolName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '11px',
    fontFamily: theme.fonts.primary,
  },
  userArea: {
    padding: '14px 20px',
    borderBottom: `1px solid ${theme.colors.sidebarBorder}`,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    backgroundColor: theme.colors.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '15px',
    fontWeight: '800',
    color: theme.colors.primary,
    flexShrink: 0,
    fontFamily: theme.fonts.primary,
  },
  userName: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: theme.fonts.primary,
  },
  roleBadge: {
    backgroundColor: theme.colors.secondary,
    color: theme.colors.primary,
    fontSize: '9px',
    fontWeight: '800',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'inline-block',
    marginTop: '2px',
    fontFamily: theme.fonts.primary,
    letterSpacing: '0.05em',
  },
  nav: {
    flex: 1,
    padding: '10px 0',
    overflowY: 'auto',
  },
  navLabel: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.25)',
    fontWeight: '700',
    letterSpacing: '0.1em',
    padding: '10px 20px 6px',
    fontFamily: theme.fonts.primary,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '2px 10px',
    padding: '11px 12px',
    borderRadius: '9px',
    cursor: 'pointer',
  },
  navItemActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '2px 10px',
    padding: '11px 12px',
    borderRadius: '9px',
    cursor: 'pointer',
    backgroundColor: theme.colors.sidebarActive,
    border: `1px solid ${theme.colors.sidebarActiveBorder}`,
  },
  navText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    fontFamily: theme.fonts.primary,
  },
  navTextActive: {
    color: theme.colors.secondary,
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: theme.fonts.primary,
  },
  badge: {
    marginLeft: 'auto',
    backgroundColor: '#ef5350',
    color: 'white',
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '8px',
    fontFamily: theme.fonts.primary,
  },
  logoutArea: {
    padding: '16px 20px',
    borderTop: `1px solid ${theme.colors.sidebarBorder}`,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  logoutText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '13px',
    fontFamily: theme.fonts.primary,
  },
}

export default Sidebar