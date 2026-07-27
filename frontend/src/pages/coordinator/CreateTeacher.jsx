import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Plus, Trash2, X, Check, Mail, Lock, User, UserPlus } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

function CreateTeacher() {
  const [teachers, setTeachers] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    club_id: '',
  })

  const fetchData = async () => {
    try {
      const [teachersRes, clubsRes] = await Promise.all([
        api.get('/users/teachers'),
        api.get('/clubs/'),
      ])
      setTeachers(teachersRes.data)
      setClubs(clubsRes.data)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setError('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      await api.post('/users/teachers', {
        ...form,
        club_id: form.club_id ? parseInt(form.club_id) : null,
      })
      setSuccess(`Teacher account created for ${form.first_name} ${form.last_name}!`)
      setForm({ first_name: '', last_name: '', email: '', password: '', club_id: '' })
      setShowForm(false)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create teacher account')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (teacherId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name}'s account?`)) return
    try {
      await api.delete(`/users/teachers/${teacherId}`)
      fetchData()
    } catch (err) {
      alert('Failed to remove teacher account')
    }
  }

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
              Teacher Accounts
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Create and manage teacher accounts
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
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
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(26,92,26,0.25)',
            }}>
            <Plus size={14} /> Add Teacher
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', gap: '20px' }}>

          {/* Teacher list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {success && (
              <div style={{ background: theme.colors.primaryLight, border: `1px solid ${theme.colors.primary}`, borderRadius: '9px', padding: '12px 16px', color: theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>
                {success}
              </div>
            )}

            {loading ? (
              <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading teachers...</div>
            ) : teachers.length === 0 ? (
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <UserPlus size={36} color={theme.colors.primary} style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>No teachers yet</div>
                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>Click "Add Teacher" to create your first teacher account</div>
              </div>
            ) : (
              teachers.map(teacher => (
                <div key={teacher.id} style={{
                  background: 'white',
                  borderRadius: theme.borderRadius.lg,
                  padding: '20px',
                  border: `1px solid ${theme.colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '44px', height: '44px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.primaryLight,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: '800',
                    color: theme.colors.primary,
                    fontFamily: theme.fonts.primary,
                    flexShrink: 0,
                  }}>
                    {teacher.first_name[0]}{teacher.last_name[0]}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                      {teacher.first_name} {teacher.last_name}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
                      {teacher.email}
                    </div>
                    {teacher.assigned_club && (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ background: theme.colors.primaryLight, color: theme.colors.primary, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', fontFamily: theme.fonts.primary }}>
                          {teacher.assigned_club}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(teacher.id, `${teacher.first_name} ${teacher.last_name}`)}
                    style={{ background: theme.colors.dangerLight, color: theme.colors.danger, border: 'none', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Form panel */}
          {showForm && (
            <div style={{
              width: '360px',
              background: 'white',
              borderRadius: theme.borderRadius.lg,
              padding: '24px',
              border: `1px solid ${theme.colors.border}`,
              flexShrink: 0,
              alignSelf: 'flex-start',
              position: 'sticky',
              top: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                  New Teacher Account
                </div>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={18} color={theme.colors.textMuted} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>First Name *</label>
                    <input style={inputStyle} value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} placeholder="First name" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Last Name *</label>
                    <input style={inputStyle} value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Last name" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Email *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail size={14} color="#aaa" style={{ position: 'absolute', left: '12px' }} />
                    <input style={{ ...inputStyle, paddingLeft: '36px' }} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="teacher@school.com" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Temporary Password *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Lock size={14} color="#aaa" style={{ position: 'absolute', left: '12px' }} />
                    <input style={{ ...inputStyle, paddingLeft: '36px' }} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Set a temporary password" />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Assigned Club</label>
                  <select style={inputStyle} value={form.club_id} onChange={e => setForm(p => ({ ...p, club_id: e.target.value }))}>
                    <option value="">Select a club (optional)</option>
                    {clubs.map(club => (
                      <option key={club.id} value={club.id}>{club.name}</option>
                    ))}
                  </select>
                </div>

                {error && <div style={{ color: theme.colors.danger, fontSize: '12px', fontFamily: theme.fonts.primary }}>{error}</div>}

                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{
                    background: theme.colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '9px',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    fontFamily: theme.fonts.primary,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '4px',
                  }}>
                  <Check size={14} /> {saving ? 'Creating...' : 'Create Account'}
                </button>

                <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, textAlign: 'center' }}>
                  The teacher will log in with their email and temporary password.
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: '600',
  color: '#444',
  fontFamily: 'Poppins, sans-serif',
  marginBottom: '5px',
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #dce8dc',
  borderRadius: '8px',
  fontSize: '13px',
  fontFamily: 'Poppins, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: 'white',
  color: '#333',
}

export default CreateTeacher