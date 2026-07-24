import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'
import theme from '../theme'
import schoolPhoto from '../assets/school.jpg'

function OwlLogo({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <circle cx="13" cy="10" r="7" fill="#1a5c1a"/>
      <circle cx="10" cy="9" r="3" fill="white"/>
      <circle cx="16" cy="9" r="3" fill="white"/>
      <circle cx="10.5" cy="9.5" r="1.5" fill="#1a5c1a"/>
      <circle cx="16.5" cy="9.5" r="1.5" fill="#1a5c1a"/>
      <circle cx="11" cy="9" r="0.6" fill="white"/>
      <circle cx="17" cy="9" r="0.6" fill="white"/>
      <polygon points="12,11 14,11 13,13" fill="#F9A825"/>
      <path d="M9 6 Q10 4 11 6" stroke="white" strokeWidth="1" fill="none"/>
      <path d="M15 6 Q16 4 17 6" stroke="white" strokeWidth="1" fill="none"/>
      <path d="M8 14 Q6 16 8 18 Q10 21 13 22 Q16 21 18 18 Q20 16 18 14 Q16 12 13 13 Q10 12 8 14Z" fill="#2e7d32"/>
    </svg>
  )
}

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      const { access_token, role, first_name } = response.data
      localStorage.setItem('token', access_token)
      localStorage.setItem('role', role)
      localStorage.setItem('first_name', first_name)

      if (role === 'coordinator') navigate('/coordinator')
      else if (role === 'teacher') navigate('/teacher')
      else if (role === 'parent') navigate('/parent')

    } catch (err) {
      setError('Incorrect email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>

      {/* Left panel — school photo with overlay */}
      <div style={styles.leftPanel}>
        <img src={schoolPhoto} alt="Plantation Park Elementary" style={styles.photo} />
        <div style={styles.overlay} />
        <div style={styles.leftContent}>
          <div style={styles.owlBadge}>
            <OwlLogo size={44} />
          </div>
          <div style={styles.appName}>ClubsForKids</div>
          <div style={styles.tagline}>After school, made easy.</div>
          <div style={styles.schoolCard}>
            <div style={styles.schoolLabel}>HOME OF THE OWLS</div>
            <div style={styles.schoolName}>Plantation Park Elementary</div>
            <div style={styles.schoolAddress}>875 SW 54th Ave · Plantation, FL</div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          <div style={styles.formTitle}>Welcome back</div>
          <div style={styles.formSubtitle}>Sign in to your account to continue</div>

          <form onSubmit={handleLogin} style={styles.form}>

            {/* Email */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={16} color="#aaa" style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.com"
                  style={styles.input}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={16} color="#aaa" style={styles.inputIcon} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={styles.input}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  {showPassword
                    ? <EyeOff size={16} color="#aaa" />
                    : <Eye size={16} color="#aaa" />
                  }
                </button>
              </div>
            </div>

            {/* Error */}
            {error && <p style={styles.error}>{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              style={loading ? styles.buttonLoading : styles.button}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

          </form>
        </div>
      </div>

    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: theme.fonts.primary,
  },
  leftPanel: {
    width: '50%',
    position: 'relative',
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(10,40,10,0.62)',
  },
  leftContent: {
    position: 'relative',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    textAlign: 'center',
  },
  owlBadge: {
    backgroundColor: theme.colors.secondary,
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  appName: {
    color: 'white',
    fontSize: '30px',
    fontWeight: '800',
    fontFamily: theme.fonts.primary,
    lineHeight: '1.1',
    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  tagline: {
    color: theme.colors.secondary,
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: theme.fonts.primary,
    marginTop: '6px',
  },
  schoolCard: {
    marginTop: '36px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    padding: '16px 24px',
    backdropFilter: 'blur(4px)',
  },
  schoolLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '9px',
    fontWeight: '700',
    letterSpacing: '0.1em',
    marginBottom: '5px',
    fontFamily: theme.fonts.primary,
  },
  schoolName: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    fontFamily: theme.fonts.primary,
  },
  schoolAddress: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '10px',
    fontFamily: theme.fonts.primary,
    marginTop: '3px',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: theme.colors.background,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
  },
  formWrapper: {
    width: '100%',
    maxWidth: '320px',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: theme.colors.primary,
    fontFamily: theme.fonts.primary,
    marginBottom: '4px',
  },
  formSubtitle: {
    fontSize: '13px',
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.primary,
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#444',
    fontFamily: theme.fonts.primary,
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    border: '1.5px solid #dce8dc',
    borderRadius: '9px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  inputIcon: {
    position: 'absolute',
    left: '13px',
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    fontFamily: theme.fonts.primary,
    backgroundColor: 'transparent',
    borderRadius: '9px',
    color: '#333',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
  },
  error: {
    color: theme.colors.danger,
    fontSize: '12px',
    margin: '0',
    textAlign: 'center',
    fontFamily: theme.fonts.primary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '9px',
    padding: '13px',
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: theme.fonts.primary,
    cursor: 'pointer',
    marginTop: '6px',
    boxShadow: '0 4px 12px rgba(26,92,26,0.3)',
  },
  buttonLoading: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '9px',
    padding: '13px',
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: theme.fonts.primary,
    cursor: 'not-allowed',
    marginTop: '6px',
  },
}

export default Login