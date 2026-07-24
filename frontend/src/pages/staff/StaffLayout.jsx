import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import HamburgerButton from '../../components/HamburgerButton';
import ErrorBoundary from '../../components/ErrorBoundary';
import OfflineBanner from '../../components/OfflineBanner';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import StaffTour, { useStaffTour } from '../../components/StaffTour';
import StaffHome from './StaffHome';
import StaffSales from './StaffSales';
import StaffExpenses from './StaffExpenses';
import StaffInventory from './StaffInventory';
import StaffTimeClock from './StaffTimeClock';

export default function StaffLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { showTour, startTour, endTour } = useStaffTour();
  const { isOnline, pendingSync } = useNetworkStatus();

  const pathSegment = location.pathname.split('/staff/')[1] || 'home';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <OfflineBanner isOnline={isOnline} pendingSync={pendingSync} />
      <StaffTour show={showTour} onComplete={endTour} />
      <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar
        role="staff"
        activePage={pathSegment}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
        onNavigate={(page) => {
          navigate(`/staff/${page}`);
          setSidebarOpen(false);
        }}
        onReplayTour={startTour}
        onLogout={() => {
          logout();
          navigate('/');
        }}
      />
      <main key={location.pathname} className="ml-0 md:ml-[280px] p-4 md:p-6 pt-20 md:pt-6 pb-24 md:pb-6 anim-page-enter">
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route index element={<Navigate to="home" replace />} />
            <Route path="home" element={<StaffHome />} />
            <Route path="sales" element={<StaffSales />} />
            <Route path="expenses" element={<StaffExpenses />} />
            <Route path="inventory" element={<StaffInventory />} />
            <Route path="time-clock" element={<StaffTimeClock />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <BottomNav role="staff" activePage={pathSegment} onNavigate={(page) => { navigate(`/staff/${page}`); }} />
    </div>
  );
}
