import { useState, useEffect } from 'react'
import Sidebar from '../../components/Sidebar'
import { Users, School, MapPin, Calendar, Clock, ListChecks, Plus, Trash2, Edit2, Check, X, AlertTriangle, UserPlus } from 'lucide-react'
import theme from '../../theme'
import api from '../../api/axios'

const GRADE_LABELS = { 0: 'K', 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }
const GRADES = [0, 1, 2, 3, 4, 5]

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function MyChildren() {
  const [families, setFamilies] = useState([])
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [locked, setLocked] = useState(false)

  // editing state
  const [editingChoices, setEditingChoices] = useState(null)   // student id
  const [choiceDraft, setChoiceDraft] = useState({ choice1: '', choice2: '', choice3: '' })
  const [editingTeacher, setEditingTeacher] = useState(null)   // student id
  const [teacherDraft, setTeacherDraft] = useState('')
  const [addingChildTo, setAddingChildTo] = useState(null)     // family id
  const [childDraft, setChildDraft] = useState({ first_name: '', last_name: '', grade: '', teacher: '' })
  const [addingPickupTo, setAddingPickupTo] = useState(null)   // family id
  const [pickupDraft, setPickupDraft] = useState({ name: '', phone: '', relationship_to_student: '' })

  const load = () => {
    Promise.all([api.get('/families/mine'), api.get('/clubs/public'), api.get('/dashboard/lock-status/public')])
      .then(([f, c, l]) => { setFamilies(f.data); setClubs(c.data); setLocked(l.data.registration_locked) })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const flash = (text, type = 'success') => {
    setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 3500)
  }

  // clubs a student is grade-eligible for, excluding other picks
  const eligible = (grade, picks, slot) => {
    const g = grade === '' ? null : Number(grade)
    const others = ['choice1', 'choice2', 'choice3'].filter(s => s !== slot).map(s => picks[s]).filter(Boolean)
    return clubs.filter(c => {
      if (g !== null && (g < c.grade_min || g > c.grade_max)) return false
      if (others.includes(c.name)) return false
      return true
    })
  }

  // ---- choices ----
  const startChoices = (s) => {
    setEditingChoices(s.id)
    setChoiceDraft({ choice1: s.choice1 || '', choice2: s.choice2 || '', choice3: s.choice3 || '' })
  }
  const saveChoices = async (s) => {
    try {
      await api.put(`/families/students/${s.id}/choices`, choiceDraft)
      setEditingChoices(null); flash('Choices updated.'); load()
    } catch (e) { flash(e.response?.data?.detail || 'Failed to update choices', 'error') }
  }

  // ---- teacher ----
  const startTeacher = (s) => { setEditingTeacher(s.id); setTeacherDraft(s.teacher) }
  const saveTeacher = async (s) => {
    if (!teacherDraft.trim()) { flash('Teacher cannot be empty', 'error'); return }
    try {
      await api.put(`/families/students/${s.id}/teacher`, { teacher: teacherDraft.trim() })
      setEditingTeacher(null); flash('Teacher updated.'); load()
    } catch (e) { flash(e.response?.data?.detail || 'Failed to update teacher', 'error') }
  }

  // ---- add child ----
  const saveChild = async (familyId) => {
    const d = childDraft
    if (!d.first_name.trim() || !d.last_name.trim() || d.grade === '' || !d.teacher.trim()) {
      flash('Fill in name, grade, and teacher', 'error'); return
    }
    try {
      await api.post('/families/students', {
        family_id: familyId,
        first_name: d.first_name.trim(),
        last_name: d.last_name.trim(),
        grade: Number(d.grade),
        teacher: d.teacher.trim(),
      })
      setAddingChildTo(null); setChildDraft({ first_name: '', last_name: '', grade: '', teacher: '' })
      flash('Child added.'); load()
    } catch (e) { flash(e.response?.data?.detail || 'Failed to add child', 'error') }
  }

  // ---- pickups ----
  const savePickup = async (familyId) => {
    if (!pickupDraft.name.trim()) { flash('Pickup name is required', 'error'); return }
    try {
      await api.post('/families/pickups', {
        family_id: familyId,
        name: pickupDraft.name.trim(),
        phone: pickupDraft.phone.trim() || null,
        relationship_to_student: pickupDraft.relationship_to_student.trim() || null,
      })
      setAddingPickupTo(null); setPickupDraft({ name: '', phone: '', relationship_to_student: '' })
      flash('Pickup added.'); load()
    } catch (e) { flash(e.response?.data?.detail || 'Failed to add pickup', 'error') }
  }
  const removePickup = async (id) => {
    try { await api.delete(`/families/pickups/${id}`); flash('Pickup removed.'); load() }
    catch (e) { flash(e.response?.data?.detail || 'Failed to remove pickup', 'error') }
  }

  // sibling dismissal conflict: assigned kids with differing dismissal locations
  const dismissalConflict = (students) => {
    const assigned = students.filter(s => s.assignment).map(s => ({
      name: `${s.first_name}`, grade: s.grade, loc: s.assignment.dismissal_location,
    }))
    const locs = new Set(assigned.map(a => a.loc))
    if (assigned.length >= 2 && locs.size >= 2) {
      const youngest = assigned.reduce((a, b) => (b.grade < a.grade ? b : a))
      return { assigned, youngest }
    }
    return null
  }

  const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '12px', fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', marginTop: '4px' }
  const lbl = { fontSize: '11px', fontWeight: '600', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>

        <div style={{ background: 'white', padding: '16px 28px', borderBottom: `1px solid ${theme.colors.border}` }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>My Children</div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>View and manage your children, choices, and pickups</div>
        </div>

        {msg && (
          <div style={{ margin: '16px 28px 0', background: msgType === 'error' ? theme.colors.dangerLight : theme.colors.primaryLight, border: `1px solid ${msgType === 'error' ? theme.colors.danger : theme.colors.border}`, borderRadius: '9px', padding: '12px 16px', color: msgType === 'error' ? theme.colors.danger : theme.colors.primary, fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600' }}>{msg}</div>
        )}

        {locked && (
          <div style={{ margin: '16px 28px 0', background: theme.colors.background, border: `1px solid ${theme.colors.border}`, borderRadius: '9px', padding: '10px 16px', color: theme.colors.textSecondary, fontSize: '12px', fontFamily: theme.fonts.primary, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={14} color={theme.colors.textMuted} /> The window for registration edits has passed. Contact your child's teacher if you need to make a change.
          </div>
        )}

        <div style={{ flex: 1, padding: '24px 28px' }}>
          {loading ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>Loading…</div>
          ) : families.length === 0 ? (
            <div style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontSize: '13px' }}>No family information found.</div>
          ) : families.map(family => {
            const isCreator = family.role === 'creator'
            const conflict = dismissalConflict(family.students)
            return (
              <div key={family.family_id} style={{ marginBottom: '32px' }}>

                {/* sibling dismissal conflict warning */}
                {conflict && (
                  <div style={{ background: theme.colors.warningLight, border: `1px solid ${theme.colors.warning}`, borderRadius: theme.borderRadius.lg, padding: '14px 18px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={16} color={theme.colors.warning} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                      Your children are dismissed from different locations. Send your older children to <strong>{conflict.youngest.name}</strong>'s location (<strong>{conflict.assigned.find(a => a.grade === conflict.youngest.grade).loc}</strong>) for one pickup spot.
                    </div>
                  </div>
                )}

                {/* children */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {family.students.map(s => (
                    <div key={s.id} style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: theme.colors.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>
                          {s.first_name[0]}{s.last_name[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', fontFamily: theme.fonts.primary }}>{s.first_name} {s.last_name}</div>
                          <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Grade {GRADE_LABELS[s.grade]} ·
                            {editingTeacher === s.id ? (
                              <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                <input value={teacherDraft} onChange={e => setTeacherDraft(e.target.value)} style={{ ...inp, marginTop: 0, width: '140px', padding: '4px 8px' }} />
                                <button onClick={() => saveTeacher(s)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Check size={14} color={theme.colors.primary} /></button>
                                <button onClick={() => setEditingTeacher(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} color={theme.colors.textMuted} /></button>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                {s.teacher}
                                {isCreator && <button onClick={() => startTeacher(s)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Edit2 size={11} color={theme.colors.textMuted} /></button>}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* status */}
                      <div style={{ marginTop: '14px' }}>
                        {s.assignment ? (
                          <div style={{ background: theme.colors.primaryLight, borderRadius: '10px', padding: '14px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <School size={15} /> {s.assignment.club_name}
                            </div>
                            <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12} /> {s.assignment.room_number} · Pickup: {s.assignment.dismissal_location}</span>
                              <span>Instructor: {s.assignment.instructor}</span>
                            </div>
                            {s.assignment.meeting_dates && s.assignment.meeting_dates.length > 0 && (
                              <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={11} /> {s.assignment.meeting_dates.map(m => formatDate(m.date)).join(' · ')}
                              </div>
                            )}
                          </div>
                        ) : s.waitlists && s.waitlists.length > 0 ? (
                          <div style={{ background: theme.colors.warningLight, borderRadius: '10px', padding: '14px' }}>
                            {s.waitlists.map((w, i) => (
                              <div key={i} style={{ fontSize: '13px', color: theme.colors.warning, fontFamily: theme.fonts.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} /> Waitlisted for {w.club_name} — position {w.position}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ background: theme.colors.background, borderRadius: '10px', padding: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: editingChoices === s.id ? '10px' : '6px' }}>
                              <ListChecks size={13} /> Not yet assigned — club choices
                            </div>
                            {editingChoices === s.id ? (
                              <div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  {['choice1', 'choice2', 'choice3'].map((slot, idx) => (
                                    <select key={slot} value={choiceDraft[slot]} onChange={e => setChoiceDraft({ ...choiceDraft, [slot]: e.target.value })} style={{ ...inp, marginTop: 0 }}>
                                      <option value="">{`Choice ${idx + 1}`}</option>
                                      {eligible(s.grade, choiceDraft, slot).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                  <button onClick={() => saveChoices(s)} style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Save</button>
                                  <button onClick={() => setEditingChoices(null)} style={{ background: 'white', color: theme.colors.textMuted, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontSize: '12px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                                  {[s.choice1, s.choice2, s.choice3].filter(Boolean).join(' · ') || <span style={{ fontStyle: 'italic', color: theme.colors.textMuted }}>None selected</span>}
                                </div>
                                {isCreator && !locked && <button onClick={() => startChoices(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: theme.colors.primary, fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary }}><Edit2 size={12} /> Edit</button>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* add child */}
                {isCreator && (
                  addingChildTo === family.family_id ? (
                    <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '18px', marginTop: '14px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>Add a child</div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}><label style={lbl}>First name</label><input style={inp} value={childDraft.first_name} onChange={e => setChildDraft({ ...childDraft, first_name: e.target.value })} /></div>
                        <div style={{ flex: 1 }}><label style={lbl}>Last name</label><input style={inp} value={childDraft.last_name} onChange={e => setChildDraft({ ...childDraft, last_name: e.target.value })} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <div style={{ flex: 1 }}><label style={lbl}>Grade</label>
                          <select style={inp} value={childDraft.grade} onChange={e => setChildDraft({ ...childDraft, grade: e.target.value })}>
                            <option value="">Select…</option>
                            {GRADES.map(g => <option key={g} value={g}>{GRADE_LABELS[g]}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}><label style={lbl}>Teacher</label><input style={inp} value={childDraft.teacher} onChange={e => setChildDraft({ ...childDraft, teacher: e.target.value })} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => saveChild(family.family_id)} style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Add child</button>
                        <button onClick={() => setAddingChildTo(null)} style={{ background: 'white', color: theme.colors.textMuted, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : !locked ? (
                    <button onClick={() => setAddingChildTo(family.family_id)} style={{ marginTop: '12px', background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserPlus size={15} /> Add a child
                    </button>
                  ) : null
                )}

                {/* authorized pickups */}
                <div style={{ marginTop: '24px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>Authorized pickups</div>
                  <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, border: `1px solid ${theme.colors.border}`, padding: '16px' }}>
                    {(!family.pickups || family.pickups.length === 0) ? (
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>No authorized pickups added.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {family.pickups.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.colors.background, borderRadius: '8px', padding: '10px 12px' }}>
                            <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>
                              <strong>{p.name}</strong>{p.relationship_to_student ? ` · ${p.relationship_to_student}` : ''}{p.phone ? ` · ${p.phone}` : ''}
                            </div>
                            {isCreator && <button onClick={() => removePickup(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} color={theme.colors.danger} /></button>}
                          </div>
                        ))}
                      </div>
                    )}

                    {isCreator && (
                      addingPickupTo === family.family_id ? (
                        <div style={{ marginTop: '12px', borderTop: `1px solid ${theme.colors.border}`, paddingTop: '12px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1.2 }}><label style={lbl}>Name</label><input style={inp} value={pickupDraft.name} onChange={e => setPickupDraft({ ...pickupDraft, name: e.target.value })} /></div>
                            <div style={{ flex: 1 }}><label style={lbl}>Phone</label><input style={inp} value={pickupDraft.phone} onChange={e => setPickupDraft({ ...pickupDraft, phone: e.target.value })} /></div>
                          </div>
                          <div style={{ marginTop: '10px' }}><label style={lbl}>Relationship</label><input style={inp} value={pickupDraft.relationship_to_student} onChange={e => setPickupDraft({ ...pickupDraft, relationship_to_student: e.target.value })} placeholder="e.g. Grandmother, Uncle" /></div>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button onClick={() => savePickup(family.family_id)} style={{ background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Add pickup</button>
                            <button onClick={() => setAddingPickupTo(null)} style={{ background: 'white', color: theme.colors.textMuted, border: `1px solid ${theme.colors.border}`, borderRadius: '7px', padding: '8px 16px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setAddingPickupTo(family.family_id)} style={{ marginTop: '12px', background: 'none', color: theme.colors.primary, border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Plus size={14} /> Add pickup person
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MyChildren