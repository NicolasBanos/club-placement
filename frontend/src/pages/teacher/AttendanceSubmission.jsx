import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { CalendarCheck, AlertCircle, Check, X, FileCheck, Clock } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', icon: Check, color: theme.colors.primary, bg: theme.colors.primaryLight },
  { value: 'absent', label: 'Absent', icon: X, color: theme.colors.danger, bg: theme.colors.dangerLight },
  { value: 'excused', label: 'Excused', icon: FileCheck, color: theme.colors.warning, bg: theme.colors.warningLight },
]

function AttendanceSubmission() {
  const [data, setData] = useState(null)
  const [marks, setMarks] = useState({})       // student_id -> { status, late_pickup }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')

  const load = () => {
    api.get('/attendance/mine-today')
      .then(res => {
        setData(res.data)
        const initial = {}
        res.data.students.forEach(s => {
          initial[s.student_id] = {
            status: s.status === 'unmarked' ? null : s.status,
            late_pickup: s.late_pickup,
          }
        })
        setMarks(initial)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const flash = (text, type = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  const setStatus = (studentId, status) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], status } }))
  }

  const toggleLate = (studentId) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], late_pickup: !prev[studentId]?.late_pickup } }))
  }

  const markAllPresent = () => {
    const updated = {}
    data.students.forEach(s => {
      updated[s.student_id] = { status: 'present', late_pickup: marks[s.student_id]?.late_pickup || false }
    })
    setMarks(updated)
  }

  const submit = async () => {
    const unmarked = data.students.filter(s => !marks[s.student_id]?.status)
    if (unmarked.length > 0) {
      flash(`Please mark a status for all students (${unmarked.length} remaining)`, 'error')
      return
    }
    setSaving(true)
    try {
      await api.post('/attendance/submit', {
        meeting_date_id: data.meeting_date_id,
        records: data.students.map(s => ({
          student_id: s.student_id,
          status: marks[s.student_id].status,
          late_pickup: marks[s.student_id].late_pickup || false,
        })),
      })
      flash('Attendance submitted successfully.')
      load()
    } catch (e) {
      flash(e.response?.data?.detail || 'Failed to submit attendance', 'error')
    } finally {
      setSaving(false)
    }
  }

  const allMarked = data && data.students.length > 0 && data.students.every(s => marks[s.student_id]?.status)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Attendance</div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Submit today's attendance for your club</div>
        </div>

        {msg && (
          <div style={{ margin: '16px 28px 0', background: msgType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight, border: `1px solid ${msgType === 'error' ? theme.colors.danger : theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: msgType === 'error' ? theme.colors.danger : theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>{msg}</div>
        )}

        <div style={{ flex: 1, padding: '24px 28px', maxWidth: '820px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : !data.meeting_today ? (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertCircle size={20} color={theme.colors.textMuted} />
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                {data.club_id ? 'No club meeting scheduled today.' : 'No club has been assigned to your account yet.'}
              </div>
            </div>
          ) : (
            <>
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '18px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CalendarCheck size={18} color={theme.colors.primary} />
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{data.club_name}</span>
                  <span style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{data.students.length} student{data.students.length === 1 ? '' : 's'}</span>
                </div>
                <button
                  onClick={markAllPresent}
                  style={{ background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}
                >
                  Mark all present
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {data.students.map(s => {
                  const mark = marks[s.student_id] || {}
                  return (
                    <div key={s.student_id} style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ minWidth: '160px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{s.first_name} {s.last_name}</div>
                        <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Grade {GRADE_LABELS[s.grade] ?? s.grade}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {STATUS_OPTIONS.map(opt => {
                          const Icon = opt.icon
                          const isSelected = mark.status === opt.value
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setStatus(s.student_id, opt.value)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                background: isSelected ? opt.color : opt.bg,
                                color: isSelected ? 'white' : opt.color,
                                border: `1px solid ${opt.color}`,
                                borderRadius: '7px',
                                padding: '7px 12px',
                                fontSize: '12px',
                                fontWeight: '700',
                                fontFamily: theme.fonts.primary,
                                cursor: 'pointer',
                              }}
                            >
                              <Icon size={13} /> {opt.label}
                            </button>
                          )
                        })}

                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, cursor: 'pointer', marginLeft: '6px' }}>
                          <input
                            type="checkbox"
                            checked={!!mark.late_pickup}
                            onChange={() => toggleLate(s.student_id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <Clock size={12} /> Late pickup
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={submit}
                disabled={!allMarked || saving}
                style={{
                  background: allMarked ? theme.colors.primary : theme.colors.border,
                  color: 'white',
                  border: 'none',
                  borderRadius: '9px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '700',
                  fontFamily: theme.fonts.primary,
                  cursor: allMarked ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Submitting…' : 'Submit attendance'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AttendanceSubmission