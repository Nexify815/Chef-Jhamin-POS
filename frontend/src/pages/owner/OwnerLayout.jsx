import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import BottomNav from '../../components/BottomNav';
import HamburgerButton from '../../components/HamburgerButton';
import ErrorBoundary from '../../components/ErrorBoundary';
import OfflineBanner from '../../components/OfflineBanner';
import useNetworkStatus from '../../hooks/useNetworkStatus';
import Dashboard from './Dashboard';
import Sales from './Sales';
import Expenses from './Expenses';
import StaffLog from './StaffLog';
import Inventory from './Inventory';
import MenuManager from './MenuManager';
import StaffManager from './StaffManager';
import WeeklyProfit from './WeeklyProfit';
import Settings from './Settings';
import LowStock from './LowStock';
import InventoryLog from './InventoryLog';
import Reports from './Reports';
import PurchaseOrders from './PurchaseOrders';
import Suppliers from './Suppliers';
import Customers from './Customers';
import AuditLog from './AuditLog';
import ImportExport from './ImportExport';
import HelpPage from './HelpPage';

const routeToSidebar = {
  dashboard: 'dashboard',
  sales: 'sales',
  expenses: 'expenses',
  'staff-log': 'staff-log',
  inventory: 'inventory',
  'low-stock': 'low-stock',
  'menu-manager': 'menu-manager',
  'staff-manager': 'staff-manager',
  'weekly-profit': 'weekly-profit',
  settings: 'settings',
  'inventory-log': 'inventory-log',
  reports: 'reports',
  'purchase-orders': 'purchase-orders',
  suppliers: 'suppliers',
  customers: 'customers',
  'audit-log': 'audit-log',
  'import-export': 'import-export',
  help: 'help',
};

export default function OwnerLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOnline, pendingSync } = useNetworkStatus();

  const pathSegment = location.pathname.split('/owner/')[1] || 'dashboard';
  const activePage = routeToSidebar[pathSegment] || 'dashboard';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <OfflineBanner isOnline={isOnline} pendingSync={pendingSync} />
      <HamburgerButton onClick={() => setSidebarOpen(!sidebarOpen)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        role="owner"
        activePage={activePage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
        onNavigate={(page) => {
          navigate(`/owner/${page}`);
          setSidebarOpen(false);
        }}
        onLogout={() => {
          logout();
          navigate('/');
        }}
      />

      <main key={location.pathname} className="ml-0 md:ml-[280px] p-4 md:p-6 pt-20 md:pt-6 pb-24 md:pb-6 anim-page-enter">
        <ErrorBoundary key={location.pathname}>
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="sales" element={<Sales />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="staff-log" element={<StaffLog />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="low-stock" element={<LowStock />} />
            <Route path="menu-manager" element={<MenuManager />} />
            <Route path="staff-manager" element={<StaffManager />} />
            <Route path="weekly-profit" element={<WeeklyProfit />} />
            <Route path="settings" element={<Settings />} />
            <Route path="inventory-log" element={<InventoryLog />} />
            <Route path="reports" element={<Reports />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="customers" element={<Customers />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="import-export" element={<ImportExport />} />
            <Route path="help" element={<HelpPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <BottomNav role="owner" activePage={activePage} onNavigate={(page) => { navigate(`/owner/${page}`); }} />
    </div>
  );
}
