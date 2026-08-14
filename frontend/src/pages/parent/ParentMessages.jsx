import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import { Send, School, Megaphone, ChevronLeft, MessageSquareReply } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ThreadPanel({ threadData, me, draft, setDraft, sendMessage, onBack }) {
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

function ParentMessages() {
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('teachers')  // teachers | announcements

  const [teachers, setTeachers] = useState([])
  const [announcements, setAnnouncements] = useState([])

  const [activeThreadId, setActiveThreadId] = useState(null)
  const [threadData, setThreadData] = useState(null)
  const [draft, setDraft] = useState('')

  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')

  const flash = (text, type = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  useEffect(() => {
    api.get('/users/me').then(res => setMe(res.data)).catch(err => console.error(err))
    api.get('/messages/my-teachers').then(res => setTeachers(res.data)).catch(err => console.error(err))
    loadAnnouncements()
  }, [])

  const loadAnnouncements = () => {
    api.get('/messages/mine').then(res => {
      setAnnouncements(res.data.filter(t => t.is_announcement))
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
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Talk with your children's teachers</div>
        </div>

        {msg && (
          <div style={{ margin: '16px 28px 0', background: msgType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight, border: `1px solid ${msgType === 'error' ? theme.colors.danger : theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: msgType === 'error' ? theme.colors.danger : theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>{msg}</div>
        )}

        <div style={{ flex: 1, padding: '24px 28px', maxWidth: '820px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            {tabBtn('teachers', 'Teachers', School)}
            {tabBtn('announcements', 'Announcements', Megaphone)}
          </div>

          {/* Teachers tab */}
          {tab === 'teachers' && (
            activeThreadId ? (
              <ThreadPanel threadData={threadData} me={me} draft={draft} setDraft={setDraft} sendMessage={sendMessage} onBack={closeThread} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {teachers.length === 0 ? (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No teachers to message yet.</div>
                ) : teachers.map(t => (
                  <div
                    key={t.id}
                    onClick={() => openThreadWith(t.id)}
                    style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <School size={18} color={theme.colors.primary} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{t.name}</div>
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{t.club_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Announcements tab */}
          {tab === 'announcements' && (
            activeThreadId ? (
              <ThreadPanel threadData={threadData} me={me} draft={draft} setDraft={setDraft} sendMessage={sendMessage} onBack={closeThread} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {announcements.length === 0 ? (
                  <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No announcements yet.</div>
                ) : announcements.map(a => (
                  <div key={a.thread_id} style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '16px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{a.subject}</div>
                    {a.last_message && (
                      <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '6px' }}>{a.last_message.body}</div>
                    )}
                    {a.created_by_role === 'teacher' ? (
                      <button
                        onClick={() => openThreadWith(a.created_by)}
                        style={{ marginTop: '10px', background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <MessageSquareReply size={13} /> Ask a question
                      </button>
                    ) : (
                      <div style={{ marginTop: '10px', fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>
                        Ask your club teacher if you have any questions.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default ParentMessages