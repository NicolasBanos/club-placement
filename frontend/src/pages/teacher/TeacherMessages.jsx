import Sidebar from '../../components/Sidebar'
import { Send, User, Megaphone, Users, MessageSquare, ChevronLeft, ChevronDown, ChevronRight, Search } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'
import { useState, useEffect, useRef } from 'react'

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const ThreadPanel = ({ threadData, me, draft, setDraft, sendMessage, onBack }) => {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [threadData])

  return (
    <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', height: '480px' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={18} color={theme.colors.textMuted} />
        </button>
        <span style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
          {threadData?.subject || 'Conversation'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(!threadData?.messages || threadData.messages.length === 0) ? (
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No messages yet — say hello.</div>
        ) : threadData.messages.map(m => {
          const isMe = me && m.sender_id === me.id
          return (
            <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
              <div style={{
                background: isMe ? theme.colors.primary : theme.colors.background,
                color: isMe ? 'white' : theme.colors.textSecondary,
                borderRadius: '10px', padding: '9px 13px', fontSize: '13px', fontFamily: theme.fonts.primary,
              }}>
                {m.body}
              </div>
              <div style={{ fontSize: '10px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>
                {formatTimestamp(m.sent_at)}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${theme.colors.border}`, display: 'flex', gap: '8px' }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
          style={{ flex: 1, padding: '9px 12px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px' }}
        />
        <button onClick={sendMessage} style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

function TeacherMessages() {
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('coordinator')  // coordinator | announcement | students

  const [coordinator, setCoordinator] = useState(null)
  const [club, setClub] = useState(null)
  const [students, setStudents] = useState([])

  const [activeThreadId, setActiveThreadId] = useState(null)
  const [threadData, setThreadData] = useState(null)
  const [draft, setDraft] = useState('')

  const [annSubject, setAnnSubject] = useState('')
  const [annBody, setAnnBody] = useState('')
  const [annHistory, setAnnHistory] = useState([])
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')

  const [studentSearch, setStudentSearch] = useState('')
  const [expandedStudent, setExpandedStudent] = useState(null)

  const flash = (text, type = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  useEffect(() => {
    api.get('/users/me').then(res => setMe(res.data)).catch(err => console.error(err))
    api.get('/messages/coordinator-contact').then(res => setCoordinator(res.data)).catch(err => console.error(err))
    api.get('/clubs/mine').then(res => {
      if (res.data.length > 0) {
        const c = res.data[0]
        setClub(c)
        api.get(`/clubs/${c.id}/roster`).then(r2 => setStudents(r2.data.enrolled)).catch(err => console.error(err))
      }
    }).catch(err => console.error(err))
    loadAnnouncementHistory()
  }, [])

  const loadAnnouncementHistory = () => {
    api.get('/messages/mine').then(res => {
      setAnnHistory(res.data.filter(t => t.is_announcement))
    }).catch(err => console.error(err))
  }

  const openThread = (threadId) => {
    setActiveThreadId(threadId)
    setDraft('')
    api.get(`/messages/${threadId}`).then(res => setThreadData(res.data)).catch(err => console.error(err))
  }

  const openThreadWith = async (recipientId) => {
    try {
      const res = await api.post('/messages/thread-with', { recipient_id: recipientId })
      openThread(res.data.thread_id)
    } catch (e) {
      flash(e.response?.data?.detail || 'Unable to open conversation', 'error')
    }
  }

  const sendMessage = async () => {
    if (!draft.trim() || !activeThreadId) return
    try {
      await api.post(`/messages/${activeThreadId}/send`, { body: draft.trim() })
      setDraft('')
      openThread(activeThreadId)
    } catch (e) {
      flash(e.response?.data?.detail || 'Failed to send message', 'error')
    }
  }

  const sendAnnouncement = async () => {
    if (!annSubject.trim() || !annBody.trim()) {
      flash('Please fill in a subject and message', 'error'); return
    }
    try {
      const res = await api.post('/messages/announcements', {
        audience_type: 'my_class',
        subject: annSubject.trim(),
        body: annBody.trim(),
      })
      flash(`Announcement sent to ${res.data.recipient_count} recipient(s).`)
      setAnnSubject(''); setAnnBody('')
      loadAnnouncementHistory()
    } catch (e) {
      flash(e.response?.data?.detail || 'Failed to send announcement', 'error')
    }
  }

  const closeThread = () => { setActiveThreadId(null); setThreadData(null); setDraft('') }

  const tabBtn = (key, label, Icon) => (
    <button
      onClick={() => { setTab(key); closeThread() }}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: tab === key ? theme.colors.primary : 'white',
        color: tab === key ? 'white' : theme.colors.textSecondary,
        border: `1px solid ${tab === key ? theme.colors.primary : theme.colors.border}`,
        borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600',
        fontFamily: theme.fonts.primary, cursor: 'pointer',
      }}
    >
      <Icon size={14} /> {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Messages</div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Talk with the coordinator or your students' families</div>
        </div>

        {msg && (
          <div style={{ margin: '16px 28px 0', background: msgType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight, border: `1px solid ${msgType === 'error' ? theme.colors.danger : theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: msgType === 'error' ? theme.colors.danger : theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>{msg}</div>
        )}

        <div style={{ flex: 1, padding: '24px 28px', maxWidth: '820px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            {tabBtn('coordinator', 'Coordinator', User)}
            {tabBtn('announcement', 'Announcement', Megaphone)}
            {tabBtn('students', 'Students', Users)}
          </div>

          {/* Coordinator tab */}
          {tab === 'coordinator' && (
            activeThreadId ? (
              <ThreadPanel threadData={threadData} me={me} draft={draft} setDraft={setDraft} sendMessage={sendMessage} onBack={closeThread} />
            ) : (
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px' }}>
                {coordinator ? (
                  <div
                    onClick={() => openThreadWith(coordinator.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '10px', borderRadius: '8px' }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} color={theme.colors.primary} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{coordinator.name}</div>
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Coordinator — click to message</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading…</div>
                )}
              </div>
            )
          )}

          {/* Announcement tab */}
          {tab === 'announcement' && (
            <>
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>
                  New announcement to {club ? club.name : 'your class'}
                </div>
                <input
                  value={annSubject}
                  onChange={e => setAnnSubject(e.target.value)}
                  placeholder="Subject"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px', marginBottom: '10px' }}
                />
                <textarea
                  value={annBody}
                  onChange={e => setAnnBody(e.target.value)}
                  placeholder="Write your announcement…"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px', minHeight: '80px', resize: 'vertical' }}
                />
                <button
                  onClick={sendAnnouncement}
                  style={{ marginTop: '10px', background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}
                >
                  Send announcement
                </button>
              </div>

              <div style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>Sent announcements</div>
              {annHistory.length === 0 ? (
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>None sent yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {annHistory.map(t => (
                    <div key={t.thread_id} style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '14px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{t.subject}</div>
                      {t.last_message && (
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>{t.last_message.body}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Students tab */}
          {tab === 'students' && (
            activeThreadId ? (
              <ThreadPanel threadData={threadData} me={me} draft={draft} setDraft={setDraft} sendMessage={sendMessage} onBack={closeThread} />
            ) : (
              <>
                <div style={{ position: 'relative', marginBottom: '14px' }}>
                  <Search size={14} color={theme.colors.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search students…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {students.length === 0 ? (
                    <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No students enrolled.</div>
                  ) : students
                    .filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.toLowerCase()))
                    .map(s => {
                      const isOpen = expandedStudent === s.student_id
                      const sortedParents = [...s.linked_parents].sort((a, b) => a.role === 'creator' ? -1 : 1)
                      return (
                        <div key={s.student_id} style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, overflow: 'hidden' }}>
                          <div
                            onClick={() => setExpandedStudent(isOpen ? null : s.student_id)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <MessageSquare size={14} color={theme.colors.primary} />
                              <span style={{ fontSize: '14px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{s.first_name} {s.last_name}</span>
                              <span style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                                {s.linked_parents.length} contact{s.linked_parents.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            {isOpen ? <ChevronDown size={16} color={theme.colors.textMuted} /> : <ChevronRight size={16} color={theme.colors.textMuted} />}
                          </div>

                          {isOpen && (
                            <div style={{ borderTop: `1px solid ${theme.colors.border}`, padding: '10px 16px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {sortedParents.length === 0 ? (
                                <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No linked contacts.</div>
                              ) : sortedParents.map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => openThreadWith(p.id)}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.colors.background, borderRadius: '8px', padding: '9px 12px', cursor: 'pointer' }}
                                >
                                  <div>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#333', fontFamily: theme.fonts.primary }}>{p.name}</span>
                                    {p.role === 'creator' && (
                                      <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: '700', color: theme.colors.primary, background: theme.colors.primaryLight, padding: '2px 7px', borderRadius: '6px' }}>PRIMARY</span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{p.email}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherMessages