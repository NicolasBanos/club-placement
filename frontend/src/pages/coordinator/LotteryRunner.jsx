import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import theme from '../../theme'
import api from '../../api/axios'
import { Trophy, Send, Users, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Search, List, Lock, Unlock } from 'lucide-react'

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
  const [viewMode, setViewMode] = useState('results')  // 'results' | 'registrants'
  const [searchTerm, setSearchTerm] = useState('')
  const [locked, setLocked] = useState(false)
  const [lockLoading, setLockLoading] = useState(false)
  const [duplicates, setDuplicates] = useState(null)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [showDuplicates, setShowDuplicates] = useState(false)

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [familiesRes, resultsRes, lockRes] = await Promise.all([
          api.get('/lottery/families'),
          api.get('/lottery/results'),
          api.get('/dashboard/lock-status'),
        ])
        setFamilies(familiesRes.data)
        setLocked(lockRes.data.registration_locked)

        // If there are existing assignments load them automatically
        const hasResults = resultsRes.data.total_assigned > 0 ||
                          resultsRes.data.total_waitlisted > 0

        if (hasResults) {
          const resultFamilies = familiesRes.data
            .map(family => {
              const studentsWithResults = family.students
                .map(s => {
                  const assigned = resultsRes.data.assigned.find(a => a.id === s.id)
                  const waitlisted = resultsRes.data.waitlisted.find(w => w.id === s.id)
                  if (!assigned && !waitlisted) return null  // student not part of this lottery run
                  return {
                    ...s,
                    assigned_club: assigned?.club_name || null,
                    waitlisted_clubs: waitlisted?.waitlist_entries?.map(e => e.club_name) || [],
                  }
                })
                .filter(Boolean)

              if (studentsWithResults.length === 0) return null  // no students in this family had results
              return {
                family_id: family.id,
                family_name: family.family_name,
                students: studentsWithResults,
              }
            })
            .filter(Boolean)

          setResults({
            total_assigned: resultsRes.data.total_assigned,
            total_waitlisted: resultsRes.data.total_waitlisted,
            family_order: [],
            results: resultFamilies,
          })
          setViewMode('results')
        } else {
          setViewMode('registrants')
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
      setViewMode('results')
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

  const handleToggleLock = async () => {
    const newState = !locked
    const confirmMsg = newState
      ? 'Lock registration? Parents will no longer be able to add children or change club choices.'
      : 'Unlock registration? Parents will be able to add children and change club choices again.'
    if (!window.confirm(confirmMsg)) return
    setLockLoading(true)
    try {
      const res = await api.put('/dashboard/lock-status', { locked: newState })
      setLocked(res.data.registration_locked)
    } catch (err) {
      setError('Failed to update registration lock')
    } finally {
      setLockLoading(false)
    }
  }

  const handleCheckDuplicates = async () => {
    setCheckingDuplicates(true)
    try {
      const res = await api.get('/lottery/duplicates')
      setDuplicates(res.data)
      setShowDuplicates(true)
    } catch (err) {
      setError('Failed to check for duplicates')
    } finally {
      setCheckingDuplicates(false)
    }
  }

  const handleDeleteRegistrant = async (studentId, studentName) => {
    if (!window.confirm(`Remove ${studentName} from the registrant list? This cannot be undone.`)) return
    try {
      await api.delete(`/lottery/students/${studentId}`)
      setError('')
      // refresh both families and any open duplicate report
      const familiesRes = await api.get('/lottery/families')
      setFamilies(familiesRes.data)
      if (duplicates) {
        const dupRes = await api.get('/lottery/duplicates')
        setDuplicates(dupRes.data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to remove student')
    }
  }

  const toggleFamily = (familyId) => {
    const key = `${viewMode}-${familyId}`
    setExpandedFamilies(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const totalStudents = families.reduce((sum, f) => sum + f.students.length, 0)

  // Which dataset to show, depending on view mode
  const displayList = viewMode === 'results' && results ? results.results : families

  // Apply search filter (matches family name or any student's first/last name)
  const term = searchTerm.trim().toLowerCase()
  const filteredList = term === '' ? displayList : displayList.filter(family => {
    const familyName = (family.family_name || '').toLowerCase()
    if (familyName.includes(term)) return true
    return family.students.some(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(term)
    )
  })

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
          gap: isMobile ? '12px' : '0',
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
              Lottery Runner
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              {totalStudents} students · {families.length} families
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={handleToggleLock}
              disabled={lockLoading}
              style={{
                background: locked ? theme.colors.dangerLight : 'white',
                color: locked ? theme.colors.danger : theme.colors.textSecondary,
                border: `1px solid ${locked ? theme.colors.danger : theme.colors.border}`,
                borderRadius: '9px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: theme.fonts.primary,
                cursor: lockLoading ? 'not-allowed' : 'pointer',
              }}>
              {lockLoading ? (
                'Updating…'
              ) : locked ? (
                <><Lock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Registration Locked</>
              ) : (
                <><Unlock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />Lock Registration</>
              )}
            </button>
            <button
              onClick={handleCheckDuplicates}
              disabled={checkingDuplicates}
              style={{
                background: 'white',
                color: theme.colors.textSecondary,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '9px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: '600',
                fontFamily: theme.fonts.primary,
                cursor: checkingDuplicates ? 'not-allowed' : 'pointer',
              }}>
              {checkingDuplicates ? 'Checking…' : 'Check for Duplicates'}
            </button>
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

        {/* View mode toggle + search */}
        <div style={{ margin: isMobile ? '16px 16px 0' : '16px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setViewMode('registrants')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: viewMode === 'registrants' ? theme.colors.primary : 'white',
                color: viewMode === 'registrants' ? 'white' : theme.colors.textSecondary,
                border: `1px solid ${viewMode === 'registrants' ? theme.colors.primary : theme.colors.border}`,
                borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '600',
                fontFamily: theme.fonts.primary, cursor: 'pointer',
              }}
            >
              <List size={13} /> Current Registrants
            </button>
            {results && (
              <button
                onClick={() => setViewMode('results')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: viewMode === 'results' ? theme.colors.primary : 'white',
                  color: viewMode === 'results' ? 'white' : theme.colors.textSecondary,
                  border: `1px solid ${viewMode === 'results' ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '600',
                  fontFamily: theme.fonts.primary, cursor: 'pointer',
                }}
              >
                <Trophy size={13} /> Lottery Results
              </button>
            )}
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={14} color={theme.colors.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search family or student"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 34px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px' }}
            />
          </div>
        </div>

        {showDuplicates && duplicates && (
          <div style={{ margin: '16px 28px 0', background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                Duplicate Check Results
              </div>
              <button onClick={() => setShowDuplicates(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                Dismiss
              </button>
            </div>

            {duplicates.duplicate_students.length === 0 && duplicates.duplicate_families.length === 0 ? (
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>
                No possible duplicates found.
              </div>
            ) : (
              <>
                {duplicates.duplicate_students.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.warning, fontFamily: theme.fonts.primary, marginBottom: '8px' }}>
                      Possible duplicate students ({duplicates.duplicate_students.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {duplicates.duplicate_students.map((d, i) => (
                        <div key={i} style={{ background: theme.colors.warningLight, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontFamily: theme.fonts.primary }}>
                          <strong>{d.first_name} {d.last_name}</strong> — Grade {d.grade === 0 ? 'K' : d.grade}
                          {d.different_families && <span style={{ color: theme.colors.danger, fontWeight: '700', marginLeft: '6px' }}>· different families</span>}
                          <div style={{ marginTop: '4px', color: theme.colors.textSecondary }}>
                            {d.entries.map(e => e.family_name).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {duplicates.duplicate_families.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.warning, fontFamily: theme.fonts.primary, marginBottom: '8px' }}>
                      Possible duplicate families ({duplicates.duplicate_families.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {duplicates.duplicate_families.map((d, i) => (
                        <div key={i} style={{ background: theme.colors.warningLight, borderRadius: '8px', padding: '10px 14px', fontSize: '12px', fontFamily: theme.fonts.primary }}>
                          Matched on <strong>{d.matched_on}</strong>: {d.value}
                          <div style={{ marginTop: '4px', color: theme.colors.textSecondary }}>
                            {d.families.map(f => f.family_name).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}


        <div style={{ flex: 1, padding: isMobile ? '16px' : '16px 28px 24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>

          {/* Results panel — only show alongside the results view */}
          {results && viewMode === 'results' && (
            <div style={{ width: isMobile ? '100%' : '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
            ) : filteredList.length === 0 ? (
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '30px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No families or students match "{searchTerm}"</div>
              </div>
            ) : (
              filteredList.map(family => {
                const isExpanded = expandedFamilies[`${viewMode}-${family.family_id || family.id}`]
                const familyId = family.family_id || family.id
                const students = family.students
                const showResults = viewMode === 'results' && results

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
                        {showResults && (
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
                              {!showResults && (
                                <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '3px' }}>
                                  {[student.choice1, student.choice2, student.choice3].filter(Boolean).join(' → ') || 'No choices submitted'}
                                </div>
                              )}
                            </div>
                            {viewMode === 'registrants' && (
                              <button
                                onClick={() => handleDeleteRegistrant(student.id, `${student.first_name} ${student.last_name}`)}
                                style={{ background: theme.colors.dangerLight, color: theme.colors.danger, border: 'none', borderRadius: '7px', padding: '6px 12px', fontSize: '11px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', flexShrink: 0 }}
                              >
                                Remove
                              </button>
                            )}
                            {showResults && (
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