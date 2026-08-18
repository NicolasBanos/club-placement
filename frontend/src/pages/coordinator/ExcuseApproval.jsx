import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { ClipboardCheck, Check, X, Clock, CalendarX, AlertCircle, History } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

function daysAgo(iso) {
    if (!iso) return null
    const then = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now - then) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return 'today'
    if (diff === 1) return '1 day ago'
    return `${diff} days ago`
}

function formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function ExcuseApproval() {
    const [pending, setPending] = useState([])
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('success')
    const [activeTab, setActiveTab] = useState('pending')

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const fetchData = async () => {
        try {
            const [pendingRes, historyRes] = await Promise.all([
                api.get('/attendance/excuses/pending'),
                api.get('/attendance/excuses/history'),
            ])
            setPending(pendingRes.data)
            setHistory(historyRes.data)
        } catch (err) {
            console.error('Failed to fetch excuses:', err)
            showMessage('Failed to load excuses', 'error')
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

    const handleApprove = async (attendanceId, studentName) => {
        setActionLoading(true)
        try {
            const res = await api.post(`/attendance/excuses/${attendanceId}/approve`)
            showMessage(`${studentName}'s excuse approved — they remain enrolled.`)
            fetchData()
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Failed to approve excuse', 'error')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDeny = async (attendanceId, studentName, isFirstDay) => {
        const warning = isFirstDay
            ? `Deny ${studentName}'s first-day excuse? They will be withdrawn from the club and the first waitlisted student will be promoted to pending confirmation.`
            : `Deny ${studentName}'s excuse? It will be recorded as an unexcused absence.`
        if (!window.confirm(warning)) return
        setActionLoading(true)
        try {
            const res = await api.post(`/attendance/excuses/${attendanceId}/deny`)
            showMessage(res.data.message)
            fetchData()
        } catch (err) {
            showMessage(err.response?.data?.detail || 'Failed to deny excuse', 'error')
        } finally {
            setActionLoading(false)
        }
    }

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
                    gap: isMobile ? '10px' : '0',
                }}>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                            Excuse Approval
                        </div>
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
                            Review and decide on absence excuses submitted by parents
                        </div>
                    </div>
                    {pending.length > 0 && (
                        <div style={{ background: theme.colors.warningLight, border: `1px solid ${theme.colors.warning}`, borderRadius: '9px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={14} color={theme.colors.warning} />
                            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.warning, fontFamily: theme.fonts.primary }}>
                                {pending.length} pending review{pending.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
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

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('pending')}
                            style={{
                                background: activeTab === 'pending' ? theme.colors.primary : 'white',
                                color: activeTab === 'pending' ? 'white' : theme.colors.primary,
                                border: `1.5px solid ${theme.colors.primary}`,
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                fontFamily: theme.fonts.primary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                            <Clock size={13} /> Pending ({pending.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            style={{
                                background: activeTab === 'history' ? theme.colors.primary : 'white',
                                color: activeTab === 'history' ? 'white' : theme.colors.primary,
                                border: `1.5px solid ${theme.colors.primary}`,
                                borderRadius: '8px',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                fontFamily: theme.fonts.primary,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                            <History size={13} /> History ({history.length})
                        </button>
                    </div>

                    {/* Pending tab */}
                    {activeTab === 'pending' && (
                        <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                            {loading ? (
                                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>Loading...</div>
                            ) : pending.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '30px 0' }}>
                                    <ClipboardCheck size={36} color={theme.colors.primary} />
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>No pending excuses</div>
                                    <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Excuses submitted by parents will appear here for review</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {pending.map(excuse => (
                                        <div key={excuse.attendance_id} style={{
                                            padding: '16px',
                                            background: theme.colors.background,
                                            borderRadius: '10px',
                                            border: excuse.is_first_day ? `1px solid ${theme.colors.warning}` : `1px solid ${theme.colors.border}`,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, flexShrink: 0 }}>
                                                    {excuse.student_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>
                                                        {excuse.student_name}
                                                        <span style={{ fontSize: '11px', fontWeight: '400', color: theme.colors.textMuted, marginLeft: '8px' }}>
                                                            Grade {GRADE_LABELS[excuse.grade]}
                                                        </span>
                                                        {excuse.is_first_day && (
                                                            <span style={{ fontSize: '10px', fontWeight: '700', color: theme.colors.warning, marginLeft: '8px', background: 'rgba(249,168,37,0.2)', padding: '2px 7px', borderRadius: '4px' }}>
                                                                FIRST DAY
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <CalendarX size={12} /> {excuse.club_name} · absent {formatDate(excuse.absence_date)}
                                                        {excuse.submitted_at && <span>· submitted {daysAgo(excuse.submitted_at)}</span>}
                                                        {excuse.submitted_by_name && <span>· by {excuse.submitted_by_name}</span>}
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '8px', padding: '10px 12px', background: 'white', borderRadius: '8px', border: `1px solid ${theme.colors.border}` }}>
                                                        {excuse.excuse_reason || <span style={{ color: theme.colors.textMuted, fontStyle: 'italic' }}>No reason provided</span>}
                                                    </div>
                                                    {excuse.is_first_day && (
                                                        <div style={{ fontSize: '11px', color: theme.colors.warning, fontFamily: theme.fonts.primary, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={11} /> Denying withdraws the student and promotes the first waitlisted child.
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', flexShrink: 0, width: isMobile ? '100%' : 'auto' }}>
                                                    <button
                                                        onClick={() => handleApprove(excuse.attendance_id, excuse.student_name)}
                                                        disabled={actionLoading}
                                                        style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Check size={13} /> Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeny(excuse.attendance_id, excuse.student_name, excuse.is_first_day)}
                                                        disabled={actionLoading}
                                                        style={{ background: theme.colors.dangerLight, color: theme.colors.danger, border: 'none', borderRadius: '7px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <X size={13} /> Deny
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History tab */}
                    {activeTab === 'history' && (
                        <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '20px', border: `1px solid ${theme.colors.border}` }}>
                            {loading ? (
                                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>Loading...</div>
                            ) : history.length === 0 ? (
                                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center', padding: '20px 0' }}>No past excuse decisions yet</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {history.map(excuse => (
                                        <div key={excuse.attendance_id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            background: theme.colors.background,
                                            borderRadius: '8px',
                                        }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '50%',
                                                background: excuse.excuse_status === 'approved' ? theme.colors.primaryLight : theme.colors.dangerLight,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }}>
                                                {excuse.excuse_status === 'approved'
                                                    ? <Check size={14} color={theme.colors.primary} />
                                                    : <X size={14} color={theme.colors.danger} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>
                                                    {excuse.student_name}
                                                    <span style={{ fontSize: '11px', fontWeight: '400', color: theme.colors.textMuted, marginLeft: '8px' }}>
                                                        {excuse.club_name} · absent {formatDate(excuse.absence_date)}
                                                    </span>
                                                </div>
                                                {excuse.excuse_reason && (
                                                    <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
                                                        {excuse.excuse_reason}
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{
                                                fontSize: '10px', fontWeight: '700', fontFamily: theme.fonts.primary,
                                                padding: '3px 9px', borderRadius: '6px',
                                                color: excuse.excuse_status === 'approved' ? theme.colors.primary : theme.colors.danger,
                                                background: excuse.excuse_status === 'approved' ? theme.colors.primaryLight : theme.colors.dangerLight,
                                            }}>
                                                {excuse.excuse_status.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ExcuseApproval