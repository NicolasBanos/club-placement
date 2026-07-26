import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { CheckCircle, Clock, AlertCircle, Search, Filter } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function AssignmentResults() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('assigned')
  const [filterClub, setFilterClub] = useState('all')

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await api.get('/lottery/results')
        setResults(res.data)
      } catch (err) {
        console.error('Failed to fetch results:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchResults()
  }, [])

  const getClubOptions = () => {
    if (!results) return []
    const clubs = new Set(results.assigned.map(s => s.club_name))
    return ['all', ...clubs]
  }

  const filterStudents = (students) => {
    return students.filter(s => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
      const matchesSearch = fullName.includes(search.toLowerCase())
      const matchesClub = filterClub === 'all' || s.club_name === filterClub
      return matchesSearch && matchesClub
    })
  }

  const tabs = [
    { key: 'assigned', label: 'Assigned', count: results?.total_assigned || 0, color: theme.colors.primary, icon: CheckCircle },
    { key: 'waitlisted', label: 'Waitlisted', count: results?.total_waitlisted || 0, color: theme.colors.warning, icon: Clock },
    { key: 'unassigned', label: 'Unassigned', count: results?.total_unassigned || 0, color: theme.colors.danger, icon: AlertCircle },
  ]

  const currentStudents = results ? filterStudents(results[activeTab]) : []

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
              Assignment Results
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Review all lottery assignments before finalizing
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading results...</div>
          ) : !results ? (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🦉</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>No results yet</div>
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>Run the lottery first to see assignment results</div>
            </div>
          ) : (
            <>
              {/* Tab buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        background: isActive ? tab.color : 'white',
                        color: isActive ? 'white' : tab.color,
                        border: `2px solid ${tab.color}`,
                        borderRadius: '9px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        fontFamily: theme.fonts.primary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                      <Icon size={14} />
                      {tab.label}
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.25)' : `${tab.color}20`,
                        borderRadius: '20px',
                        padding: '1px 8px',
                        fontSize: '12px',
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Search and filter */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} color="#aaa" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    placeholder="Search by student name..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      border: `1.5px solid ${theme.colors.border}`,
                      borderRadius: '9px',
                      fontSize: '13px',
                      fontFamily: theme.fonts.primary,
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  />
                </div>
                {activeTab === 'assigned' && (
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Filter size={14} color="#aaa" style={{ position: 'absolute', left: '12px' }} />
                    <select
                      value={filterClub}
                      onChange={e => setFilterClub(e.target.value)}
                      style={{
                        padding: '10px 12px 10px 36px',
                        border: `1.5px solid ${theme.colors.border}`,
                        borderRadius: '9px',
                        fontSize: '13px',
                        fontFamily: theme.fonts.primary,
                        outline: 'none',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                      }}>
                      {getClubOptions().map(club => (
                        <option key={club} value={club}>{club === 'all' ? 'All Clubs' : club}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Student list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentStudents.length === 0 ? (
                  <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', textAlign: 'center', border: `1px solid ${theme.colors.border}`, color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>
                    No students found
                  </div>
                ) : (
                  currentStudents.map(student => (
                    <div key={student.id} style={{
                      background: 'white',
                      borderRadius: theme.borderRadius.lg,
                      padding: '16px 20px',
                      border: `1px solid ${theme.colors.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}>
                      {/* Status indicator */}
                      <div style={{
                        width: '4px',
                        borderRadius: '4px',
                        alignSelf: 'stretch',
                        backgroundColor: activeTab === 'assigned' ? theme.colors.primary : activeTab === 'waitlisted' ? theme.colors.warning : theme.colors.danger,
                        flexShrink: 0,
                      }} />

                      {/* Student info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>
                            {student.first_name} {student.last_name}
                          </span>
                          <span style={{ background: theme.colors.primaryLight, color: theme.colors.primary, fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '4px', fontFamily: theme.fonts.primary }}>
                            Grade {GRADE_LABELS[student.grade]}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                          {student.family_name} family · {student.teacher} · {student.dismissal_method}
                        </div>
                      </div>

                      {/* Assignment info */}
                      <div style={{ textAlign: 'right' }}>
                        {activeTab === 'assigned' && (
                          <>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{student.club_name}</div>
                            <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{student.room_number} · {student.dismissal_location}</div>
                          </>
                        )}
                        {activeTab === 'waitlisted' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                            {student.waitlist_entries?.map((entry, i) => (
                              <div key={i} style={{ fontSize: '11px', color: theme.colors.warning, fontFamily: theme.fonts.primary, fontWeight: '600' }}>
                                #{entry.position} on {entry.club_name}
                              </div>
                            ))}
                          </div>
                        )}
                        {activeTab === 'unassigned' && (
                          <div style={{ fontSize: '12px', color: theme.colors.danger, fontFamily: theme.fonts.primary }}>
                            No valid choices available
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssignmentResults