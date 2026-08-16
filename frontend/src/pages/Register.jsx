import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Users, Plus, Trash2, Check, Copy, X } from 'lucide-react'
import theme from '../theme'
import api from '../api/axios'
import ppeLogo from '../assets/ppe-logo.png'

const GRADES = [
  { value: 0, label: 'K' }, { value: 1, label: '1' }, { value: 2, label: '2' },
  { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' },
]
const DISMISSAL = ['car', 'JCC', 'walker']

function emptyStudent() {
  return { first_name: '', last_name: '', grade: '', teacher: '', choice1: '', choice2: '', choice3: '' }
}

function Register() {
  const navigate = useNavigate()
  const [path, setPath] = useState(null)   // null | 'create' | 'join'
  const [clubs, setClubs] = useState([])
  const [homeroomTeachers, setHomeroomTeachers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joinCodeModal, setJoinCodeModal] = useState(null)
  const [copied, setCopied] = useState(false)

  // Account fields (shared)
  const [account, setAccount] = useState({ first_name: '', last_name: '', email: '', password: '', phone: '' })
  // Create-path fields
  const [dismissal, setDismissal] = useState('car')
  const [phone2, setPhone2] = useState('')
  const [phone2Owner, setPhone2Owner] = useState('')
  const [students, setStudents] = useState([emptyStudent()])
  const [pickups, setPickups] = useState([])
  // Join-path field
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    api.get('/clubs/public').then(res => setClubs(res.data)).catch(() => {})
    api.get('/homeroom-teachers/public').then(res => setHomeroomTeachers(res.data)).catch(() => {})
  }, [])

  const setAccountField = (k, v) => setAccount(prev => ({ ...prev, [k]: v }))

  const setStudentField = (i, k, v) => {
    setStudents(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [k]: v }
      // If grade changed, clear choices and teacher that are no longer valid
      if (k === 'grade') {
        const g = v === '' ? null : Number(v)
        for (const c of ['choice1', 'choice2', 'choice3']) {
          if (next[i][c]) {
            const club = clubs.find(cl => String(cl.id) === String(next[i][c]))
            if (club && g !== null && (g < club.grade_min || g > club.grade_max)) {
              next[i][c] = ''
            }
          }
        }
        next[i].teacher = ''
      }
      return next
    })
  }

  const addStudent = () => setStudents(prev => [...prev, emptyStudent()])
  const removeStudent = (i) => setStudents(prev => prev.filter((_, idx) => idx !== i))

  const addPickup = () => setPickups(prev => [...prev, { name: '', phone: '', relationship_to_student: '' }])
  const removePickup = (i) => setPickups(prev => prev.filter((_, idx) => idx !== i))
  const setPickupField = (i, k, v) => setPickups(prev => {
    const next = [...prev]; next[i] = { ...next[i], [k]: v }; return next
  })

  // Clubs a given student is grade-eligible for, excluding ones already picked in other choice slots
  const eligibleClubs = (student, currentSlot) => {
    const g = student.grade === '' ? null : Number(student.grade)
    const otherPicks = ['choice1', 'choice2', 'choice3']
      .filter(s => s !== currentSlot)
      .map(s => student[s])
      .filter(Boolean)
    return clubs.filter(c => {
      if (g !== null && (g < c.grade_min || g > c.grade_max)) return false
      if (otherPicks.includes(String(c.id))) return false
      return true
    })
  }

  const teachersForGrade = (grade) => {
    if (grade === '') return []
    return homeroomTeachers.filter(t => t.grade === Number(grade))
  }

  const validateCreate = () => {
    if (!account.first_name.trim() || !account.last_name.trim()) return 'Enter your first and last name.'
    if (!account.email.includes('@') || !account.email.includes('.')) return 'Enter a valid email.'
    if (account.password.length < 6) return 'Password must be at least 6 characters.'
    if (students.length === 0) return 'Add at least one child.'
    for (const [i, s] of students.entries()) {
      if (!s.first_name.trim() || !s.last_name.trim()) return `Child ${i + 1}: enter first and last name.`
      if (s.grade === '') return `Child ${i + 1}: select a grade.`
      if (!s.teacher.trim()) return `Child ${i + 1}: enter a teacher.`
    }
    return ''
  }

  const submitCreate = async () => {
    const v = validateCreate()
    if (v) { setError(v); return }
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...account,
        phone2: phone2 || null,
        phone2_owner: phone2Owner || null,
        dismissal_method: dismissal,
        pickups: pickups
          .filter(p => p.name.trim())
          .map(p => ({
            name: p.name.trim(),
            phone: p.phone.trim() || null,
            relationship_to_student: p.relationship_to_student.trim() || null,
          })),
        students: students.map(s => ({
          first_name: s.first_name.trim(),
          last_name: s.last_name.trim(),
          grade: Number(s.grade),
          teacher: s.teacher.trim(),
          choice1: s.choice1 ? clubName(s.choice1) : null,
          choice2: s.choice2 ? clubName(s.choice2) : null,
          choice3: s.choice3 ? clubName(s.choice3) : null,
        })),
      }
      const res = await api.post('/families/register-create', payload)
      storeLoginAndPrepare(res.data)
      setJoinCodeModal(res.data.join_code)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  const submitJoin = async () => {
    if (!account.first_name.trim() || !account.last_name.trim()) { setError('Enter your first and last name.'); return }
    if (!account.email.includes('@') || !account.email.includes('.')) { setError('Enter a valid email.'); return }
    if (account.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!joinCode.trim()) { setError('Enter your family code.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/families/register-join', {
        first_name: account.first_name.trim(),
        last_name: account.last_name.trim(),
        email: account.email.trim(),
        password: account.password,
        join_code: joinCode.trim(),
      })
      storeLoginAndPrepare(res.data)
      navigate('/parent')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not join family. Check your code.')
    } finally {
      setLoading(false)
    }
  }

  // Store the chosen club's NAME (backend expects club_name string in choices)
  const clubName = (id) => {
    const c = clubs.find(cl => String(cl.id) === String(id))
    return c ? c.name : null
  }

  const storeLoginAndPrepare = (data) => {
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('role', data.role)
    localStorage.setItem('first_name', data.first_name)
  }

  const copyCode = () => {
    navigator.clipboard.writeText(joinCodeModal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const finishCreate = () => {
    setJoinCodeModal(null)
    navigate('/parent')
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '13px',
    fontFamily: theme.fonts.primary, border: `1px solid ${theme.colors.border}`,
    borderRadius: '8px', outline: 'none', marginTop: '4px',
  }
  const labelStyle = { fontSize: '12px', fontWeight: '600', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: '48px', height: '48px', background: 'white', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={ppeLogo} alt="PPE" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
        </div>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>ClubsForKids</div>
          <div style={{ fontSize: '11px', color: theme.colors.secondary, fontFamily: theme.fonts.primary }}>After school, made easy.</div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '560px' }}>

        {error && (
          <div style={{ background: theme.colors.dangerLight, border: `1px solid ${theme.colors.danger}`, color: theme.colors.danger, borderRadius: '9px', padding: '12px 16px', fontSize: '13px', fontFamily: theme.fonts.primary, fontWeight: '600', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Path picker */}
        {!path && (
          <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '28px', border: `1px solid ${theme.colors.border}` }}>
            <div style={{ fontSize: '17px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '4px' }}>Create your account</div>
            <div style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '20px' }}>Are you setting up a new family, or joining one?</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setPath('create'); setError('') }}
                style={{ flex: 1, background: theme.colors.primaryLight, border: `1.5px solid ${theme.colors.primary}`, borderRadius: '10px', padding: '20px', cursor: 'pointer', textAlign: 'center' }}>
                <UserPlus size={26} color={theme.colors.primary} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginTop: '8px' }}>Set up my family</div>
                <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Add your children and choices</div>
              </button>
              <button onClick={() => { setPath('join'); setError('') }}
                style={{ flex: 1, background: 'white', border: `1.5px solid ${theme.colors.border}`, borderRadius: '10px', padding: '20px', cursor: 'pointer', textAlign: 'center' }}>
                <Users size={26} color={theme.colors.primary} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginTop: '8px' }}>Join a family</div>
                <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>Use a family code from another guardian</div>
              </button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>Already have an account? </span>
              <span onClick={() => navigate('/login')} style={{ fontSize: '13px', color: theme.colors.primary, fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>Sign in</span>
            </div>
          </div>
        )}

        {/* Account fields (shared, shown for both paths) */}
        {path && (
          <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', border: `1px solid ${theme.colors.border}`, marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '14px' }}>Your details</div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First name</label>
                <input style={inputStyle} value={account.first_name} onChange={e => setAccountField('first_name', e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last name</label>
                <input style={inputStyle} value={account.last_name} onChange={e => setAccountField('last_name', e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={account.email} onChange={e => setAccountField('email', e.target.value)} />
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type="password" value={account.password} onChange={e => setAccountField('password', e.target.value)} />
            </div>
            {path === 'create' && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Cell phone</label>
                  <input style={inputStyle} value={account.phone} onChange={e => setAccountField('phone', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Dismissal method</label>
                  <select style={inputStyle} value={dismissal} onChange={e => setDismissal(e.target.value)}>
                    {DISMISSAL.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            )}
            {path === 'create' && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Secondary phone (optional)</label>
                  <input style={inputStyle} value={phone2} onChange={e => setPhone2(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Whose phone is it?</label>
                  <input style={inputStyle} value={phone2Owner} onChange={e => setPhone2Owner(e.target.value)} placeholder="e.g. Spouse, Grandparent" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create path: students */}
        {path === 'create' && (
          <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', border: `1px solid ${theme.colors.border}`, marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Your children</div>
              <button onClick={addStudent} style={{ background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Plus size={13} /> Add child
              </button>
            </div>

            {students.map((s, i) => (
              <div key={i} style={{ background: theme.colors.background, borderRadius: '10px', padding: '16px', marginBottom: '12px', position: 'relative' }}>
                {students.length > 1 && (
                  <button onClick={() => removeStudent(i)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={15} color={theme.colors.danger} />
                  </button>
                )}
                <div style={{ fontSize: '12px', fontWeight: '700', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>CHILD {i + 1}</div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>First name</label>
                    <input style={inputStyle} value={s.first_name} onChange={e => setStudentField(i, 'first_name', e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Last name</label>
                    <input style={inputStyle} value={s.last_name} onChange={e => setStudentField(i, 'last_name', e.target.value)} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Grade</label>
                    <select style={inputStyle} value={s.grade} onChange={e => setStudentField(i, 'grade', e.target.value)}>
                      <option value="">Select…</option>
                      {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Teacher</label>
                    <select style={inputStyle} value={s.teacher} onChange={e => setStudentField(i, 'teacher', e.target.value)} disabled={s.grade === ''}>
                      <option value="">{s.grade === '' ? 'Select grade first' : 'Select…'}</option>
                      {teachersForGrade(s.grade).map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <label style={labelStyle}>Club choices (optional, in order of preference)</label>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {['choice1', 'choice2', 'choice3'].map((slot, idx) => (
                      <select key={slot} style={{ ...inputStyle, marginTop: 0 }} value={s[slot]}
                        onChange={e => setStudentField(i, slot, e.target.value)}
                        disabled={s.grade === ''}>
                        <option value="">{`Choice ${idx + 1}`}</option>
                        {eligibleClubs(s, slot).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                  {s.grade === '' && (
                    <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '4px' }}>Select a grade to see eligible clubs</div>
                  )}
                </div>
              </div>
            ))}

            {/* Authorized pickups (optional) */}
            <div style={{ borderTop: `1px solid ${theme.colors.border}`, paddingTop: '18px', marginTop: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Authorized pickups (optional)</div>
                <button onClick={addPickup} style={{ background: theme.colors.primaryLight, color: theme.colors.primary, border: 'none', borderRadius: '7px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', fontFamily: theme.fonts.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Plus size={13} /> Add person
                </button>
              </div>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '12px' }}>
                Other people allowed to pick up your children.
              </div>

              {pickups.length === 0 ? (
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, fontStyle: 'italic' }}>
                  None added.
                </div>
              ) : pickups.map((p, i) => (
                <div key={i} style={{ background: theme.colors.background, borderRadius: '10px', padding: '14px', marginBottom: '10px', position: 'relative' }}>
                  <button onClick={() => removePickup(i)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={15} color={theme.colors.danger} />
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1.2 }}>
                      <label style={labelStyle}>Name</label>
                      <input style={inputStyle} value={p.name} onChange={e => setPickupField(i, 'name', e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Phone</label>
                      <input style={inputStyle} value={p.phone} onChange={e => setPickupField(i, 'phone', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <label style={labelStyle}>Relationship to child</label>
                    <input style={inputStyle} value={p.relationship_to_student} onChange={e => setPickupField(i, 'relationship_to_student', e.target.value)} placeholder="e.g. Grandmother, Uncle" />
                  </div>
                </div>
              ))}
            </div>
            
            <button onClick={submitCreate} disabled={loading}
              style={{ width: '100%', background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '9px', padding: '13px', fontSize: '14px', fontWeight: '700', fontFamily: theme.fonts.primary, cursor: 'pointer', marginTop: '4px' }}>
              {loading ? 'Creating account…' : 'Create account & family'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <span onClick={() => { setPath(null); setError('') }} style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, cursor: 'pointer' }}>← Back</span>
            </div>
          </div>
        )}

        {/* Join path */}
        {path === 'join' && (
          <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', border: `1px solid ${theme.colors.border}`, marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary, marginBottom: '4px' }}>Family code</div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '10px' }}>Ask the guardian who set up your family for the code (looks like PPE-XXXX).</div>
            <input style={inputStyle} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="PPE-XXXX" />

            <button onClick={submitJoin} disabled={loading}
              style={{ width: '100%', background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '9px', padding: '13px', fontSize: '14px', fontWeight: '700', fontFamily: theme.fonts.primary, cursor: 'pointer', marginTop: '16px' }}>
              {loading ? 'Joining…' : 'Create account & join family'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <span onClick={() => { setPath(null); setError('') }} style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, cursor: 'pointer' }}>← Back</span>
            </div>
          </div>
        )}
      </div>

      {/* Join code success modal */}
      {joinCodeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '32px', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', background: theme.colors.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={26} color={theme.colors.primary} />
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: theme.colors.primary, fontFamily: theme.fonts.primary }}>Family created!</div>
            <div style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, marginTop: '8px', lineHeight: '1.5' }}>
              Share this code with your child's other parent or guardian so they can join your family:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: theme.colors.background, borderRadius: '10px', padding: '16px', margin: '16px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: '800', color: theme.colors.primary, fontFamily: theme.fonts.primary, letterSpacing: '0.05em' }}>{joinCodeModal}</span>
              <button onClick={copyCode} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {copied ? <Check size={16} color={theme.colors.primary} /> : <Copy size={16} color={theme.colors.textMuted} />}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginBottom: '16px' }}>You can find this code again anytime on your dashboard.</div>
            <button onClick={finishCreate} style={{ width: '100%', background: theme.colors.primary, color: 'white', border: 'none', borderRadius: '9px', padding: '12px', fontSize: '14px', fontWeight: '700', fontFamily: theme.fonts.primary, cursor: 'pointer' }}>
              Continue to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Register