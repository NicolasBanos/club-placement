import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { Trophy, Send, Users, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function LotteryRunner() {
  const navigate = useNavigate()
  const [families, setFamilies] = useState([])
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [sending, setSending] = useState(false)
  const [lettersSent, setLettersSent] = useState(false)
  const [expandedFamilies, setExpandedFamilies] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [familiesRes, resultsRes] = await Promise.all([
          api.get('/lottery/families'),
          api.get('/lottery/results'),
        ])
        setFamilies(familiesRes.data)

        // If there are existing assignments load them automatically
        const hasResults = resultsRes.data.total_assigned > 0 ||
                          resultsRes.data.total_waitlisted > 0

        if (hasResults) {
          setResults({
            total_assigned: resultsRes.data.total_assigned,
            total_waitlisted: resultsRes.data.total_waitlisted,
            family_order: [],
            results: familiesRes.data.map(family => ({
              family_id: family.id,
              family_name: family.family_name,
              students: family.students.map(s => {
                const assigned = resultsRes.data.assigned.find(a => a.id === s.id)
                const waitlisted = resultsRes.data.waitlisted.find(w => w.id === s.id)
                return {
                  ...s,
                  assigned_club: assigned?.club_name || null,
                  waitlisted_clubs: waitlisted?.waitlist_entries?.map(e => e.club_name) || [],
                }
              })
            }))
          })
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleRunLottery = async () => {
    if (!window.confirm('Are you sure you want to run the lottery? This will clear any existing assignments.')) return
    setRunning(true)
    setError('')
    try {
      const res = await api.post('/lottery/run')
      setResults(res.data)
      setLettersSent(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to run lottery')
    } finally {
      setRunning(false)
    }
  }

  const handleSendLetters = async () => {
    if (!window.confirm('Send acceptance letters to all families? This cannot be undone.')) return
    setSending(true)
    try {
      await api.post('/lottery/send-letters')
      setLettersSent(true)
    } catch (err) {
      setError('Failed to send letters')
    } finally {
      setSending(false)
    }
  }

  const toggleFamily = (familyId) => {
    setExpandedFamilies(prev => ({ ...prev, [familyId]: !prev[familyId] }))
  }

  const totalStudents = families.reduce((sum, f) => sum + f.students.length, 0)

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
              Lottery Runner
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              {totalStudents} students · {families.length} families
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {results && !lettersSent && (
              <button
                onClick={handleSendLetters}
                disabled={sending}
                style={{
                  background: theme.colors.info,
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
                  cursor: sending ? 'not-allowed' : 'pointer',
                }}>
                <Send size={14} /> {sending ? 'Sending...' : 'Send Acceptance Letters'}
              </button>
            )}
            {lettersSent && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.colors.primary, fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary }}>
                <CheckCircle size={16} /> Letters Sent!
              </div>
            )}
            <button
              onClick={handleRunLottery}
              disabled={running}
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
                cursor: running ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(26,92,26,0.25)',
              }}>
              <Trophy size={14} /> {running ? 'Running...' : results ? 'Re-run Lottery' : 'Run Lottery'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ margin: '16px 28px 0', background: theme.colors.dangerLight, border: `1px solid ${theme.colors.danger}`, borderRadius: '9px', padding: '12px 16px', color: theme.colors.danger, fontSize: '13px', fontFamily: theme.fonts.primary }}>
            {error}
          </div>
        )}

        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', gap: '20px' }}>

          {/* Results panel */}
          {results && (
            <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '16px' }}>
                  Lottery Results
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: theme.colors.primaryLight, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={16} color={theme.colors.primary} />
                    </div>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{results.total_assigned}</div>
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Assigned</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: theme.colors.warningLight, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} color={theme.colors.warning} />
                    </div>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: theme.colors.warning, fontFamily: theme.fonts.primary }}>{results.total_waitlisted}</div>
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Waitlisted</div>
                    </div>
                  </div>
                </div>
              </div>

              {results.family_order && results.family_order.length > 0 && (
                <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '12px' }}>
                    Lottery Order
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {results.family_order.map((familyId, index) => {
                      const family = families.find(f => f.id === familyId)
                      return (
                        <div key={familyId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, flexShrink: 0 }}>
                            {index + 1}
                          </div>
                          <span style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                            {family?.family_name} family
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading...</div>
            ) : families.length === 0 ? (
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Users size={36} color={theme.colors.primary} style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>No families yet</div>
                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Families will appear here once parents register and submit their club choices</div>
              </div>
            ) : (
              (results ? results.results : families).map(family => {
                const isExpanded = expandedFamilies[family.family_id || family.id]
                const familyId = family.family_id || family.id
                const students = family.students

                return (
                  <div key={familyId} style={{
                    background: 'white',
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    overflow: 'hidden',
                  }}>
                    <div
                      onClick={() => toggleFamily(familyId)}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: theme.colors.primaryLight, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={16} color={theme.colors.primary} />
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                            {family.family_name} Family
                          </div>
                          <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                            {students.length} student{students.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {results && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {students.every(s => s.assigned_club) && (
                              <span style={{ background: theme.colors.primaryLight, color: theme.colors.primary, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontFamily: theme.fonts.primary }}>All Assigned</span>
                            )}
                            {students.some(s => s.waitlisted_clubs?.length > 0) && (
                              <span style={{ background: theme.colors.warningLight, color: theme.colors.warning, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontFamily: theme.fonts.primary }}>Waitlisted</span>
                            )}
                          </div>
                        )}
                        {isExpanded ? <ChevronUp size={16} color={theme.colors.textMuted} /> : <ChevronDown size={16} color={theme.colors.textMuted} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                        {students.map((student, i) => (
                          <div key={student.id} style={{
                            padding: '14px 20px',
                            borderBottom: i < students.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            backgroundColor: '#fafffe',
                          }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>
                                {student.first_name} {student.last_name}
                                <span style={{ fontSize: '11px', fontWeight: '400', color: theme.colors.textMuted, marginLeft: '8px' }}>
                                  Grade {student.grade === 0 ? 'K' : student.grade}
                                </span>
                              </div>
                              {!results && (
                                <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '3px' }}>
                                  {[student.choice1, student.choice2, student.choice3].filter(Boolean).join(' → ')}
                                </div>
                              )}
                            </div>
                            {results && (
                              <div>
                                {student.assigned_club ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle size={14} color={theme.colors.primary} />
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{student.assigned_club}</span>
                                  </div>
                                ) : student.waitlisted_clubs?.length > 0 ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Clock size={14} color={theme.colors.warning} />
                                    <span style={{ fontSize: '12px', color: theme.colors.warning, fontFamily: theme.fonts.primary }}>Waitlisted</span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <AlertCircle size={14} color={theme.colors.danger} />
                                    <span style={{ fontSize: '12px', color: theme.colors.danger, fontFamily: theme.fonts.primary }}>No valid choices</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LotteryRunner