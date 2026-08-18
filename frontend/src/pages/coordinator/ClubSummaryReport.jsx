import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Printer, BarChart2, Settings, Users, Clock, School } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function ClubSummaryReport() {
  const [clubs, setClubs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Config toggles
  const [groupBy, setGroupBy] = useState('club')            // club | teacher
  const [includeWaitlist, setIncludeWaitlist] = useState(true)
  const [includeStats, setIncludeStats] = useState(true)
  const [clubFilter, setClubFilter] = useState('all')       // all | capacity | open
  const [sortBy, setSortBy] = useState('name')              // name | fill
  const [selectedClubId, setSelectedClubId] = useState('all')   // 'all' | club id
  const [selectedTeacher, setSelectedTeacher] = useState('all') // 'all' | teacher name

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rosterRes, statsRes] = await Promise.all([
          api.get('/roster/'),
          api.get('/dashboard/stats'),
        ])
        setClubs(rosterRes.data)
        setStats(statsRes.data)
      } catch (err) {
        console.error('Failed to load report data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handlePrint = () => window.print()

  // Apply filter + sort (club view)
  const processedClubs = () => {
    let list = [...clubs]
    if (selectedClubId !== 'all') {
      list = list.filter(c => c.id === Number(selectedClubId))
    }
    if (clubFilter === 'capacity') {
      list = list.filter(c => c.enrolled_count >= c.max_students)
    } else if (clubFilter === 'open') {
      list = list.filter(c => c.enrolled_count < c.max_students)
    }
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      list.sort((a, b) => (b.enrolled_count / b.max_students) - (a.enrolled_count / a.max_students))
    }
    return list
  }

  // Flatten all enrolled students across every club, grouped by homeroom teacher
  const groupedByTeacher = () => {
    const groups = {}
    for (const club of clubs) {
      for (const s of club.enrolled) {
        const key = s.teacher || 'No homeroom teacher on file'
        if (!groups[key]) groups[key] = []
        groups[key].push({ ...s, club_name: club.name, room_number: club.room_number })
      }
    }
    let teacherNames = Object.keys(groups).sort((a, b) => a.localeCompare(b))
    if (selectedTeacher !== 'all') {
      teacherNames = teacherNames.filter(t => t === selectedTeacher)
    }
    return teacherNames.map(name => ({
      teacher: name,
      students: groups[name].sort((a, b) => a.last_name.localeCompare(b.last_name)),
    }))
  }

  const allTeacherNames = () => {
    const set = new Set()
    for (const club of clubs) {
      for (const s of club.enrolled) {
        set.add(s.teacher || 'No homeroom teacher on file')
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const shownClubs = processedClubs()
  const shownTeachers = groupedByTeacher()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-area { padding: 0 !important; }
          body { background: white !important; }
          .club-card { break-inside: avoid; page-break-inside: avoid; }
          .teacher-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print">
        <Sidebar />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div className="no-print" style={{
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
              Club Summary Report
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Printable overview of all clubs, enrollment, and waitlists
            </div>
          </div>
          <button
            onClick={handlePrint}
            style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', width: isMobile ? '100%' : 'auto' }}>
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>

        <div className="no-print" style={{ padding: isMobile ? '16px 16px 0' : '16px 28px 0' }}>
          <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '16px 20px', border: `1px solid ${theme.colors.border}`, display: 'flex', gap: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: theme.colors.primary, fontFamily: theme.fonts.primary, fontSize: '12px', fontWeight: '700' }}>
              <Settings size={14} /> REPORT OPTIONS
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: theme.fonts.primary, fontSize: '13px', color: theme.colors.textMuted }}>Group by:</span>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={{ fontFamily: theme.fonts.primary, fontSize: '13px', padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.colors.border}`, cursor: 'pointer' }}>
                <option value="club">Club</option>
                <option value="teacher">Homeroom teacher</option>
              </select>
            </div>

            {groupBy === 'club' && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: theme.fonts.primary, fontSize: '13px', color: theme.colors.textSecondary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeStats} onChange={e => setIncludeStats(e.target.checked)} />
                  Session stats
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: theme.fonts.primary, fontSize: '13px', color: theme.colors.textSecondary, cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeWaitlist} onChange={e => setIncludeWaitlist(e.target.checked)} />
                  Waitlists
                </label>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: theme.fonts.primary, fontSize: '13px', color: theme.colors.textMuted }}>Club:</span>
                  <select value={selectedClubId} onChange={e => setSelectedClubId(e.target.value)} style={{ fontFamily: theme.fonts.primary, fontSize: '13px', padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.colors.border}`, cursor: 'pointer' }}>
                    <option value="all">All clubs</option>
                    {[...clubs].sort((a, b) => a.name.localeCompare(b.name)).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: theme.fonts.primary, fontSize: '13px', color: theme.colors.textMuted }}>Show:</span>
                  <select value={clubFilter} onChange={e => setClubFilter(e.target.value)} style={{ fontFamily: theme.fonts.primary, fontSize: '13px', padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.colors.border}`, cursor: 'pointer' }}>
                    <option value="all">All clubs</option>
                    <option value="capacity">At capacity only</option>
                    <option value="open">Open spots only</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: theme.fonts.primary, fontSize: '13px', color: theme.colors.textMuted }}>Sort:</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontFamily: theme.fonts.primary, fontSize: '13px', padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.colors.border}`, cursor: 'pointer' }}>
                    <option value="name">By name</option>
                    <option value="fill">By fill level</option>
                  </select>
                </div>
              </>
            )}

            {groupBy === 'teacher' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontFamily: theme.fonts.primary, fontSize: '13px', color: theme.colors.textMuted }}>Teacher:</span>
                <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)} style={{ fontFamily: theme.fonts.primary, fontSize: '13px', padding: '5px 8px', borderRadius: '6px', border: `1px solid ${theme.colors.border}`, cursor: 'pointer' }}>
                  <option value="all">All teachers</option>
                  {allTeacherNames().map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="report-area" style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading report...</div>
          ) : (
            <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: theme.borderRadius.lg, padding: isMobile ? '18px' : '36px', border: `1px solid ${theme.colors.border}` }}>

              <div style={{ borderBottom: `2px solid ${theme.colors.primary}`, paddingBottom: '16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                  {groupBy === 'club' ? 'Club Summary Report' : 'After-School Clubs by Homeroom Teacher'}
                </div>
                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>
                  Plantation Park Elementary · {today}
                </div>
              </div>

              {groupBy === 'club' && includeStats && stats && (
                <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Enrolled', value: stats.total_enrolled, color: theme.colors.primary },
                    { label: 'Waitlisted', value: stats.total_waitlisted, color: theme.colors.warning },
                    { label: 'Unassigned', value: stats.total_unassigned, color: theme.colors.danger },
                    { label: 'Clubs at capacity', value: stats.clubs_at_capacity, color: theme.colors.info },
                  ].map(stat => (
                    <div key={stat.label} style={{ flex: '1 1 140px', background: theme.colors.background, borderRadius: theme.borderRadius.md, padding: '16px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                      <div style={{ fontSize: '26px', fontWeight: '800', color: stat.color, fontFamily: theme.fonts.primary }}>{stat.value}</div>
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* ---------- Club view ---------- */}
              {groupBy === 'club' && (
                shownClubs.length === 0 ? (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>
                    No clubs match the selected filter.
                  </div>
                ) : shownClubs.map(club => {
                  const spots = club.max_students - club.enrolled_count
                  return (
                    <div key={club.id} className="club-card" style={{ marginBottom: '20px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, overflow: 'hidden' }}>
                      <div style={{ background: theme.colors.primaryLight, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{club.name}</div>
                          <div style={{ fontSize: '11px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
                            {club.instructor} · {club.room_number} · Grades {GRADE_LABELS[club.grade_min]}–{GRADE_LABELS[club.grade_max]}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: spots > 0 ? theme.colors.primary : theme.colors.danger, fontFamily: theme.fonts.primary }}>
                            {club.enrolled_count}/{club.max_students}
                          </div>
                          <div style={{ fontSize: '10px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                            {spots > 0 ? `${spots} spot${spots > 1 ? 's' : ''} open` : 'Full'}
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Users size={12} /> ENROLLED ({club.enrolled.length})
                        </div>
                        {club.enrolled.length === 0 ? (
                          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>None enrolled</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {club.enrolled.map(s => (
                              <div key={s.student_id} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                                {s.first_name} {s.last_name} · Grade {GRADE_LABELS[s.grade]} · {s.teacher}
                              </div>
                            ))}
                          </div>
                        )}

                        {includeWaitlist && (
                          <div style={{ marginTop: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={12} /> WAITLIST ({club.waitlist.length})
                            </div>
                            {club.waitlist.length === 0 ? (
                              <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No students waiting</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {club.waitlist.map(s => (
                                  <div key={s.waitlist_id} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                                    {s.position}. {s.first_name} {s.last_name} · Grade {GRADE_LABELS[s.grade]} · {s.teacher}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* ---------- Homeroom teacher view ---------- */}
              {groupBy === 'teacher' && (
                shownTeachers.length === 0 ? (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>
                    No enrolled students found.
                  </div>
                ) : shownTeachers.map(group => (
                  <div key={group.teacher} className="teacher-card" style={{ marginBottom: '20px', border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.lg, overflow: 'hidden' }}>
                    <div style={{ background: theme.colors.primaryLight, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <School size={15} /> {group.teacher}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                        {group.students.length} student{group.students.length === 1 ? '' : 's'} in after-school clubs
                      </div>
                    </div>
                    <div style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {group.students.map(s => (
                          <div key={`${s.student_id}-${s.club_name}`} style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{s.first_name} {s.last_name} · Grade {GRADE_LABELS[s.grade]}</span>
                            <span style={{ color: theme.colors.textMuted }}>{s.club_name} ({s.room_number})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClubSummaryReport