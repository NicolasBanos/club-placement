import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'coordinator') return <Navigate to="/coordinator" replace />
    if (role === 'teacher') return <Navigate to="/teacher" replace />
    if (role === 'parent') return <Navigate to="/parent" replace />
  }

  return children
}
export default ProtectedRoute
