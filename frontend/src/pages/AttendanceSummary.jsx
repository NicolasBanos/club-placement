import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { ArrowLeft, AlertTriangle, X, Check, Clock, Filter } from 'lucide-react'
import theme from '../theme'
import api from '../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unexcused', label: 'Unexcused absences' },
  { key: 'excused', label: 'Excused absences' },
  { key: 'late', label: 'Late pickups' },
]

function AttendanceSummary() {
  const navigate = useNavigate()
  const role = localStorage.getItem('role')

  const [students, setStudents] = useState([])
  const [clubs, setClubs] = useState([])
  const [selectedClub, setSelectedClub] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role === 'coordinator') {
      api.get('/dashboard/clubs').then(res => setClubs(res.data)).catch(() => {})
    }
  }, [role])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (role === 'coordinator' && selectedClub !== 'all') {
      params.club_id = selectedClub
    }
    api.get('/attendance/summary', { params })
      .then(res => setStudents(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [role, selectedClub])

  const backPath = role === 'coordinator' ? '/coordinator/attendance' : '/teacher/attendance'

  const filtered = students.filter(s => {
    if (typeFilter === 'unexcused') return s.unexcused_absences > 0
    if (typeFilter === 'excused') return s.excused_absences > 0
    if (typeFilter === 'late') return s.late_pickups > 0
    return true
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate(backPath)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} color={theme.colors.textMuted} />
          </button>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Attendance Summary</div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Students sorted by unexcused absences, highest first</div>
          </div>
        </div>

        <div style={{ padding: '16px 28px 0', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {TYPE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                style={{
                  background: typeFilter === f.key ? theme.colors.primary : 'white',
                  color: typeFilter === f.key ? 'white' : theme.colors.textSecondary,
                  border: `1px solid ${typeFilter === f.key ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: '600',
                  fontFamily: theme.fonts.primary, cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {role === 'coordinator' && clubs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={13} color={theme.colors.textMuted} />
              <select
                value={selectedClub}
                onChange={e => setSelectedClub(e.target.value)}
                style={{ fontFamily: theme.fonts.primary, fontSize: '13px', padding: '6px 10px', borderRadius: '7px', border: `1px solid ${theme.colors.border}`, cursor: 'pointer' }}
              >
                <option value="all">All clubs</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ flex: 1, padding: '20px 28px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '24px', textAlign: 'center', fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
              No students match this filter.
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 130px 130px 130px', padding: '10px 16px', borderBottom: `1px solid ${theme.colors.border}`, background: theme.colors.background }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase' }}>Student</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase' }}>Grade</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase' }}>Unexcused</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase' }}>Excused</span>
                <span style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textTransform: 'uppercase' }}>Late pickups</span>
              </div>
              {filtered.map(s => {
                const atRisk = s.unexcused_absences >= 2
                return (
                  <div key={`${s.student_id}-${s.club_id}`} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 130px 130px 130px', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${theme.colors.border}`, background: atRisk ? theme.colors.dangerLight : 'white' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {atRisk && <AlertTriangle size={13} color={theme.colors.danger} />}
                        {s.first_name} {s.last_name}
                      </div>
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{s.club_name}</div>
                    </div>
                    <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>{GRADE_LABELS[s.grade]}</span>
                    <span style={{ fontSize: '13px', fontWeight: atRisk ? '800' : '600', color: atRisk ? theme.colors.danger : theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <X size={12} /> {s.unexcused_absences}
                    </span>
                    <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> {s.excused_absences}
                    </span>
                    <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {s.late_pickups}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AttendanceSummary