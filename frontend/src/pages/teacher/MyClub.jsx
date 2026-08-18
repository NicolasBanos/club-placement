import React, { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Users, Clock, MapPin, AlertCircle, ChevronDown, ChevronRight, Phone, UserCheck } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function MyClub() {
  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)  // student_id currently expanded

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    api.get('/clubs/mine')
      .then(res => {
        const clubs = res.data
        if (clubs.length === 0) {
          setError('No club has been assigned to your account yet.')
          setLoading(false)
          return
        }
        // teacher has at most one club
        return api.get(`/clubs/${clubs[0].id}/roster`)
          .then(res2 => setClub(res2.data))
      })
      .catch(err => {
        console.error(err)
        setError('Failed to load your club roster.')
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleExpand = (studentId) => {
    setExpanded(expanded === studentId ? null : studentId)
  }

  const thStyle = { textAlign: 'left', fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, padding: '10px 14px', borderBottom: `1px solid ${theme.colors.border}`, textTransform: 'uppercase', letterSpacing: '0.03em' }
  const tdStyle = { fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, padding: '12px 14px', borderBottom: `1px solid ${theme.colors.border}` }
  const sectionLabel = { fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase', letterSpacing: '0.03em', margin: '14px 0 8px' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: isMobile ? '68px 16px 16px' : '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>My Club</div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Your club roster and waitlist</div>
        </div>

        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px', maxWidth: isMobile ? '100%' : '900px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : error ? (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} color={theme.colors.textMuted} />
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{error}</div>
            </div>
          ) : (
            <>
              {/* club header */}
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{club.name}</div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {club.room_number}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {club.enrolled_count}/{club.max_students} enrolled</span>
                </div>
              </div>

              {/* enrolled roster */}
              <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>
                Roster ({club.enrolled.length})
              </div>
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, overflow: 'hidden', marginBottom: '24px' }}>
                {club.enrolled.length === 0 ? (
                  <div style={{ padding: '20px', fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No students enrolled yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle, width: '32px' }}></th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Grade</th>
                        <th style={thStyle}>Family</th>
                        <th style={thStyle}>Dismissal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {club.enrolled.map(s => {
                        const isOpen = expanded === s.student_id
                        return (
                          <React.Fragment key={s.student_id}>
                            <tr
                              onClick={() => toggleExpand(s.student_id)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                {isOpen ? <ChevronDown size={14} color={theme.colors.textMuted} /> : <ChevronRight size={14} color={theme.colors.textMuted} />}
                              </td>
                              <td style={tdStyle}>{s.first_name} {s.last_name}</td>
                              <td style={tdStyle}>{GRADE_LABELS[s.grade] ?? s.grade}</td>
                              <td style={tdStyle}>{s.family_name}</td>
                              <td style={tdStyle}>{s.dismissal_method}</td>
                            </tr>
                            {isOpen && (
                              <tr key={`${s.student_id}-detail`}>
                                <td colSpan={5} style={{ padding: 0, borderBottom: `1px solid ${theme.colors.border}` }}>
                                  <div style={{ background: theme.colors.background, padding: '14px 20px' }}>

                                    {/* authorized pickups */}
                                    <div style={{ ...sectionLabel, margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <UserCheck size={12} /> Authorized pickups
                                    </div>
                                    {s.pickups.length === 0 ? (
                                      <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No authorized pickups on file.</div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {s.pickups.map((p, i) => (
                                          <div key={i} style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <strong>{p.name}</strong>
                                            {p.relationship_to_student && <span style={{ color: theme.colors.textMuted }}>· {p.relationship_to_student}</span>}
                                            {p.phone && (
                                              <span style={{ color: theme.colors.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={11} /> {p.phone}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* primary contact */}
                                    <div style={sectionLabel}>Primary contact</div>
                                    {s.primary_contact && (
                                      <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                                        <strong>{s.primary_contact.name}</strong>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: theme.colors.textMuted }}><Phone size={11} /> {s.primary_contact.phone}</span>
                                        {s.primary_contact.phone2 && (
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: theme.colors.textMuted }}>
                                            <Phone size={11} /> {s.primary_contact.phone2}{s.primary_contact.phone2_owner ? ` (${s.primary_contact.phone2_owner})` : ''}
                                          </span>
                                        )}
                                        <span style={{ color: theme.colors.textMuted }}>{s.primary_contact.email}</span>
                                      </div>
                                    )}

                                    {/* linked parent accounts */}
                                    {s.linked_parents.length > 0 && (
                                      <>
                                        <div style={sectionLabel}>Linked parent accounts</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                          {s.linked_parents.map((p, i) => (
                                            <div key={i} style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <strong>{p.name}</strong>
                                              <span style={{ color: theme.colors.textMuted, textTransform: 'capitalize' }}>{p.role}</span>
                                              <span style={{ color: theme.colors.textMuted }}>{p.email}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* waitlist */}
              {club.waitlist.length > 0 && (
                <>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} /> Waitlist ({club.waitlist.length})
                  </div>
                  <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>#</th>
                          <th style={thStyle}>Name</th>
                          <th style={thStyle}>Grade</th>
                          <th style={thStyle}>Family</th>
                          <th style={thStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {club.waitlist.map(w => (
                          <tr key={w.student_id}>
                            <td style={tdStyle}>{w.position}</td>
                            <td style={tdStyle}>{w.first_name} {w.last_name}</td>
                            <td style={tdStyle}>{GRADE_LABELS[w.grade] ?? w.grade}</td>
                            <td style={tdStyle}>{w.family_name}</td>
                            <td style={tdStyle}>
                              {w.pending_confirmation ? (
                                <span style={{ color: theme.colors.warning, fontWeight: '600' }}>Pending confirmation</span>
                              ) : (
                                <span style={{ color: theme.colors.textMuted }}>Waiting</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyClub