import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard'
import ClubSetup from './pages/coordinator/ClubSetup'
import CreateTeacher from './pages/coordinator/CreateTeacher'
import LotteryRunner from './pages/coordinator/LotteryRunner'
import AssignmentResults from './pages/coordinator/AssignmentResults'
import RosterManagement from './pages/coordinator/RosterManagement'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import ParentDashboard from './pages/parent/ParentDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import ExcuseApproval from './pages/coordinator/ExcuseApproval'
import AttendanceOverview from './pages/coordinator/AttendanceOverview'
import ClubSummaryReport from './pages/coordinator/ClubSummaryReport'
import SpreadsheetUpload from './pages/coordinator/SpreadsheetUpload'
import Register from './pages/Register'
import MyChildren from './pages/parent/MyChildren'
import ParentExcuses from './pages/parent/ParentExcuses'
import MyClub from './pages/teacher/MyClub'
import AttendanceSubmission from './pages/teacher/AttendanceSubmission'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<Register />} />

        {/* Coordinator routes */}
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/clubs"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <ClubSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/teachers"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <CreateTeacher />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/lottery"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <LotteryRunner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/assignments"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <AssignmentResults />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/roster"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <RosterManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/excuses"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <ExcuseApproval />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/attendance"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <AttendanceOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/reports"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <ClubSummaryReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coordinator/import"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <SpreadsheetUpload />
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

        <Route 
          path="/teacher/club" 
          element={
            <ProtectedRoute allowedRoles={['teacher', 'coordinator']}>
              <MyClub />
            </ProtectedRoute>
          }
        />

        <Route 
          path="/teacher/attendance" 
          element={
            <ProtectedRoute allowedRoles={['teacher', 'coordinator']}>
              <AttendanceSubmission />
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

        <Route 
          path="/parent/children" 
          element=
            {<ProtectedRoute allowedRoles={['parent']}>
              <MyChildren />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/parent/excuses" 
          element={
            <ProtectedRoute allowedRoles={['parent']}>
              <ParentExcuses />
            </ProtectedRoute>
          } 
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App