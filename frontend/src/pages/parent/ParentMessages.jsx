import { useState, useEffect, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import { Send, School, Star, Search, Plus, X } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function formatTimestamp(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function threadCategory(thread) {
  if (thread.is_announcement) return 'announcements'
  return 'teachers'
}

function isCoordinatorThread(thread) {
  if (thread.is_announcement) return false
  const other = thread.participants[0]
  return other && other.role === 'coordinator'
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'teachers', label: 'Teachers' },
  { key: 'announcements', label: 'Announcements' },
]

function ThreadListRow({ thread, isActive, onClick }) {
  const other = thread.participants[0]
  const label = thread.is_announcement ? thread.subject : (other ? other.name : 'Unknown')
  const isCoord = isCoordinatorThread(thread)
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', cursor: 'pointer',
        background: isActive ? theme.colors.primaryLight : 'white',
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <div style={{ marginTop: '5px', width: '8px', height: '8px', borderRadius: '50%', background: thread.is_unread ? '#e53935' : 'transparent', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: thread.is_unread ? '800' : '600', color: '#333', fontFamily: theme.fonts.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isCoord && <Star size={12} color={theme.colors.secondary} fill={theme.colors.secondary} />}
            {label}
          </span>
          {thread.last_message && (
            <span style={{ fontSize: '10px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatTimestamp(thread.last_message.sent_at)}
            </span>
          )}
        </div>
        {thread.is_announcement && (
          <div style={{ fontSize: '10px', fontWeight: '700', color: theme.colors.warning, fontFamily: theme.fonts.primary, marginTop: '1px' }}>
            ANNOUNCEMENT · {thread.created_by_name}
          </div>
        )}
        {thread.last_message && (
          <div style={{
            fontSize: '12px', color: thread.is_unread ? theme.colors.textSecondary : theme.colors.textMuted,
            fontFamily: theme.fonts.primary, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', fontWeight: thread.is_unread ? '600' : '400',
          }}>
            {thread.last_message.body}
          </div>
        )}
      </div>
    </div>
  )
}

function ThreadPanel({ threadData, me, draft, setDraft, sendMessage, canReply }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [threadData])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(!threadData?.messages || threadData.messages.length === 0) ? (
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No messages yet — say hello.</div>
        ) : threadData.messages.map(m => {
          const isMe = me && m.sender_id === me.id
          return (
            <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '65%' }}>
              <div style={{
                background: isMe ? theme.colors.primary : theme.colors.background,
                color: isMe ? 'white' : theme.colors.textSecondary,
                borderRadius: '12px', padding: '10px 14px', fontSize: '13px', fontFamily: theme.fonts.primary,
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

      {canReply && (
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${theme.colors.border}`, display: 'flex', gap: '8px' }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message…"
            style={{ flex: 1, padding: '10px 14px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '9px' }}
          />
          <button onClick={sendMessage} style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '9px', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  )
}

function ParentMessages() {
  const [me, setMe] = useState(null)
  const [threads, setThreads] = useState([])
  const [filter, setFilter] = useState('all')

  const [teachers, setTeachers] = useState([])

  const [activeThreadId, setActiveThreadId] = useState(null)
  const [threadData, setThreadData] = useState(null)
  const [draft, setDraft] = useState('')

  const [composing, setComposing] = useState(false)
  const [composeSearch, setComposeSearch] = useState('')
  const [composeRecipient, setComposeRecipient] = useState(null)
  const [composeBody, setComposeBody] = useState('')

  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')

  const flash = (text, type = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  const loadThreads = () => {
    api.get('/messages/mine').then(res => setThreads(res.data)).catch(err => console.error(err))
  }

  useEffect(() => {
    api.get('/users/me').then(res => setMe(res.data)).catch(err => console.error(err))
    api.get('/messages/my-teachers').then(res => setTeachers(res.data)).catch(err => console.error(err))
    loadThreads()
  }, [])

  const openThread = (threadId) => {
    setComposing(false)
    setActiveThreadId(threadId)
    setDraft('')
    api.get(`/messages/${threadId}`).then(res => {
      setThreadData(res.data)
      loadThreads()
    }).catch(err => console.error(err))
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

  const startCompose = () => {
    setActiveThreadId(null)
    setThreadData(null)
    setComposing(true)
    setComposeSearch('')
    setComposeRecipient(null)
    setComposeBody('')
  }

  const cancelCompose = () => setComposing(false)

  const sendDirectFromCompose = async () => {
    if (!composeRecipient || !composeBody.trim()) {
      flash('Please pick a teacher and write a message', 'error'); return
    }
    try {
      const res = await api.post('/messages/start', { recipient_id: composeRecipient.id, body: composeBody.trim() })
      setComposing(false)
      loadThreads()
      openThread(res.data.thread_id)
    } catch (e) {
      flash(e.response?.data?.detail || 'Failed to send message', 'error')
    }
  }

  const filteredThreads = threads.filter(t => filter === 'all' || threadCategory(t) === filter)
  const filteredTeachers = teachers.filter(t => t.name.toLowerCase().includes(composeSearch.toLowerCase()))

  const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Messages</div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Talk with your children's teachers</div>
          </div>
          <button
            onClick={startCompose}
            style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: '700', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} /> Compose
          </button>
        </div>

        {msg && (
          <div style={{ margin: '16px 28px 0', background: msgType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight, border: `1px solid ${msgType === 'error' ? theme.colors.danger : theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: msgType === 'error' ? theme.colors.danger : theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>{msg}</div>
        )}

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          <div style={{ width: '320px', flexShrink: 0, borderRight: `1px solid ${theme.colors.border}`, display: 'flex', flexDirection: 'column', background: 'white' }}>
            <div style={{ display: 'flex', gap: '6px', padding: '14px 16px', flexWrap: 'wrap', borderBottom: `1px solid ${theme.colors.border}` }}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    background: filter === f.key ? theme.colors.primary : theme.colors.background,
                    color: filter === f.key ? 'white' : theme.colors.textSecondary,
                    border: 'none', borderRadius: '20px', padding: '5px 12px', fontSize: '11px', fontWeight: '700',
                    fontFamily: theme.fonts.primary, cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredThreads.length === 0 ? (
                <div style={{ padding: '20px 16px', fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No conversations yet.</div>
              ) : filteredThreads.map(t => (
                <ThreadListRow key={t.thread_id} thread={t} isActive={activeThreadId === t.thread_id} onClick={() => openThread(t.thread_id)} />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.colors.background }}>
            {composing ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ padding: '14px 24px', borderBottom: `1px solid ${theme.colors.border}`, background: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={cancelCompose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                    <X size={18} color={theme.colors.textMuted} />
                  </button>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>New message</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', maxWidth: '520px' }}>
                  {!composeRecipient ? (
                    <div>
                      <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <Search size={14} color={theme.colors.textMuted} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input value={composeSearch} onChange={e => setComposeSearch(e.target.value)} placeholder="Search teachers…" style={{ ...inputStyle, padding: '9px 12px 9px 34px' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {filteredTeachers.length === 0 ? (
                          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>No teachers to message yet.</div>
                        ) : filteredTeachers.map(t => (
                          <div key={t.id} onClick={() => setComposeRecipient({ id: t.id, name: t.name })} style={{ background: 'white', borderRadius: '9px', border: `1px solid ${theme.colors.border}`, padding: '12px 14px', cursor: 'pointer' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{t.name}</div>
                            <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{t.club_name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>
                        To: <strong style={{ color: '#333' }}>{composeRecipient.name}</strong>
                      </div>
                      <textarea
                        value={composeBody}
                        onChange={e => setComposeBody(e.target.value)}
                        placeholder="Write your message…"
                        style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                      />
                      <button onClick={sendDirectFromCompose} style={{ marginTop: '10px', background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : activeThreadId ? (
              <>
                <div style={{ padding: '14px 24px', borderBottom: `1px solid ${theme.colors.border}`, background: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {threads.find(t => t.thread_id === activeThreadId) && isCoordinatorThread(threads.find(t => t.thread_id === activeThreadId)) && (
                        <Star size={13} color={theme.colors.secondary} fill={theme.colors.secondary} />
                      )}
                      {threadData?.subject || (threads.find(t => t.thread_id === activeThreadId)?.participants[0]?.name) || 'Conversation'}
                    </div>
                    {threadData?.is_announcement && (
                      <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '1px' }}>
                        Sent by {threads.find(t => t.thread_id === activeThreadId)?.created_by_name}
                      </div>
                    )}
                  </div>
                </div>
                <ThreadPanel
                  threadData={threadData}
                  me={me}
                  draft={draft}
                  setDraft={setDraft}
                  sendMessage={sendMessage}
                  canReply={!threadData?.is_announcement || threadData?.created_by === me?.id}
                />
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Select a conversation, or compose a new one.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParentMessages