import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'

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
      // FastAPI login expects form data not JSON
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })

      const { access_token, role, first_name } = response.data

      // Store token and user info
      localStorage.setItem('token', access_token)
      localStorage.setItem('role', role)
      localStorage.setItem('first_name', first_name)

      // Redirect based on role
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
      <div style={styles.card}>

        {/* Logo and branding */}
        <div style={styles.header}>
          <div style={styles.owlIcon}>🦉</div>
          <h1 style={styles.appName}>ClubsForKids</h1>
          <p style={styles.tagline}>After school, made easy.</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} style={styles.form}>

          {/* Email field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} color="#666" style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                style={styles.input}
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} color="#666" style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                style={styles.input}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword
                  ? <EyeOff size={18} color="#666" />
                  : <Eye size={18} color="#666" />
                }
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && <p style={styles.error}>{error}</p>}

          {/* Submit button */}
          <button
            type="submit"
            style={loading ? styles.buttonLoading : styles.button}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>

        {/* Footer */}
        <p style={styles.footer}>
          Plantation Park Elementary School
        </p>

      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Poppins, sans-serif',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  owlIcon: {
    fontSize: '64px',
    marginBottom: '8px',
  },
  appName: {
    color: '#1B5E20',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 4px 0',
  },
  tagline: {
    color: '#666',
    fontSize: '14px',
    margin: '0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#333',
    fontSize: '14px',
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
  },
  input: {
    width: '100%',
    padding: '12px 12px 12px 40px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'Poppins, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
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
    color: '#d32f2f',
    fontSize: '13px',
    margin: '0',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1B5E20',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    cursor: 'pointer',
    marginTop: '8px',
  },
  buttonLoading: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    fontFamily: 'Poppins, sans-serif',
    cursor: 'not-allowed',
    marginTop: '8px',
  },
  footer: {
    textAlign: 'center',
    color: '#999',
    fontSize: '12px',
    marginTop: '24px',
    marginBottom: '0',
  },
}

export default Login