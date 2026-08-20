import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { School, Users, Clock, MapPin, Calendar, CalendarCheck, MessageSquare, AlertCircle, TrendingUp } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function isToday(iso) {
  if (!iso) return false
  const today = new Date().toISOString().split('T')[0]
  return iso === today
}

function TeacherDashboard() {
  const navigate = useNavigate()
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const firstName = localStorage.getItem('first_name')

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [attendanceSubmittedToday, setAttendanceSubmittedToday] = useState(false)

  useEffect(() => {
    api.get('/clubs/mine')
      .then(res => setClubs(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))

    api.get('/attendance/mine-today')
      .then(res => {
        if (res.data.meeting_today) {
          const anySubmitted = res.data.students.some(s => s.status !== 'unmarked')
          setAttendanceSubmittedToday(anySubmitted)
        }
      })
      .catch(() => {})
  }, [])

  const quickLinks = [
    { label: 'My Club Roster', desc: 'View students, contacts & pickups', icon: Users, path: '/teacher/club' },
    { label: 'Submit Attendance', desc: "Mark today's present/absent/excused", icon: CalendarCheck, path: '/teacher/attendance' },
    { label: 'Messages', desc: 'Chat with parents and coordinator', icon: MessageSquare, path: '/teacher/messages' },
  ]

  const totalEnrolled = clubs.reduce((sum, c) => sum + c.enrolled, 0)
  const totalWaitlisted = clubs.reduce((sum, c) => sum + c.waitlisted, 0)
  const totalSpots = clubs.reduce((sum, c) => sum + c.max_students, 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: isMobile ? '68px 16px 16px' : '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
            Welcome back{firstName ? `, ${firstName}` : ''}
          </div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
            Here's what's happening with your club
          </div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px' }}>
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
              {/* stat strip */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '16px' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{totalEnrolled}</div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Users size={11} /> Enrolled
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '16px' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: theme.colors.warning, fontFamily: theme.fonts.primary }}>{totalWaitlisted}</div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Clock size={11} /> Waitlisted
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '16px' }}>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: '#333', fontFamily: theme.fonts.primary }}>{Math.max(0, totalSpots - totalEnrolled)}</div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <TrendingUp size={11} /> Spots open
                  </div>
                </div>
              </div>

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
                              <Clock size={12} /> {formatTime(club.next_meeting.start_time)}–{formatTime(club.next_meeting.end_time)}
                            </span>
                          </div>
                          {meetingToday && (
                            attendanceSubmittedToday ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                                <CalendarCheck size={13} /> Attendance submitted
                              </span>
                            ) : (
                              <button
                                onClick={() => navigate('/teacher/attendance')}
                                style={{ background: theme.colors.warning, color: 'white', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}
                              >
                                Submit attendance
                              </button>
                            )
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {quickLinks.map(link => {
                const Icon = link.icon
                return (
                  <div
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    style={{ background: 'white', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, padding: '18px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={18} color={theme.colors.primary} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{link.label}</div>
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>{link.desc}</div>
                    </div>
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