import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Users, Clock, Check, X, AlertCircle, ClipboardList, ArrowUp, ArrowDown, ChevronUp, ChevronDown, ChevronRight, Phone, UserCheck, Trash2 } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function RosterManagement() {
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [activeTab, setActiveTab] = useState('enrolled')
  const [expandedStudent, setExpandedStudent] = useState(null)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchRosters = async () => {
    try {
      const res = await api.get('/roster/')
      setClubs(res.data)
      if (selectedClub) {
        const updated = res.data.find(c => c.id === selectedClub.id)
        setSelectedClub(updated || null)
      }
    } catch (err) {
      console.error('Failed to fetch rosters:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRosters() }, [])

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleRemoveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this club? The first waitlisted student will be moved to pending confirmation.`)) return
    setActionLoading(true)
    try {
      const res = await api.delete(`/roster/student/${studentId}`)
      showMessage(res.data.message)
      fetchRosters()
    } catch (err) {
      showMessage('Failed to remove student', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirm = async (waitlistId, studentName) => {
    setActionLoading(true)
    try {
      const res = await api.post(`/roster/confirm/${waitlistId}`)
      showMessage(`${studentName} confirmed and added to roster!`)
      fetchRosters()
    } catch (err) {
      showMessage('Failed to confirm promotion', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeny = async (waitlistId, studentName) => {
    setActionLoading(true)
    try {
      const res = await api.delete(`/roster/confirm/${waitlistId}`)
      showMessage(`${studentName}'s promotion denied.`)
      fetchRosters()
    } catch (err) {
      showMessage('Failed to deny promotion', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePromote = async (waitlistId, studentName) => {
    if (!window.confirm(`Directly promote ${studentName} into this club?`)) return
    setActionLoading(true)
    try {
      const res = await api.post(`/roster/promote/${waitlistId}`)
      showMessage(res.data.message)
      fetchRosters()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to promote student', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveFromWaitlist = async (waitlistId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from the waitlist entirely?`)) return
    setActionLoading(true)
    try {
      const res = await api.delete(`/roster/waitlist/${waitlistId}`)
      showMessage(`${studentName} removed from waitlist`)
      fetchRosters()
    } catch (err) {
      showMessage('Failed to remove from waitlist', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReorder = async (waitlistId, currentPosition, direction) => {
    const newPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1
    setActionLoading(true)
    try {
      await api.put(`/roster/waitlist/reorder/${waitlistId}?new_position=${newPosition}`)
      fetchRosters()
    } catch (err) {
      showMessage('Failed to reorder waitlist', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemovePickup = async (pickupId, name) => {
    if (!window.confirm(`Remove ${name} as an authorized pickup?`)) return
    try {
      await api.delete(`/roster/pickups/${pickupId}`)
      showMessage(`${name} removed from authorized pickups.`)
      fetchRosters()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to remove pickup', 'error')
    }
  }

  const handleUnlinkParent = async (studentId, parentUserId, name) => {
    if (!window.confirm(`Remove ${name}'s access to this family? This does not delete their account, only their connection to this family.`)) return
    try {
      await api.delete(`/roster/students/${studentId}/parent/${parentUserId}`)
      showMessage(`${name}'s access to this family has been removed.`)
      fetchRosters()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to remove access', 'error')
    }
  }

  const pendingCount = selectedClub?.waitlist.filter(w => w.pending_confirmation).length || 0
  const availableSpots = selectedClub ? selectedClub.max_students - selectedClub.enrolled_count : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        {/* Top bar */}
        <div style={{
          background: 'white',
          padding: isMobile ? '68px 16px 16px' : '16px 28px',
          borderBottom: `1px solid ${theme.colors.border}`,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '10px' : '0',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
              Roster Management
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Manage club rosters and waitlists
            </div>
          </div>
          {pendingCount > 0 && (
            <div style={{ background: theme.colors.warningLight, border: `1px solid ${theme.colors.warning}`, borderRadius: '9px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} color={theme.colors.warning} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.warning, fontFamily: theme.fonts.primary }}>
                {pendingCount} pending confirmation{pendingCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {message && (
          <div style={{
            margin: '16px 28px 0',
            background: messageType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight,
            border: `1px solid ${messageType === 'error' ? theme.colors.danger : theme.colors.border}`,
            borderRadius: '9px',
            padding: '12px 16px',
            color: messageType === 'error' ? theme.colors.danger : theme.colors.primary,
            fontSize: '13px',
            fontFamily: theme.fonts.primary,
            fontWeight: '600'
          }}>
            {message}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>

          {/* Club list */}
          <div style={{ width: isMobile ? '100%' : '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '4px', letterSpacing: '0.05em' }}>
              SELECT CLUB
            </div>
            {loading ? (
              <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading...</div>
            ) : clubs.map(club => {
              const isSelected = selectedClub?.id === club.id
              const hasPending = club.waitlist.some(w => w.pending_confirmation)
              const spots = club.max_students - club.enrolled_count
              return (
                <div
                  key={club.id}
                  onClick={() => { setSelectedClub(club); setMessage(''); setActiveTab('enrolled') }}
                  style={{
                    background: isSelected ? theme.colors.primary : 'white',
                    borderRadius: theme.borderRadius.lg,
                    padding: '14px 16px',
                    border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                    cursor: 'pointer',
                    position: 'relative',
                  }}>
                  {hasPending && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: theme.colors.warning }} />
                  )}
                  <div style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? 'white' : theme.colors.primary, fontFamily: theme.fonts.primary }}>{club.name}</div>
                  <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '3px' }}>
                    {club.enrolled_count}/{club.max_students} enrolled · {club.waitlist.length} waiting
                  </div>
                  {spots > 0 && (
                    <div style={{ fontSize: '10px', color: isSelected ? theme.colors.secondary : theme.colors.primary, fontFamily: theme.fonts.primary, fontWeight: '700', marginTop: '2px' }}>
                      {spots} spot{spots > 1 ? 's' : ''} available
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Roster detail */}
          {!selectedClub ? (
            <div style={{ flex: 1, background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}`, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={36} color={theme.colors.primary} style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Select a club</div>
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Click a club on the left to view its roster and waitlist</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Club header */}
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}`, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '14px' : '0' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{selectedClub.name}</div>
                  <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>
                    {selectedClub.instructor} · {selectedClub.room_number} · Grades {GRADE_LABELS[selectedClub.grade_min]}–{GRADE_LABELS[selectedClub.grade_max]}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{selectedClub.enrolled_count}/{selectedClub.max_students}</div>
                    <div style={{ fontSize: '10px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Enrolled</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: theme.colors.warning, fontFamily: theme.fonts.primary }}>{selectedClub.waitlist.length}</div>
                    <div style={{ fontSize: '10px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Waitlisted</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: availableSpots > 0 ? theme.colors.primary : theme.colors.danger, fontFamily: theme.fonts.primary }}>{availableSpots}</div>
                    <div style={{ fontSize: '10px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Available</div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setActiveTab('enrolled')}
                  style={{
                    background: activeTab === 'enrolled' ? theme.colors.primary : 'white',
                    color: activeTab === 'enrolled' ? 'white' : theme.colors.primary,
                    border: `1.5px solid ${theme.colors.primary}`,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: theme.fonts.primary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                  <Users size={13} /> Enrolled ({selectedClub.enrolled_count})
                </button>
                <button
                  onClick={() => setActiveTab('waitlist')}
                  style={{
                    background: activeTab === 'waitlist' ? theme.colors.warning : 'white',
                    color: activeTab === 'waitlist' ? 'white' : theme.colors.warning,
                    border: `1.5px solid ${theme.colors.warning}`,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: theme.fonts.primary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                  <Clock size={13} /> Waitlist ({selectedClub.waitlist.length})
                  {pendingCount > 0 && (
                    <span style={{ background: theme.colors.danger, color: 'white', fontSize: '9px', fontWeight: '700', padding: '1px 5px', borderRadius: '8px' }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Enrolled tab */}
              {activeTab === 'enrolled' && (
                <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                  {selectedClub.enrolled.length === 0 ? (
                    <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>No students enrolled yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedClub.enrolled.map(student => {
                        const isOpen = expandedStudent === student.student_id
                        const sortedParents = [...(student.linked_parents || [])].sort((a, b) => a.role === 'creator' ? -1 : 1)
                        return (
                          <div key={student.student_id} style={{ background: theme.colors.background, borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
                              <button
                                onClick={() => setExpandedStudent(isOpen ? null : student.student_id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px', flexShrink: 0 }}>
                                {isOpen ? <ChevronDown size={14} color={theme.colors.textMuted} /> : <ChevronRight size={14} color={theme.colors.textMuted} />}
                              </button>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, flexShrink: 0 }}>
                                {student.first_name[0]}{student.last_name[0]}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>
                                  {student.first_name} {student.last_name}
                                  <span style={{ fontSize: '11px', fontWeight: '400', color: theme.colors.textMuted, marginLeft: '8px' }}>
                                    Grade {GRADE_LABELS[student.grade]}
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                                  {student.family_name} family · {student.teacher} · {student.dismissal_method}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveStudent(student.student_id, `${student.first_name} ${student.last_name}`)}
                                disabled={actionLoading}
                                style={{ background: theme.colors.dangerLight, color: theme.colors.danger, border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <X size={12} /> Remove
                              </button>
                            </div>

                            {isOpen && (
                              <div style={{ borderTop: `1px solid ${theme.colors.border}`, padding: '12px 16px 14px 46px' }}>

                                <div style={{ fontSize: '10px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <UserCheck size={11} /> Authorized pickups
                                </div>
                                {(!student.pickups || student.pickups.length === 0) ? (
                                  <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No authorized pickups on file.</div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {student.pickups.map((p) => (
                                      <div key={p.id} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '6px', padding: '6px 10px', border: `1px solid ${theme.colors.border}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                          <strong>{p.name}</strong>
                                          {p.relationship_to_student && <span style={{ color: theme.colors.textMuted }}>{p.relationship_to_student}</span>}
                                          {p.phone && <span style={{ color: theme.colors.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={10} /> {p.phone}</span>}
                                        </div>
                                        <button onClick={() => handleRemovePickup(p.id, p.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                                          <Trash2 size={13} color={theme.colors.danger} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div style={{ fontSize: '10px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase', letterSpacing: '0.03em', margin: '12px 0 6px' }}>
                                  Primary contact
                                </div>
                                {student.primary_contact && (
                                  <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                                    <strong>{student.primary_contact.name}</strong>
                                    <span style={{ color: theme.colors.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}><Phone size={10} /> {student.primary_contact.phone}</span>
                                    {student.primary_contact.phone2 && (
                                      <span style={{ color: theme.colors.textMuted, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <Phone size={10} /> {student.primary_contact.phone2}{student.primary_contact.phone2_owner ? ` (${student.primary_contact.phone2_owner})` : ''}
                                      </span>
                                    )}
                                    <span style={{ color: theme.colors.textMuted }}>{student.primary_contact.email}</span>
                                  </div>
                                )}

                                {sortedParents.length > 0 && (
                                  <>
                                    <div style={{ fontSize: '10px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase', letterSpacing: '0.03em', margin: '12px 0 6px' }}>
                                      Linked parent accounts
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {sortedParents.map((p) => (
                                        <div key={p.id} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '6px', padding: '6px 10px', border: `1px solid ${theme.colors.border}` }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <strong>{p.name}</strong>
                                            <span style={{ color: theme.colors.textMuted, textTransform: 'capitalize' }}>{p.role}</span>
                                            <span style={{ color: theme.colors.textMuted }}>{p.email}</span>
                                          </div>
                                          <button onClick={() => handleUnlinkParent(student.student_id, p.id, p.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                                            <Trash2 size={13} color={theme.colors.danger} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Waitlist tab */}
              {activeTab === 'waitlist' && (
                <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                  {selectedClub.waitlist.length === 0 ? (
                    <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>No students on waitlist</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedClub.waitlist.map((student, index) => (
                        <div key={student.waitlist_id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: student.pending_confirmation ? theme.colors.warningLight : theme.colors.background,
                          borderRadius: '8px',
                          border: student.pending_confirmation ? `1px solid ${theme.colors.warning}` : 'none',
                        }}>
                          {/* Position controls */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                            <button
                              onClick={() => handleReorder(student.waitlist_id, student.position, 'up')}
                              disabled={actionLoading || index === 0}
                              style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', padding: '1px', opacity: index === 0 ? 0.3 : 1 }}>
                              <ChevronUp size={14} color={theme.colors.textMuted} />
                            </button>
                            <button
                              onClick={() => handleReorder(student.waitlist_id, student.position, 'down')}
                              disabled={actionLoading || index === selectedClub.waitlist.length - 1}
                              style={{ background: 'none', border: 'none', cursor: index === selectedClub.waitlist.length - 1 ? 'not-allowed' : 'pointer', padding: '1px', opacity: index === selectedClub.waitlist.length - 1 ? 0.3 : 1 }}>
                              <ChevronDown size={14} color={theme.colors.textMuted} />
                            </button>
                          </div>

                          {/* Position number */}
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: student.pending_confirmation ? theme.colors.warning : theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: student.pending_confirmation ? 'white' : theme.colors.primary, fontFamily: theme.fonts.primary, flexShrink: 0 }}>
                            {student.pending_confirmation ? '!' : student.position}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>
                              {student.first_name} {student.last_name}
                              {student.pending_confirmation && (
                                <span style={{ fontSize: '10px', fontWeight: '700', color: theme.colors.warning, marginLeft: '8px', background: 'rgba(249,168,37,0.2)', padding: '1px 6px', borderRadius: '4px' }}>
                                  PENDING CONFIRMATION
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                              {student.family_name} family · Grade {GRADE_LABELS[student.grade]}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            {student.pending_confirmation ? (
                              <>
                                <button
                                  onClick={() => handleConfirm(student.waitlist_id, `${student.first_name} ${student.last_name}`)}
                                  disabled={actionLoading}
                                  style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Check size={12} /> Confirm
                                </button>
                                <button
                                  onClick={() => handleDeny(student.waitlist_id, `${student.first_name} ${student.last_name}`)}
                                  disabled={actionLoading}
                                  style={{ background: theme.colors.dangerLight, color: theme.colors.danger, border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <X size={12} /> Deny
                                </button>
                              </>
                            ) : (
                              <>
                                {availableSpots > 0 && (
                                  <button
                                    onClick={() => handlePromote(student.waitlist_id, `${student.first_name} ${student.last_name}`)}
                                    disabled={actionLoading}
                                    style={{ background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <ArrowUp size={12} /> Promote
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveFromWaitlist(student.waitlist_id, `${student.first_name} ${student.last_name}`)}
                                  disabled={actionLoading}
                                  style={{ background: theme.colors.dangerLight, color: theme.colors.danger, border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <X size={12} /> Remove
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RosterManagement