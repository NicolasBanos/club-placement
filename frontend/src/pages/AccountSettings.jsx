import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { Mail, Save } from 'lucide-react'
import theme from '../theme'
import api from '../api/axios'
function AccountSettings() {
  const [emailDraft, setEmailDraft] = useState('')
  const [loading, setLoading] = useState(true)

  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')

  const flash = (text, type = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  useEffect(() => {
    api.get('/users/me')
      .then(res => setEmailDraft(res.data.email))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const saveEmail = async () => {
    try {
      await api.put('/users/me', { email: emailDraft.trim() })
      flash('Login email updated.')
    } catch (e) {
      flash(e.response?.data?.detail || 'Failed to update email', 'error')
    }
  }

  const inp = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: '13px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '8px', marginTop: '4px' }
  const lbl = { fontSize: '11px', fontWeight: '600', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Account Settings</div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Manage your login email</div>
        </div>

        {msg && (
          <div style={{ margin: '16px 28px 0', background: msgType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight, border: `1px solid ${msgType === 'error' ? theme.colors.danger : theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: msgType === 'error' ? theme.colors.danger : theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>{msg}</div>
        )}

        <div style={{ flex: 1, padding: '24px 28px', maxWidth: '480px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : (
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={15} /> Login email
              </div>
              <label style={lbl}>Email</label>
              <input style={inp} value={emailDraft} onChange={e => setEmailDraft(e.target.value)} />
              <button onClick={saveEmail} style={{ marginTop: '12px', background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Save size={12} /> Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountSettings