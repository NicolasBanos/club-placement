import Sidebar from '../../components/Sidebar'
import { Trophy, Upload, BarChart2, UserPlus, Calendar, Users, List, FileCheck, MessageSquare } from 'lucide-react'
import theme from '../../theme'

function StatCard({ icon: Icon, label, value, color, lightColor, subtitle }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: theme.borderRadius.lg,
      padding: '24px',
      border: `1px solid ${lightColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{
          background: lightColor,
          width: '36px', height: '36px',
          borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: '13px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary }}>{label}</span>
      </div>
      <div style={{ fontSize: '40px', fontWeight: '800', color, lineHeight: '1', fontFamily: theme.fonts.primary }}>{value}</div>
      <div style={{ fontSize: '11px', color, opacity: 0.7, marginTop: '8px', fontFamily: theme.fonts.primary }}>{subtitle}</div>
    </div>
  )
}

function CoordinatorDashboard() {
  const firstName = localStorage.getItem('first_name')

  const clubs = [
    { name: 'Amazing Art Club', enrolled: 20, max: 20 },
    { name: 'Sports Club', enrolled: 20, max: 25 },
    { name: 'Recipe Club', enrolled: 17, max: 20 },
    { name: 'Mind Matters', enrolled: 20, max: 20 },
    { name: 'Piecemakers Quilting', enrolled: 15, max: 15 },
  ]

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
              Good morning, {firstName} 👋
            </div>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, fontFamily: theme.fonts.primary, marginTop: '2px' }}>
              Session 2 · Plantation Park Elementary · Monday, July 14
            </div>
          </div>
          <button style={{
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
            <Trophy size={14} /> Run Lottery
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <StatCard icon={Users} label="Enrolled" value="87" color={theme.colors.primary} lightColor={theme.colors.primaryLight} subtitle="5 clubs active" />
            <StatCard icon={List} label="Waitlisted" value="34" color={theme.colors.warning} lightColor={theme.colors.warningLight} subtitle="2 clubs full" />
            <StatCard icon={FileCheck} label="Excuses" value="3" color={theme.colors.danger} lightColor={theme.colors.dangerLight} subtitle="needs review" />
            <StatCard icon={MessageSquare} label="Messages" value="5" color={theme.colors.info} lightColor={theme.colors.infoLight} subtitle="unread" />
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>

            {/* Club capacity */}
            <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', border: `1px solid ${theme.colors.border}` }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: theme.colors.primary, marginBottom: '20px', fontFamily: theme.fonts.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={16} /> Club Capacity
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {clubs.map(club => {
                  const pct = (club.enrolled / club.max) * 100
                  const color = pct === 100 ? theme.colors.danger : pct >= 80 ? theme.colors.warning : theme.colors.primary
                  return (
                    <div key={club.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary }}>{club.name}</span>
                        <span style={{ fontSize: '13px', color, fontWeight: '600', fontFamily: theme.fonts.primary }}>
                          {pct === 100 ? 'Full' : `${club.enrolled}/${club.max}`}
                        </span>
                      </div>
                      <div style={{ background: '#f0f0f0', borderRadius: '6px', height: '8px' }}>
                        <div style={{ background: color, width: `${pct}%`, height: '8px', borderRadius: '6px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Next meeting */}
              <div style={{ background: theme.colors.primary, borderRadius: theme.borderRadius.lg, padding: '28px', display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', width: '52px', height: '52px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={22} color={theme.colors.secondary} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: theme.fonts.primary }}>Next meeting</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'white', fontFamily: theme.fonts.primary }}>Monday, July 28</div>
                  <div style={{ fontSize: '14px', color: theme.colors.secondary, fontFamily: theme.fonts.primary, marginTop: '2px' }}>2:10 PM – 3:10 PM</div>
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ background: 'white', borderRadius: theme.borderRadius.lg, padding: '24px', border: `1px solid ${theme.colors.border}`, display: 'flex', gap: '12px', flex: 1 }}>
                {[
                  { icon: Upload, label: 'Import Data' },
                  { icon: BarChart2, label: 'Reports' },
                  { icon: UserPlus, label: 'Add Teacher' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} style={{ flex: 1, background: theme.colors.background, borderRadius: '10px', padding: '20px 10px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Icon size={22} color={theme.colors.primary} />
                    <div style={{ fontSize: '11px', color: theme.colors.textSecondary, fontFamily: theme.fonts.primary, fontWeight: '600' }}>{label}</div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoordinatorDashboard