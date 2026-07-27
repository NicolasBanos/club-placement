import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Users, Clock, Check, X, AlertCircle, ClipboardList } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function RosterManagement() {
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState('')

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

  const handleRemoveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from this club? The first waitlisted student will be moved to pending confirmation.`)) return
    setActionLoading(true)
    try {
      const res = await api.delete(`/roster/student/${studentId}`)
      setMessage(res.data.message)
      fetchRosters()
    } catch (err) {
      setMessage('Failed to remove student')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirm = async (waitlistId, studentName) => {
    setActionLoading(true)
    try {
      const res = await api.post(`/roster/confirm/${waitlistId}`)
      setMessage(`${studentName} confirmed and added to roster!`)
      fetchRosters()
    } catch (err) {
      setMessage('Failed to confirm promotion')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeny = async (waitlistId, studentName) => {
    setActionLoading(true)
    try {
      const res = await api.delete(`/roster/confirm/${waitlistId}`)
      setMessage(`${studentName}'s promotion denied. Next student pending.`)
      fetchRosters()
    } catch (err) {
      setMessage('Failed to deny promotion')
    } finally {
      setActionLoading(false)
    }
  }

  const pendingCount = selectedClub?.waitlist.filter(w => w.pending_confirmation).length || 0

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
          <div style={{ margin: '16px 28px 0', background: theme.colors.primaryLight, border: `1px solid ${theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>
            {message}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', gap: '20px' }}>

          {/* Club list */}
          <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '4px', letterSpacing: '0.05em' }}>
              SELECT CLUB
            </div>
            {loading ? (
              <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading...</div>
            ) : clubs.map(club => {
              const isSelected = selectedClub?.id === club.id
              const hasPending = club.waitlist.some(w => w.pending_confirmation)
              return (
                <div
                  key={club.id}
                  onClick={() => { setSelectedClub(club); setMessage('') }}
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
                </div>
              )
            })}
          </div>

          {/* Roster detail */}
          {!selectedClub ? (
            <div style={{ flex: 1, background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}`, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={36} color={theme.colors.primary} style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Select a club</div>
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Click a club on the left to view its roster</div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Club header */}
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{selectedClub.name}</div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>
                  {selectedClub.instructor} · {selectedClub.room_number} · Grades {GRADE_LABELS[selectedClub.grade_min]}–{GRADE_LABELS[selectedClub.grade_max]} · {selectedClub.enrolled_count}/{selectedClub.max_students} enrolled
                </div>
              </div>

              {/* Enrolled students */}
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={15} /> Enrolled Students ({selectedClub.enrolled_count})
                </div>
                {selectedClub.enrolled.length === 0 ? (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No students enrolled yet</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedClub.enrolled.map(student => (
                      <div key={student.student_id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: theme.colors.background,
                        borderRadius: '8px',
                      }}>
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
                    ))}
                  </div>
                )}
              </div>

              {/* Waitlist */}
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} /> Waitlist ({selectedClub.waitlist.length})
                </div>
                {selectedClub.waitlist.length === 0 ? (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No students on waitlist</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedClub.waitlist.map(student => (
                      <div key={student.waitlist_id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: student.pending_confirmation ? theme.colors.warningLight : theme.colors.background,
                        borderRadius: '8px',
                        border: student.pending_confirmation ? `1px solid ${theme.colors.warning}` : 'none',
                      }}>
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
                        {student.pending_confirmation && (
                          <div style={{ display: 'flex', gap: '6px' }}>
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
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RosterManagement