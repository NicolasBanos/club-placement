import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Plus, Edit2, Trash2, X, Check, Users, MapPin, BookOpen, School } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }

const emptyForm = {
  name: '',
  instructor: '',
  grade_min: 0,
  grade_max: 2,
  max_students: 20,
  room_number: '',
  dismissal_location: '',
  description: '',
  meeting_dates: [],
}

function formatTime(time) {
  if (!time) return ''
  if (time.includes('AM') || time.includes('PM')) return time
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${month}/${day}/${year}`
}

function ClubSetup() {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newDate, setNewDate] = useState({ date: '', start_time: '14:10', end_time: '15:10' })

  const fetchClubs = async () => {
    try {
      const res = await api.get('/clubs/')
      setClubs(res.data)
    } catch (err) {
      console.error('Failed to fetch clubs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClubs() }, [])

  const handleEdit = (club) => {
    setForm({
      name: club.name,
      instructor: club.instructor,
      grade_min: club.grade_min,
      grade_max: club.grade_max,
      max_students: club.max_students,
      room_number: club.room_number,
      dismissal_location: club.dismissal_location,
      description: club.description || '',
      meeting_dates: club.meeting_dates,
    })
    setEditingId(club.id)
    setShowForm(true)
  }

  const handleDelete = async (clubId) => {
    if (!window.confirm('Are you sure you want to delete this club?')) return
    try {
      await api.delete(`/clubs/${clubId}`)
      fetchClubs()
    } catch (err) {
      alert('Failed to delete club')
    }
  }

  const handleAddDate = () => {
    if (!newDate.date) return
    setForm(prev => ({
      ...prev,
      meeting_dates: [...prev.meeting_dates, { ...newDate }]
    }))
    setNewDate({ date: '', start_time: '14:10', end_time: '15:10' })
  }

  const handleRemoveDate = (index) => {
    setForm(prev => ({
      ...prev,
      meeting_dates: prev.meeting_dates.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.name || !form.instructor || !form.room_number || !form.dismissal_location) {
      setError('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/clubs/${editingId}`, form)
      } else {
        await api.post('/clubs/', form)
      }
      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
      fetchClubs()
    } catch (err) {
      setError('Failed to save club. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setError('')
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
              Club Setup
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Manage clubs for this session
            </div>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
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
            <Plus size={14} /> Add Club
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', gap: '20px' }}>

          {/* Club list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Loading clubs...</div>
            ) : clubs.length === 0 ? (
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '40px', textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                <School size={36} color={theme.colors.primary} style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '15px', fontWeight: '600', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>No clubs yet</div>
                <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>Click "Add Club" to create your first club for this session</div>
              </div>
            ) : (
              clubs.map(club => (
                <div key={club.id} style={{
                  background: 'white',
                  borderRadius: theme.borderRadius.lg,
                  padding: '20px',
                  border: `1px solid ${theme.colors.border}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}>
                  <div style={{ width: '4px', borderRadius: '4px', alignSelf: 'stretch', backgroundColor: theme.colors.primary, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>{club.name}</div>
                      <div style={{ background: theme.colors.primaryLight, color: theme.colors.primary, fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '4px', fontFamily: theme.fonts.primary }}>
                        Grades {GRADE_LABELS[club.grade_min]}–{GRADE_LABELS[club.grade_max]}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <BookOpen size={12} color={theme.colors.textMuted} />
                        <span style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{club.instructor}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} color={theme.colors.textMuted} />
                        <span style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{club.enrolled}/{club.max_students} enrolled</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color={theme.colors.textMuted} />
                        <span style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{club.room_number} · {club.dismissal_location}</span>
                      </div>
                    </div>
                    {club.description && (
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '8px' }}>{club.description}</div>
                    )}
                    {club.meeting_dates.length > 0 && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>
                        {club.meeting_dates.length} meeting dates · First: {formatDate(club.meeting_dates[0].date)} · {formatTime(club.meeting_dates[0].start_time)} – {formatTime(club.meeting_dates[0].end_time)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleEdit(club)}
                      style={{ background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(club.id)}
                      style={{ background: theme.colors.dangerLight, color: theme.colors.danger, border: 'none', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form panel */}
          {showForm && (
            <div style={{
              width: '380px',
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
                  {editingId ? 'Edit Club' : 'Add New Club'}
                </div>
                <button onClick={handleCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X size={18} color={theme.colors.textMuted} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                <div>
                  <label style={labelStyle}>Club Name *</label>
                  <input style={inputStyle} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Amazing Art Club" />
                </div>

                <div>
                  <label style={labelStyle}>Instructor *</label>
                  <input style={inputStyle} value={form.instructor} onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))} placeholder="e.g. Mr. Smith" />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Grade Min</label>
                    <select style={inputStyle} value={form.grade_min} onChange={e => setForm(p => ({ ...p, grade_min: parseInt(e.target.value) }))}>
                      {[0,1,2,3,4,5].map(g => <option key={g} value={g}>{g === 0 ? 'K' : g}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Grade Max</label>
                    <select style={inputStyle} value={form.grade_max} onChange={e => setForm(p => ({ ...p, grade_max: parseInt(e.target.value) }))}>
                      {[0,1,2,3,4,5].map(g => <option key={g} value={g}>{g === 0 ? 'K' : g}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Max Students</label>
                    <input style={inputStyle} type="number" value={form.max_students} onChange={e => setForm(p => ({ ...p, max_students: parseInt(e.target.value) }))} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Room Number *</label>
                  <input style={inputStyle} value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))} placeholder="e.g. Room 101" />
                </div>

                <div>
                  <label style={labelStyle}>Dismissal Location *</label>
                  <input style={inputStyle} value={form.dismissal_location} onChange={e => setForm(p => ({ ...p, dismissal_location: e.target.value }))} placeholder="e.g. North Side Parking Lot" />
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, height: '80px', resize: 'vertical' }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the club..." />
                </div>

                <div>
                  <label style={labelStyle}>Meeting Dates</label>
                  {form.meeting_dates.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', background: theme.colors.background, borderRadius: '6px', padding: '6px 10px' }}>
                      <span style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, flex: 1 }}>
                        {formatDate(d.date)} · {formatTime(d.start_time)} – {formatTime(d.end_time)}
                      </span>
                      <button onClick={() => handleRemoveDate(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}>
                        <X size={14} color={theme.colors.danger} />
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <input
                      type="date"
                      style={inputStyle}
                      value={newDate.date}
                      onChange={e => setNewDate(p => ({ ...p, date: e.target.value }))}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Start Time</label>
                        <input
                          type="time"
                          style={inputStyle}
                          value={newDate.start_time}
                          onChange={e => setNewDate(p => ({ ...p, start_time: e.target.value }))}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>End Time</label>
                        <input
                          type="time"
                          style={inputStyle}
                          value={newDate.end_time}
                          onChange={e => setNewDate(p => ({ ...p, end_time: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleAddDate}
                      style={{ background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '8px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>
                      + Add Date
                    </button>
                  </div>
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
                  <Check size={14} /> {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Club'}
                </button>

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

export default ClubSetup