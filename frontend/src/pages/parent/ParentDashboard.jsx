import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { Users, School, MapPin, Calendar, Clock, AlertTriangle, ChevronRight, Copy, Check, CircleAlert } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

function ParentDashboard() {
  const navigate = useNavigate()
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    api.get('/families/mine')
      .then(res => setFamilies(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code); setTimeout(() => setCopied(''), 2000)
  }

  const firstName = localStorage.getItem('first_name') || 'there'
  const todayISO = new Date().toISOString().slice(0, 10)

  // Flatten all students across families
  const allStudents = families.flatMap(f => f.students.map(s => ({ ...s, _family: f })))

  // Summary buckets
  const placed = allStudents.filter(s => s.assignment).length
  const waitlisted = allStudents.filter(s => !s.assignment && s.waitlists && s.waitlists.length > 0).length
  const unassigned = allStudents.filter(s => !s.assignment && (!s.waitlists || s.waitlists.length === 0)).length

  // Needs attention
  const attention = []
  allStudents.forEach(s => {
    if (!s.assignment && (!s.waitlists || s.waitlists.length === 0) && !s.choice1 && !s.choice2 && !s.choice3) {
      attention.push({ type: 'choices', text: `${s.first_name} has no club choices selected yet.` })
    }
    (s.waitlists || []).forEach(w => {
      if (w.pending_confirmation) {
        attention.push({ type: 'offer', text: `${s.first_name} has been offered a spot in ${w.club_name} — confirm with the coordinator.` })
      }
    })
  })

  // Upcoming meetings: next date >= today across assigned kids
  const upcoming = []
  allStudents.forEach(s => {
    if (s.assignment && s.assignment.meeting_dates) {
      const next = s.assignment.meeting_dates
        .filter(m => m.date >= todayISO)
        .sort((a, b) => a.date.localeCompare(b.date))[0]
      if (next) {
        upcoming.push({
          student: s.first_name, club: s.assignment.club_name,
          location: s.assignment.dismissal_location, room: s.assignment.room_number,
          date: next.date, start: next.start_time, end: next.end_time,
        })
      }
    }
  })
  upcoming.sort((a, b) => a.date.localeCompare(b.date))

  // Sibling dismissal conflict per family
  const conflicts = families.map(f => {
    const assigned = f.students.filter(s => s.assignment).map(s => ({ name: s.first_name, grade: s.grade, loc: s.assignment.dismissal_location }))
    const locs = new Set(assigned.map(a => a.loc))
    if (assigned.length >= 2 && locs.size >= 2) {
      const youngest = assigned.reduce((a, b) => (b.grade < a.grade ? b : a))
      return { family: f.family_id, youngestName: youngest.name, youngestLoc: youngest.loc }
    }
    return null
  }).filter(Boolean)

  const statusChip = (s) => {
    if (s.assignment) return { label: s.assignment.club_name, color: theme.colors.primary, bg: theme.colors.primaryLight }
    if (s.waitlists && s.waitlists.length > 0) return { label: `Waitlisted`, color: theme.colors.warning, bg: theme.colors.warningLight }
    return { label: 'Not assigned', color: theme.colors.textMuted, bg: theme.colors.background }
  }

  const card = { background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: isMobile ? '68px 16px 16px' : '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Welcome back, {firstName}</div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Here's what's happening with your family</div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : allStudents.length === 0 ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>No family information found.</div>
          ) : (
            <>
              {/* Summary strip */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Children', value: allStudents.length, color: theme.colors.primary },
                  { label: 'Placed', value: placed, color: theme.colors.success },
                  { label: 'Waitlisted', value: waitlisted, color: theme.colors.warning },
                  { label: 'Unassigned', value: unassigned, color: theme.colors.textMuted },
                ].map(st => (
                  <div key={st.label} style={{ ...card, flex: '1 1 120px', textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: st.color, fontFamily: theme.fonts.primary }}>{st.value}</div>
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>{st.label}</div>
                  </div>
                ))}
              </div>

              {/* Needs attention */}
              {attention.length > 0 && (
                <div style={{ ...card, borderColor: theme.colors.warning, background: theme.colors.warningLight }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.warning, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <CircleAlert size={15} /> Needs your attention
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {attention.map((a, i) => (
                      <div key={i} style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ChevronRight size={13} color={theme.colors.warning} /> {a.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sibling conflict */}
              {conflicts.map(c => (
                <div key={c.family} style={{ ...card, borderColor: theme.colors.warning }}>
                  <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color={theme.colors.warning} />
                    Your children have different pickup locations. Send older siblings to <strong>{c.youngestName}</strong>'s spot (<strong>{c.youngestLoc}</strong>).
                  </div>
                </div>
              ))}

              {/* Upcoming */}
              <div style={card}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Calendar size={15} /> Upcoming club meetings
                </div>
                {upcoming.length === 0 ? (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No upcoming meetings scheduled.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {upcoming.slice(0, 4).map((u, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: theme.colors.background, borderRadius: '8px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: theme.colors.primaryLight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Clock size={16} color={theme.colors.primary} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>{u.student} · {u.club}</div>
                          <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            {formatDate(u.date)} · {u.start}–{u.end} · <MapPin size={11} /> pickup {u.location}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Compact children row -> My Children */}
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={15} /> My children
                  </div>
                  <button onClick={() => navigate('/parent/children')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.primary, fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    Manage <ChevronRight size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {allStudents.map(s => {
                    const chip = statusChip(s)
                    return (
                      <div key={s.id} onClick={() => navigate('/parent/children')} style={{ cursor: 'pointer', border: `1px solid ${theme.colors.border}`, borderRadius: '10px', padding: '12px 14px', minWidth: '150px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>{s.first_name}</div>
                          <span style={{ fontSize: '10px', fontWeight: '700', color: chip.color, background: chip.bg, padding: '2px 7px', borderRadius: '4px', fontFamily: theme.fonts.primary }}>{chip.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Join code (creator only, compact) */}
              {families.filter(f => f.join_code).map(f => (
                <div key={f.family_id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                    Family code — share with another guardian to let them join.
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary, letterSpacing: '0.05em' }}>{f.join_code}</span>
                    <button onClick={() => copyCode(f.join_code)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      {copied === f.join_code ? <Check size={15} color={theme.colors.primary} /> : <Copy size={15} color={theme.colors.textMuted} />}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParentDashboard