import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { Trophy, Upload, BarChart2, UserPlus, Calendar, Users, List, FileCheck, MessageSquare } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function formatTime(time) {
  if (!time) return ''
  if (time.includes('AM') || time.includes('PM')) return time
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

function StatCard({ icon: Icon, label, value, color, lightColor, subtitle }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: theme.borderRadius.lg,
      padding: '24px',
      border: `1px solid ${lightColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{
          background: lightColor,
          width: '36px', height: '36px',
          borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{label}</span>
      </div>
      <div style={{ fontSize: '40px', fontWeight: '800', color, lineHeight: '1', fontFamily: theme.fonts.primary }}>{value}</div>
      <div style={{ fontSize: '11px', color, opacity: 0.7, marginTop: '8px', fontFamily: theme.fonts.primary }}>{subtitle}</div>
    </div>
  )
}

function CoordinatorDashboard() {
  const navigate = useNavigate()
  const firstName = localStorage.getItem('first_name')
  const [stats, setStats] = useState({ total_enrolled: 0, total_waitlisted: 0, pending_excuses: 0, unread_messages: 0, total_clubs: 0 })
  const [clubs, setClubs] = useState([])
  const [nextMeeting, setNextMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAllMeetings, setShowAllMeetings] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, clubsRes, meetingRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/clubs'),
          api.get('/dashboard/next-meeting'),
        ])
        setStats(statsRes.data)
        setClubs(clubsRes.data)
        setNextMeeting(meetingRes.data.date ? meetingRes.data : null)
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        {/* Top bar */}
        <div style={{
          background: 'white',
          padding: '16px 28px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
              Good morning, {firstName} 
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Plantation Park Elementary · {today}
            </div>
          </div>
          <button
            onClick={() => navigate('/coordinator/lottery')}
            style={{
              background: theme.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '9px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: theme.fonts.primary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(26,92,26,0.25)',
            }}>
            <Trophy size={14} /> Run Lottery
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading dashboard...</div>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <StatCard icon={Users} label="Enrolled" value={stats.total_enrolled} color={theme.colors.primary} lightColor={theme.colors.primaryLight} subtitle={`${stats.total_clubs} clubs active`} />
                <StatCard icon={List} label="Waitlisted" value={stats.total_waitlisted} color={theme.colors.warning} lightColor={theme.colors.warningLight} subtitle="students waiting" />
                <StatCard icon={FileCheck} label="Excuses" value={stats.pending_excuses} color={theme.colors.danger} lightColor={theme.colors.dangerLight} subtitle="needs review" />
                <StatCard icon={MessageSquare} label="Messages" value={stats.unread_messages} color={theme.colors.info} lightColor={theme.colors.infoLight} subtitle="unread" />
              </div>

              {/* Bottom row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>

                {/* Club capacity */}
                <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', border: `1px solid ${theme.colors.border}` }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, marginBottom: '20px', fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={16} /> Club Capacity
                  </div>
                  {clubs.length === 0 ? (
                    <div style={{ color: theme.colors.textMuted, fontSize: '13px', fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>
                      No clubs set up yet. Add clubs to see capacity.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {clubs.map(club => {
                        const pct = club.max_students > 0 ? (club.enrolled / club.max_students) * 100 : 0
                        const color = pct === 100 ? theme.colors.danger : pct >= 80 ? theme.colors.warning : theme.colors.primary
                        return (
                          <div key={club.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>{club.name}</span>
                              <span style={{ fontSize: '13px', color, fontWeight: '600', fontFamily: theme.fonts.primary }}>
                                {pct === 100 ? 'Full' : `${club.enrolled}/${club.max_students}`}
                              </span>
                            </div>
                            <div style={{ background: '#f0f0f0', borderRadius: '6px', height: '8px' }}>
                              <div style={{ background: color, width: `${Math.min(pct, 100)}%`, height: '8px', borderRadius: '6px' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* Next meeting */}
                  <div style={{ background: theme.colors.primary, borderRadius: theme.borderRadius.lg, padding: '24px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.15)', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Calendar size={20} color={theme.colors.secondary} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontFamily: theme.fonts.primary }}>Next meeting day</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'white', fontFamily: theme.fonts.primary }}>
                          {nextMeeting ? formatDate(nextMeeting.date) : 'No meetings scheduled'}
                        </div>
                      </div>
                    </div>

                    {nextMeeting && nextMeeting.meetings && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(showAllMeetings ? nextMeeting.meetings : nextMeeting.meetings.slice(0, 3)).map((m, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '600', color: 'white', fontFamily: theme.fonts.primary }}>{m.club_name}</div>
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: theme.fonts.primary }}>{m.room_number}</div>
                            </div>
                            <div style={{ fontSize: '11px', color: theme.colors.secondary, fontFamily: theme.fonts.primary, fontWeight: '600' }}>
                              {formatTime(m.start_time)} – {formatTime(m.end_time)}
                            </div>
                          </div>
                        ))}
                        {nextMeeting.meetings.length > 3 && (
                          <button
                            onClick={() => setShowAllMeetings(!showAllMeetings)}
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '7px', padding: '7px', fontSize: '11px', fontFamily: theme.fonts.primary, cursor: 'pointer', fontWeight: '600' }}>
                            {showAllMeetings ? 'Show less ▲' : `Show ${nextMeeting.meetings.length - 3} more ▼`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', border: `1px solid ${theme.colors.border}`, display: 'flex', gap: '12px', flex: 1 }}>
                    {[
                      { icon: Upload, label: 'Import Data', path: '/coordinator/import' },
                      { icon: BarChart2, label: 'Reports', path: '/coordinator/reports' },
                      { icon: UserPlus, label: 'Add Teacher', path: '/coordinator/teachers' },
                    ].map(({ icon: Icon, label, path }) => (
                      <div key={label} onClick={() => navigate(path)} style={{ flex: 1, background: theme.colors.background, borderRadius: '10px', padding: '20px 10px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Icon size={22} color={theme.colors.primary} />
                        <div style={{ fontSize: '11px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, fontWeight: '600' }}>{label}</div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CoordinatorDashboard