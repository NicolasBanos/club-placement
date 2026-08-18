import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { CalendarCheck, AlertTriangle, ClipboardList, BarChart2 } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

const STATUS_STYLES = {
    present: { label: 'Present', color: theme.colors.primary, bg: theme.colors.primaryLight },
    absent: { label: 'Absent', color: theme.colors.danger, bg: theme.colors.dangerLight },
    excused: { label: 'Excused', color: theme.colors.info, bg: theme.colors.infoLight },
    unmarked: { label: 'Not marked', color: theme.colors.textMuted, bg: theme.colors.background },
}

function formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function AttendanceOverview() {
    const navigate = useNavigate()
    const [dates, setDates] = useState([])
    const [selectedDate, setSelectedDate] = useState('')
    const [clubs, setClubs] = useState([])
    const [selectedClubId, setSelectedClubId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('success')

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        const fetchDates = async () => {
            try {
                const res = await api.get('/attendance/dates')
                setDates(res.data)
                if (res.data.length > 0) setSelectedDate(res.data[0])
            } catch (err) {
                console.error('Failed to fetch dates:', err)
                showMessage('Failed to load meeting dates', 'error')
            } finally {
                setLoading(false)
            }
        }
        fetchDates()
    }, [])

    useEffect(() => {
        if (!selectedDate) return
        fetchOverview()
    }, [selectedDate])

    const fetchOverview = async () => {
        try {
            const res = await api.get(`/attendance/overview?date=${selectedDate}`)
            setClubs(res.data)
            if (res.data.length > 0) {
                const stillThere = res.data.find(c => c.club_id === selectedClubId)
                setSelectedClubId(stillThere ? stillThere.club_id : res.data[0].club_id)
            } else {
                setSelectedClubId(null)
            }
        } catch (err) {
            console.error('Failed to fetch overview:', err)
            showMessage('Failed to load attendance', 'error')
        }
    }

    const showMessage = (text, type = 'success') => {
        setMessage(text)
        setMessageType(type)
        setTimeout(() => setMessage(''), 3000)
    }

    const handleStatusChange = async (student, meetingDateId, newStatus) => {
        const studentName = `${student.first_name} ${student.last_name}`
        const statusLabel = { present: 'Present', absent: 'Absent', excused: 'Excused' }[newStatus] || newStatus

        const confirmed = window.confirm(`Mark ${studentName} as ${statusLabel}? This overrides the current attendance record.`)
        if (!confirmed) {
            fetchOverview()
            return
        }

        try {
            await api.put('/attendance/override', {
                student_id: student.student_id,
                meeting_date_id: meetingDateId,
                status: newStatus,
            })
            showMessage(`${studentName} marked ${statusLabel.toLowerCase()}.`)
            fetchOverview()
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Failed to update status', 'error')
        }
    }

    const selectedClub = clubs.find(c => c.club_id === selectedClubId)

    const countStatuses = (club) => {
        const counts = { present: 0, absent: 0, excused: 0, unmarked: 0 }
        club.students.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1 })
        return counts
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

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
                            Attendance Overview
                        </div>
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
                            View and adjust attendance across all clubs
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                        <CalendarCheck size={16} color={theme.colors.primary} />
                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                fontFamily: theme.fonts.primary,
                                fontSize: '13px',
                                fontWeight: '600',
                                color: theme.colors.primary,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: `1.5px solid ${theme.colors.border}`,
                                background: 'white',
                                cursor: 'pointer',
                            }}>
                            {dates.map(d => (
                                <option key={d} value={d}>{formatDate(d)}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => navigate('/coordinator/attendance/summary')}
                            style={{ background: 'white', color: theme.colors.primary, border: `1.5px solid ${theme.colors.primary}`, borderRadius: '8px', padding: '9px 14px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart2 size={14} /> View Summary
                        </button>
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

                <div style={{ flex: 1, padding: isMobile ? '16px' : '24px 28px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>

                    <div style={{ width: isMobile ? '100%' : '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '4px', letterSpacing: '0.05em' }}>
                            CLUBS MEETING THIS DAY
                        </div>
                        {loading ? (
                            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading...</div>
                        ) : clubs.length === 0 ? (
                            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>No clubs meet on this date</div>
                        ) : clubs.map(club => {
                            const isSelected = selectedClubId === club.club_id
                            const counts = countStatuses(club)
                            const hasFlag = club.students.some(s => s.unexcused_absences >= 2)
                            return (
                                <div
                                    key={club.club_id}
                                    onClick={() => setSelectedClubId(club.club_id)}
                                    style={{
                                        background: isSelected ? theme.colors.primary : 'white',
                                        borderRadius: theme.borderRadius.lg,
                                        padding: '14px 16px',
                                        border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                                        cursor: 'pointer',
                                        position: 'relative',
                                    }}>
                                    {hasFlag && (
                                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                                            <AlertTriangle size={13} color={isSelected ? theme.colors.secondary : theme.colors.danger} />
                                        </div>
                                    )}
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? 'white' : theme.colors.primary, fontFamily: theme.fonts.primary }}>{club.club_name}</div>
                                    <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.7)' : theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '3px' }}>
                                        {counts.present} present · {counts.absent} absent{counts.excused ? ` · ${counts.excused} excused` : ''}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {!selectedClub ? (
                        <div style={{ flex: 1, background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}`, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <ClipboardList size={36} color={theme.colors.primary} style={{ marginBottom: '8px' }} />
                            <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Select a club</div>
                            <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Pick a club on the left to view attendance</div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{selectedClub.club_name}</div>
                                <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>
                                    {selectedClub.instructor} · {selectedClub.room_number} · {formatDate(selectedDate)}
                                </div>
                            </div>

                            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                                {selectedClub.students.length === 0 ? (
                                    <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>No students enrolled</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {selectedClub.students.map(student => {
                                            const flagged = student.unexcused_absences >= 2
                                            const sStyle = STATUS_STYLES[student.status] || STATUS_STYLES.unmarked
                                            return (
                                                <div key={student.student_id} style={{
                                                    display: 'flex',
                                                    alignItems: isMobile ? 'flex-start' : 'center',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    background: flagged ? theme.colors.dangerLight : theme.colors.background,
                                                    borderRadius: '8px',
                                                    border: flagged ? `1px solid ${theme.colors.danger}` : 'none',
                                                    flexDirection: isMobile ? 'column' : 'row',
                                                }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: sStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: sStyle.color, fontFamily: theme.fonts.primary, flexShrink: 0 }}>
                                                        {student.first_name[0]}{student.last_name[0]}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {student.first_name} {student.last_name}
                                                            <span style={{ fontSize: '11px', fontWeight: '400', color: theme.colors.textMuted }}>
                                                                Grade {GRADE_LABELS[student.grade]}
                                                            </span>
                                                            {flagged && (
                                                                <span style={{ fontSize: '10px', fontWeight: '700', color: theme.colors.danger, background: 'rgba(239,83,80,0.15)', padding: '2px 7px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <AlertTriangle size={10} /> {student.unexcused_absences} UNEXCUSED
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                                                            {student.teacher}
                                                        </div>
                                                    </div>
                                                    <select
                                                        value={student.status === 'unmarked' ? '' : student.status}
                                                        onChange={(e) => handleStatusChange(student, selectedClub.meeting_date_id, e.target.value)}
                                                        style={{
                                                            fontFamily: theme.fonts.primary,
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            color: sStyle.color,
                                                            background: sStyle.bg,
                                                            padding: '7px 10px',
                                                            borderRadius: '7px',
                                                            border: `1px solid ${sStyle.color}`,
                                                            cursor: 'pointer',
                                                        }}>
                                                        {student.status === 'unmarked' && <option value="" disabled>Not marked</option>}
                                                        <option value="present">Present</option>
                                                        <option value="absent">Absent</option>
                                                        <option value="excused">Excused</option>
                                                    </select>
                                                </div>
                                            )
                                        })}
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

export default AttendanceOverview