import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Users, Trophy, ClipboardList, List, FileCheck, CalendarCheck, BarChart2, MessageSquare, Upload, LogOut, ChevronDown, School, UserPlus } from 'lucide-react'
import theme from '../theme'
import ppeLogo from '../assets/ppe-logo.png'

const coordinatorLinks = [
  { label: 'Dashboard', icon: Home, path: '/coordinator' },
  { label: 'Clubs', icon: School, path: '/coordinator/clubs' },
  { label: 'Teachers', icon: UserPlus, path: '/coordinator/teachers' },
  { label: 'Lottery', icon: Trophy, path: '/coordinator/lottery' },
  { label: 'Assignments', icon: ClipboardList, path: '/coordinator/assignments' },
  { label: 'Roster', icon: Users, path: '/coordinator/roster' },
  { label: 'Excuses', icon: FileCheck, path: '/coordinator/excuses' },
  { label: 'Attendance', icon: CalendarCheck, path: '/coordinator/attendance' },
  { label: 'Reports', icon: BarChart2, path: '/coordinator/reports' },
  { label: 'Messages', icon: MessageSquare, path: '/coordinator/messages' },
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
  { label: 'Messages', icon: MessageSquare, path: '/parent/messages' },
]

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
          <img src={ppeLogo} alt="PPE Logo" style={{ width: '44px', height: '44px', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={styles.appName}>ClubsForKids</div>
          <div style={styles.tagline}>After school, made easy.</div>
        </div>
      </div>

      {/* School badge */}
      <div style={styles.schoolBadge}>
        <div style={styles.schoolDot}>
          <img src={ppeLogo} alt="PPE" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
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
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  owlBadge: {
    width: '48px',
    height: '48px',
    backgroundColor: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: '2px',  // reduced from 4px
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
    backgroundColor: 'white',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    padding: '2px',
  },
  schoolName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '11px',
    fontFamily: theme.fonts.primary,
  },
  userArea: {
    padding: '14px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
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
    backgroundColor: 'rgba(249,168,37,0.15)',
    border: '1px solid rgba(249,168,37,0.2)',
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
    borderTop: '1px solid rgba(255,255,255,0.08)',
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