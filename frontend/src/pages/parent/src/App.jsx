import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import ParentDashboard from './pages/parent/ParentDashboard'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Coordinator routes */}
                <Route
                    path="/coordinator"
                    element={
                        <ProtectedRoute allowedRoles={['coordinator']}>
                            <CoordinatorDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Teacher routes */}
                <Route
                    path="/teacher"
                    element={
                        <ProtectedRoute allowedRoles={['teacher', 'coordinator']}>
                            <TeacherDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Parent routes */}
                <Route
                    path="/parent"
                    element={
                        <ProtectedRoute allowedRoles={['parent']}>
                            <ParentDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Catch all — redirect to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App