import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { School, Users, Clock, MapPin, Calendar, ClipboardList, CalendarCheck, UserCheck, AlertCircle } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function isToday(iso) {
  if (!iso) return false
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  return iso === todayStr
}

function TeacherDashboard() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const firstName = localStorage.getItem('first_name')

  useEffect(() => {
    api.get('/clubs/mine')
      .then(res => setClubs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const quickLinks = [
    { label: 'My Club Roster', icon: Users, path: '/teacher/club' },
    { label: 'Submit Attendance', icon: CalendarCheck, path: '/teacher/attendance' },
    { label: 'All Clubs', icon: ClipboardList, path: '/teacher/all-clubs' },
    { label: 'Student Info', icon: UserCheck, path: '/teacher/students' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
            Welcome back{firstName ? `, ${firstName}` : ''}
          </div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
            Here's what's happening with your club
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 28px', maxWidth: '900px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : clubs.length === 0 ? (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} color={theme.colors.textMuted} />
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                No club has been assigned to your account yet. Contact your coordinator to get set up.
              </div>
            </div>
          ) : (
            <>
              {clubs.map(club => {
                const meetingToday = club.next_meeting && isToday(club.next_meeting.date)
                return (
                  <div key={club.id} style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <School size={20} color={theme.colors.primary} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{club.name}</div>
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {club.room_number}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {club.enrolled}/{club.max_students} enrolled{club.waitlisted > 0 ? ` · ${club.waitlisted} waitlisted` : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* meeting status */}
                    <div style={{ marginTop: '14px' }}>
                      {club.next_meeting ? (
                        <div style={{
                          background: meetingToday ? theme.colors.warningLight : theme.colors.primaryLight,
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={15} color={meetingToday ? theme.colors.warning : theme.colors.primary} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: meetingToday ? theme.colors.warning : theme.colors.primary, fontFamily: theme.fonts.primary }}>
                              {meetingToday ? "Meeting today" : "Next meeting"}: {formatDate(club.next_meeting.date)}
                            </span>
                            <span style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} /> {club.next_meeting.start_time}–{club.next_meeting.end_time}
                            </span>
                          </div>
                          {meetingToday && (
                            <button
                              onClick={() => navigate('/teacher/attendance')}
                              style={{ background: theme.colors.warning, color: 'white', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}
                            >
                              Submit attendance
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ background: theme.colors.background, borderRadius: '10px', padding: '14px', fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>
                          No upcoming meeting scheduled.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* quick links */}
          <div style={{ marginTop: '28px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '12px' }}>Quick links</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              {quickLinks.map(link => {
                const Icon = link.icon
                return (
                  <div
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    style={{ background: 'white', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <Icon size={18} color={theme.colors.primary} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>{link.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard