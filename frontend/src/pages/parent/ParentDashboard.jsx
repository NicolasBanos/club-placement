import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Users, MapPin, Clock, Calendar, Copy, Check, School, ListChecks } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function nextMeeting(meetings) {
  if (!meetings || meetings.length === 0) return null
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = meetings.filter(m => m.date >= today).sort((a, b) => a.date.localeCompare(b.date))
  return (upcoming[0] || meetings[0])
}

function ParentDashboard() {
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    api.get('/families/mine')
      .then(res => setFamilies(res.data))
      .catch(err => console.error('Failed to load families:', err))
      .finally(() => setLoading(false))
  }, [])

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  const firstName = localStorage.getItem('first_name') || 'there'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        {/* Top bar */}
        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
            Welcome back, {firstName}
          </div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
            Your children and their club status
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px 28px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : families.length === 0 ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>No family information found.</div>
          ) : families.map(family => (
            <div key={family.family_id} style={{ marginBottom: '28px' }}>

              {/* Family join code (creator only) */}
              {family.join_code && (
                <div style={{ background: theme.colors.secondaryLight, border: `1px solid ${theme.colors.secondary}`, borderRadius: theme.borderRadius.lg, padding: '14px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Your family code</div>
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Share with another parent or guardian so they can join your family.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '8px', padding: '8px 14px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary, letterSpacing: '0.05em' }}>{family.join_code}</span>
                    <button onClick={() => copyCode(family.join_code)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      {copied === family.join_code ? <Check size={16} color={theme.colors.primary} /> : <Copy size={16} color={theme.colors.textMuted} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Children cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {family.students.map(student => {
                  const meeting = student.assignment ? nextMeeting(student.assignment.meeting_dates) : null
                  return (
                    <div key={student.id} style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px', display: 'flex', gap: '16px' }}>
                      {/* Avatar */}
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, flexShrink: 0 }}>
                        {student.first_name[0]}{student.last_name[0]}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>
                          {student.first_name} {student.last_name}
                          <span style={{ fontSize: '12px', fontWeight: '400', color: theme.colors.textMuted, marginLeft: '8px' }}>
                            Grade {GRADE_LABELS[student.grade]} · {student.teacher}
                          </span>
                        </div>

                        {/* ASSIGNED */}
                        {student.assignment && (
                          <div style={{ marginTop: '10px', background: theme.colors.primaryLight, borderRadius: '10px', padding: '14px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <School size={15} /> {student.assignment.club_name}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
                              <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <MapPin size={12} /> {student.assignment.room_number} · Pickup: {student.assignment.dismissal_location}
                              </div>
                              {meeting && (
                                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Calendar size={12} /> Next: {formatDate(meeting.date)} {meeting.start_time}–{meeting.end_time}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* WAITLISTED */}
                        {!student.assignment && student.waitlists && student.waitlists.length > 0 && (
                          <div style={{ marginTop: '10px', background: theme.colors.warningLight, borderRadius: '10px', padding: '14px' }}>
                            {student.waitlists.map((w, i) => (
                              <div key={i} style={{ fontSize: '13px', color: theme.colors.warning, fontFamily: theme.fonts.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} /> Waitlisted for {w.club_name} — position {w.position}
                                {w.pending_confirmation && <span style={{ fontSize: '10px', background: theme.colors.warning, color: 'white', padding: '1px 6px', borderRadius: '4px' }}>SPOT OFFERED</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* UNASSIGNED (choices only) */}
                        {!student.assignment && (!student.waitlists || student.waitlists.length === 0) && (
                          <div style={{ marginTop: '10px', background: theme.colors.background, borderRadius: '10px', padding: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <ListChecks size={13} /> Not yet assigned
                            </div>
                            {(student.choice1 || student.choice2 || student.choice3) ? (
                              <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '6px' }}>
                                Choices: {[student.choice1, student.choice2, student.choice3].filter(Boolean).join(' · ')}
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '6px', fontStyle: 'italic' }}>
                                No club choices selected yet.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ParentDashboard