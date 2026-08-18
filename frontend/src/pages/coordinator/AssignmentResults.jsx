import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { CheckCircle, Clock, AlertCircle, Search, Filter, UserPlus } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function AssignmentResults() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('assigned')
  const [filterClub, setFilterClub] = useState('all')
  const [clubs, setClubs] = useState([])
  const [assigningStudent, setAssigningStudent] = useState(null)
  const [selectedClubId, setSelectedClubId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchData = async () => {
    try {
      const [resultsRes, clubsRes] = await Promise.all([
        api.get('/lottery/results'),
        api.get('/clubs/'),
      ])
      setResults(resultsRes.data)
      setClubs(clubsRes.data)
    } catch (err) {
      console.error('Failed to fetch results:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleAssign = async (studentId) => {
    if (!selectedClubId) return
    setAssigning(true)
    try {
      const res = await api.post(`/roster/assign/${studentId}?club_id=${selectedClubId}`)
      showMessage(res.data.message)
      setAssigningStudent(null)
      setSelectedClubId('')
      fetchData()
    } catch (err) {
      showMessage(err.response?.data?.detail || 'Failed to assign student', 'error')
    } finally {
      setAssigning(false)
    }
  }

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
          padding: isMobile ? '68px 16px 16px' : '16px 28px',
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
              Review all lottery assignments
            </div>
          </div>
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
        <div style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading results...</div>
          ) : !results ? (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={36} color={theme.colors.primary} style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>No results yet</div>
              <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Run the lottery first to see assignment results</div>
            </div>
          ) : (
            <>
              {/* Tab buttons */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
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
              <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
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
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px', flexDirection: isMobile ? 'column' : 'row' }}>
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
                        <div style={{ textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto' }}>
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
                            <button
                              onClick={() => setAssigningStudent(assigningStudent === student.id ? null : student.id)}
                              style={{
                                background: theme.colors.primaryLight,
                                color: theme.colors.primary,
                                border: 'none',
                                borderRadius: '7px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                fontFamily: theme.fonts.primary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                              <UserPlus size={12} /> Assign to Club
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Assign dropdown */}
                      {activeTab === 'unassigned' && assigningStudent === student.id && (
                        <div style={{
                          background: theme.colors.background,
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          marginLeft: '20px',
                        }}>
                          <select
                            value={selectedClubId}
                            onChange={e => setSelectedClubId(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: `1.5px solid ${theme.colors.border}`,
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontFamily: theme.fonts.primary,
                              outline: 'none',
                              backgroundColor: 'white',
                            }}>
                            <option value="">Select a club...</option>
                            {clubs
                              .filter(c => c.grade_min <= student.grade && student.grade <= c.grade_max && c.enrolled < c.max_students)
                              .map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.max_students - c.enrolled} spots left)
                                </option>
                              ))
                            }
                          </select>
                          <button
                            onClick={() => handleAssign(student.id)}
                            disabled={!selectedClubId || assigning}
                            style={{
                              background: theme.colors.primary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontSize: '13px',
                              fontWeight: '600',
                              fontFamily: theme.fonts.primary,
                              cursor: !selectedClubId || assigning ? 'not-allowed' : 'pointer',
                              opacity: !selectedClubId ? 0.6 : 1,
                            }}>
                            {assigning ? 'Assigning...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => { setAssigningStudent(null); setSelectedClubId('') }}
                            style={{
                              background: 'white',
                              color: theme.colors.textMuted,
                              border: `1px solid ${theme.colors.border}`,
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '13px',
                              fontFamily: theme.fonts.primary,
                              cursor: 'pointer',
                            }}>
                            Cancel
                          </button>
                        </div>
                      )}
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