import Sidebar from '../../components/Sidebar'

function ParentDashboard() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '32px', backgroundColor: '#f5f5f5' }}>
        <h1 style={{ color: '#1B5E20', fontFamily: 'Poppins, sans-serif' }}>
          Parent Dashboard
        </h1>
        <p style={{ color: '#666', fontFamily: 'Poppins, sans-serif' }}>
          Welcome back!
        </p>
      </div>
    </div>
  )
}

export default ParentDashboard