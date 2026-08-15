import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { FileCheck, AlertTriangle, Clock, CheckCircle, XCircle, Calendar, School } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

const SectionHeader = ({ icon: Icon, label, count, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
    <Icon size={16} color={color} />
    <span style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{label}</span>
    <span style={{ fontSize: '11px', fontWeight: '700', color, background: `${color}22`, padding: '2px 8px', borderRadius: '10px', fontFamily: theme.fonts.primary }}>{count}</span>
  </div>
)

const CardShell = ({ children }) => (
  <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '16px', marginBottom: '10px' }}>
    {children}
  </div>
)

const AbsenceInfo = ({ e }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, flexShrink: 0 }}>
        {e.student_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div>
        <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><School size={12} /> {e.club_name}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {formatDate(e.absence_date)}</span>
        </div>
      </div>
    </div>
  )

function ParentExcuses() {
  const [excuses, setExcuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')

  const [submittingId, setSubmittingId] = useState(null)  // attendance_id
  const [reasonDraft, setReasonDraft] = useState('')

  const load = () => {
    api.get('/attendance/excuses/mine')
      .then(res => setExcuses(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const flash = (text, type = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  const startSubmit = (attendanceId) => {
    setSubmittingId(attendanceId)
    setReasonDraft('')
  }

  const cancelSubmit = () => {
    setSubmittingId(null)
    setReasonDraft('')
  }

  const submitExcuse = async (attendanceId) => {
    if (!reasonDraft.trim()) { flash('Please enter a reason for the absence', 'error'); return }
    try {
      await api.post('/attendance/excuses/submit', {
        attendance_id: attendanceId,
        excuse_reason: reasonDraft.trim(),
      })
      setSubmittingId(null); setReasonDraft('')
      flash('Excuse submitted for review.')
      load()
    } catch (e) {
      flash(e.response?.data?.detail || 'Failed to submit excuse', 'error')
    }
  }

  const needsExcuse = excuses.filter(e => e.excuse_status === 'none' && !e.deadline_passed)
  const pastDeadline = excuses.filter(e => e.excuse_status === 'none' && e.deadline_passed)
  const pending = excuses.filter(e => e.excuse_status === 'pending')
  const resolved = excuses.filter(e => e.excuse_status === 'approved' || e.excuse_status === 'denied')

  const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '12px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', marginTop: '4px', resize: 'vertical' }


  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Excuses</div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Submit and track excuses for your children's absences</div>
        </div>

        {msg && (
          <div style={{ margin: '16px 28px 0', background: msgType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight, border: `1px solid ${msgType === 'error' ? theme.colors.danger : theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: msgType === 'error' ? theme.colors.danger : theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>{msg}</div>
        )}

        <div style={{ flex: 1, padding: '24px 28px', maxWidth: '760px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : excuses.length === 0 ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>No absences on record for your children.</div>
          ) : (
            <>
              {/* Needs excuse */}
              {needsExcuse.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={FileCheck} label="Needs an excuse" count={needsExcuse.length} color={theme.colors.warning} />
                  {needsExcuse.map(e => (
                    <CardShell key={e.attendance_id}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <AbsenceInfo e={e} />
                        <div style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.warning, fontFamily: theme.fonts.primary, background: theme.colors.warningLight, padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                          {e.days_remaining === 0 ? 'Due today' : `${e.days_remaining} day${e.days_remaining === 1 ? '' : 's'} left`}
                        </div>
                      </div>

                      {submittingId === e.attendance_id ? (
                        <div style={{ marginTop: '14px', borderTop: `1px solid ${theme.colors.border}`, paddingTop: '12px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>Reason for absence</label>
                          <textarea
                            style={{ ...inp, minHeight: '64px' }}
                            value={reasonDraft}
                            onChange={ev => setReasonDraft(ev.target.value)}
                            placeholder="e.g. Doctor's appointment"
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button onClick={() => submitExcuse(e.attendance_id)} style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Submit excuse</button>
                            <button onClick={cancelSubmit} style={{ background: 'white', color: theme.colors.textMuted, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => startSubmit(e.attendance_id)} style={{ marginTop: '12px', background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Submit excuse</button>
                      )}
                    </CardShell>
                  ))}
                </div>
              )}

              {/* Past deadline */}
              {pastDeadline.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={AlertTriangle} label="Deadline passed" count={pastDeadline.length} color={theme.colors.danger} />
                  {pastDeadline.map(e => (
                    <CardShell key={e.attendance_id}>
                      <AbsenceInfo e={e} />
                      <div style={{ marginTop: '12px', fontSize: '12px', color: theme.colors.danger, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertTriangle size={13} /> The 3-day window to submit has passed. Please contact your child's teacher.
                      </div>
                    </CardShell>
                  ))}
                </div>
              )}

              {/* Pending review */}
              {pending.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={Clock} label="Pending review" count={pending.length} color={theme.colors.secondary} />
                  {pending.map(e => (
                    <CardShell key={e.attendance_id}>
                      <AbsenceInfo e={e} />
                      <div style={{ marginTop: '12px', background: theme.colors.background, borderRadius: '8px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Reason submitted</div>
                        <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '2px' }}>{e.excuse_reason}</div>
                      </div>
                    </CardShell>
                  ))}
                </div>
              )}

              {/* Resolved */}
              {resolved.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                  <SectionHeader icon={CheckCircle} label="Resolved" count={resolved.length} color={theme.colors.textMuted} />
                  {resolved.map(e => {
                    const approved = e.excuse_status === 'approved'
                    return (
                      <CardShell key={e.attendance_id}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                          <AbsenceInfo e={e} />
                          <div style={{ fontSize: '11px', fontWeight: '700', color: approved ? theme.colors.primary : theme.colors.danger, fontFamily: theme.fonts.primary, background: approved ? theme.colors.primaryLight : theme.colors.dangerLight, padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                            {approved ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {approved ? 'Approved' : 'Denied'}
                          </div>
                        </div>
                        <div style={{ marginTop: '12px', background: theme.colors.background, borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Reason submitted</div>
                          <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '2px' }}>{e.excuse_reason}</div>
                        </div>
                      </CardShell>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ParentExcuses